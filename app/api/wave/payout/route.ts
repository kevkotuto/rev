import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"
import { z } from "zod"
import { v4 as uuidv4 } from "uuid"

const payoutSchema = z.object({
  receive_amount: z.number().positive("Le montant doit être positif"),
  currency: z.string().default("XOF"),
  mobile: z.string().min(1, "Le numéro de téléphone est requis"),
  name: z.string().optional(),
  national_id: z.string().optional(),
  payment_reason: z.string().max(40, "Le motif de paiement ne peut pas dépasser 40 caractères").optional(),
  client_reference: z.string().max(255, "La référence client ne peut pas dépasser 255 caractères").optional(),
  type: z.enum(["provider_payment", "client_refund", "general_payment"]).default("general_payment"),
  providerId: z.string().optional(),
  clientId: z.string().optional(),
  projectId: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Non autorisé" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = payoutSchema.parse(body)

    // Récupérer la clé API Wave de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        waveApiKey: true,
        name: true,
        companyName: true
      }
    })

    if (!user?.waveApiKey) {
      return NextResponse.json(
        { message: "Clé API Wave non configurée" },
        { status: 400 }
      )
    }

    // Générer une clé d'idempotence unique
    const idempotencyKey = uuidv4()

    // Préparer les données pour l'API Wave Payout
    const wavePayload = {
      currency: validatedData.currency,
      receive_amount: validatedData.receive_amount.toString(),
      mobile: validatedData.mobile,
      ...(validatedData.name && { name: validatedData.name }),
      ...(validatedData.national_id && { national_id: validatedData.national_id }),
      ...(validatedData.payment_reason && { payment_reason: validatedData.payment_reason }),
      ...(validatedData.client_reference && { client_reference: validatedData.client_reference })
    }

    console.log('Envoi payout Wave:', wavePayload)

    // Appeler l'API Wave Payout
    const waveResponse = await fetch('https://api.wave.com/v1/payout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user.waveApiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify(wavePayload)
    })

    const responseText = await waveResponse.text()
    console.log('Réponse Wave brute:', responseText)

    if (!waveResponse.ok) {
      let errorData
      try {
        errorData = JSON.parse(responseText)
      } catch {
        errorData = { message: responseText || 'Erreur inconnue' }
      }
      
      console.error('Erreur Wave API:', errorData)
      
      // Créer une notification d'échec
      await createNotification({
        userId: session.user.id,
        title: "Échec d'envoi de paiement",
        message: `Échec de l'envoi de ${validatedData.receive_amount} ${validatedData.currency} vers ${validatedData.mobile}`,
        type: "WAVE_PAYMENT_FAILED",
        metadata: {
          amount: validatedData.receive_amount,
          currency: validatedData.currency,
          recipient: validatedData.mobile,
          error: errorData
        }
      })
      
      return NextResponse.json(
        { message: "Erreur lors de l'envoi du paiement", error: errorData },
        { status: waveResponse.status }
      )
    }

    const waveData = JSON.parse(responseText)
    console.log('Données Wave reçues:', waveData)

    // Créer l'enregistrement local selon le type
    let localRecord = null

    if (validatedData.type === "provider_payment" && validatedData.providerId) {
      // Récupérer le prestataire pour la notification
      const provider = await prisma.provider.findUnique({
        where: { id: validatedData.providerId }
      })

      if (!provider) {
        return NextResponse.json(
          { message: "Prestataire non trouvé" },
          { status: 404 }
        )
      }

      // Créer un paiement prestataire
      localRecord = await prisma.providerPayment.create({
        data: {
          amount: validatedData.receive_amount,
          fees: parseFloat(waveData.fee || "0"),
          paymentMethod: "WAVE",
          status: waveData.status === "succeeded" ? "COMPLETED" : "PENDING",
          wavePayoutId: waveData.id,
          notes: validatedData.payment_reason,
          paidAt: waveData.status === "succeeded" ? new Date() : null,
          providerId: validatedData.providerId,
          userId: session.user.id
        }
      })

      // Notification pour paiement prestataire
      await createNotification({
        userId: session.user.id,
        title: waveData.status === "succeeded" ? "Paiement prestataire envoyé" : "Paiement prestataire en cours",
        message: `Paiement de ${validatedData.receive_amount} ${validatedData.currency} ${waveData.status === "succeeded" ? "envoyé à" : "en cours vers"} ${provider.name}`,
        type: waveData.status === "succeeded" ? "PROVIDER_PAYMENT_COMPLETED" : "INFO",
        relatedType: "provider",
        relatedId: validatedData.providerId,
        actionUrl: `/providers/${validatedData.providerId}`,
        metadata: {
          amount: validatedData.receive_amount,
          currency: validatedData.currency,
          providerName: provider.name,
          transactionId: waveData.id,
          status: waveData.status
        }
      })
    } else {
      // Créer une dépense générale
      localRecord = await prisma.expense.create({
        data: {
          description: validatedData.payment_reason || `Paiement Wave vers ${validatedData.mobile}`,
          amount: validatedData.receive_amount,
          category: validatedData.type === "client_refund" ? "Remboursement client" : "Paiement Wave",
          type: "GENERAL",
          userId: session.user.id,
          ...(validatedData.projectId && { projectId: validatedData.projectId })
        }
      })

      // Créer l'assignation Wave
      await prisma.waveTransactionAssignment.create({
        data: {
          transactionId: waveData.id,
          type: "expense",
          description: validatedData.payment_reason || `Paiement Wave vers ${validatedData.mobile}`,
          amount: validatedData.receive_amount,
          fee: parseFloat(waveData.fee || "0"),
          currency: validatedData.currency,
          timestamp: new Date(waveData.timestamp || new Date()),
          counterpartyName: validatedData.name,
          counterpartyMobile: validatedData.mobile,
          expenseId: localRecord.id,
          waveData: waveData,
          userId: session.user.id,
          ...(validatedData.projectId && { projectId: validatedData.projectId }),
          ...(validatedData.clientId && { clientId: validatedData.clientId }),
          ...(validatedData.providerId && { providerId: validatedData.providerId })
        }
      })

      // Notification générale
      const notificationType = waveData.status === "succeeded" ? "SUCCESS" : "INFO"
      const title = validatedData.type === "client_refund" 
        ? (waveData.status === "succeeded" ? "Remboursement client envoyé" : "Remboursement client en cours")
        : (waveData.status === "succeeded" ? "Paiement Wave envoyé" : "Paiement Wave en cours")
      
      await createNotification({
        userId: session.user.id,
        title,
        message: `${validatedData.receive_amount} ${validatedData.currency} ${waveData.status === "succeeded" ? "envoyé vers" : "en cours vers"} ${validatedData.mobile}`,
        type: notificationType,
        relatedType: "wave_transaction",
        relatedId: waveData.id,
        actionUrl: "/wave-transactions",
        metadata: {
          amount: validatedData.receive_amount,
          currency: validatedData.currency,
          recipient: validatedData.mobile,
          transactionId: waveData.id,
          status: waveData.status
        }
      })
    }

    return NextResponse.json({
      success: true,
      transaction: waveData,
      localRecord,
      message: waveData.status === "succeeded" 
        ? "Paiement envoyé avec succès" 
        : "Paiement en cours de traitement"
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Données invalides", errors: error.errors },
        { status: 400 }
      )
    }

    console.error("Erreur lors de l'envoi du paiement:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

// GET pour récupérer un paiement par ID
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Non autorisé" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const payoutId = searchParams.get('id')

    if (!payoutId) {
      return NextResponse.json(
        { message: "ID de paiement requis" },
        { status: 400 }
      )
    }

    // Récupérer la clé API Wave de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        waveApiKey: true
      }
    })

    if (!user?.waveApiKey) {
      return NextResponse.json(
        { message: "Clé API Wave non configurée" },
        { status: 400 }
      )
    }

    // Appeler l'API Wave pour récupérer le paiement
    const waveResponse = await fetch(`https://api.wave.com/v1/payout/${payoutId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${user.waveApiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!waveResponse.ok) {
      const errorData = await waveResponse.json().catch(() => ({}))
      return NextResponse.json(
        { message: "Erreur lors de la récupération du paiement", error: errorData },
        { status: waveResponse.status }
      )
    }

    const waveData = await waveResponse.json()

    // Récupérer l'enregistrement local associé
    const localAssignment = await prisma.waveTransactionAssignment.findFirst({
      where: {
        transactionId: payoutId,
        userId: session.user.id
      },
      include: {
        expense: true,
        project: true,
        client: true,
        provider: true
      }
    })

    return NextResponse.json({
      success: true,
      transaction: waveData,
      localRecord: localAssignment
    })

  } catch (error) {
    console.error("Erreur lors de la récupération du paiement:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 