import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"
import { z } from "zod"

const sendMoneySchema = z.object({
  receive_amount: z.number().positive("Le montant doit être positif"),
  currency: z.string().default("XOF"),
  mobile: z.string().min(1, "Le numéro de téléphone est requis"),
  name: z.string().optional(),
  payment_reason: z.string().optional(),
  client_reference: z.string().optional(),
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
    const validatedData = sendMoneySchema.parse(body)

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

    // Préparer les données pour l'API Wave Payout
    const wavePayload = {
      receive_amount: validatedData.receive_amount.toString(),
      currency: validatedData.currency,
      mobile: validatedData.mobile,
      ...(validatedData.name && { name: validatedData.name }),
      ...(validatedData.payment_reason && { payment_reason: validatedData.payment_reason }),
      ...(validatedData.client_reference && { client_reference: validatedData.client_reference })
    }

    // Appeler l'API Wave Payout (nouvelle API)
    const waveResponse = await fetch('https://api.wave.com/v1/payout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user.waveApiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': require('crypto').randomUUID()
      },
      body: JSON.stringify(wavePayload)
    })

    if (!waveResponse.ok) {
      const errorData = await waveResponse.json().catch(() => ({}))
      console.error('Erreur Wave API:', errorData)
      
      // Créer une notification d'échec
      await createNotification({
        userId: session.user.id,
        title: "Échec d'envoi d'argent",
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
        { message: "Erreur lors de l'envoi d'argent", error: errorData },
        { status: waveResponse.status }
      )
    }

    const waveData = await waveResponse.json()

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
          status: "COMPLETED",
          wavePayoutId: waveData.id,
          notes: validatedData.payment_reason,
          paidAt: new Date(),
          providerId: validatedData.providerId,
          userId: session.user.id
        }
      })

      // Notification pour paiement prestataire
      await createNotification({
        userId: session.user.id,
        title: "Paiement prestataire envoyé",
        message: `Paiement de ${validatedData.receive_amount} ${validatedData.currency} envoyé à ${provider.name}`,
        type: "PROVIDER_PAYMENT_COMPLETED",
        relatedType: "provider",
        relatedId: validatedData.providerId,
        actionUrl: `/providers/${validatedData.providerId}`,
        metadata: {
          amount: validatedData.receive_amount,
          currency: validatedData.currency,
          providerName: provider.name,
          transactionId: waveData.id
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
          timestamp: new Date(),
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
      const notificationType = validatedData.type === "client_refund" ? "SUCCESS" : "WAVE_PAYMENT_RECEIVED"
      const title = validatedData.type === "client_refund" 
        ? "Remboursement client envoyé"
        : "Paiement Wave envoyé"
      
      await createNotification({
        userId: session.user.id,
        title,
        message: `${validatedData.receive_amount} ${validatedData.currency} envoyé vers ${validatedData.mobile}`,
        type: notificationType,
        relatedType: "wave_transaction",
        relatedId: waveData.id,
        actionUrl: "/wave-transactions",
        metadata: {
          amount: validatedData.receive_amount,
          currency: validatedData.currency,
          recipient: validatedData.mobile,
          transactionId: waveData.id
        }
      })
    }

    return NextResponse.json({
      success: true,
      transaction: waveData,
      localRecord,
      message: "Paiement envoyé avec succès"
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Données invalides", errors: error.errors },
        { status: 400 }
      )
    }

    console.error("Erreur lors de l'envoi d'argent:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 