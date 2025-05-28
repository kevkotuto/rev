import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"
import { z } from "zod"
import { v4 as uuidv4 } from "uuid"

const payoutBatchSchema = z.object({
  payouts: z.array(z.object({
    receive_amount: z.number().positive("Le montant doit être positif"),
    currency: z.string().default("XOF"),
    mobile: z.string().min(1, "Le numéro de téléphone est requis"),
    name: z.string().optional(),
    national_id: z.string().optional(),
    payment_reason: z.string().max(40, "Le motif de paiement ne peut pas dépasser 40 caractères").optional(),
    client_reference: z.string().max(255, "La référence client ne peut pas dépasser 255 caractères").optional(),
    aggregated_merchant_id: z.string().optional(),
    // Champs locaux pour le tracking
    type: z.enum(["provider_payment", "client_refund", "general_payment"]).default("general_payment"),
    providerId: z.string().optional(),
    clientId: z.string().optional(),
    projectId: z.string().optional()
  })).min(1, "Au moins un paiement est requis").max(100, "Maximum 100 paiements par lot")
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
    const validatedData = payoutBatchSchema.parse(body)

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

    // Préparer les données pour l'API Wave (sans les champs locaux)
    const wavePayouts = validatedData.payouts.map(payout => {
      const { type, providerId, clientId, projectId, ...waveFields } = payout
      return {
        currency: waveFields.currency,
        receive_amount: waveFields.receive_amount.toString(),
        mobile: waveFields.mobile,
        ...(waveFields.name && { name: waveFields.name }),
        ...(waveFields.national_id && { national_id: waveFields.national_id }),
        ...(waveFields.payment_reason && { payment_reason: waveFields.payment_reason }),
        ...(waveFields.client_reference && { client_reference: waveFields.client_reference }),
        ...(waveFields.aggregated_merchant_id && { aggregated_merchant_id: waveFields.aggregated_merchant_id })
      }
    })

    const wavePayload = {
      payouts: wavePayouts
    }

    console.log('Envoi lot de paiements Wave:', wavePayload)

    // Appeler l'API Wave Payout Batch
    const waveResponse = await fetch('https://api.wave.com/v1/payout-batch', {
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
        title: "Échec d'envoi du lot de paiements",
        message: `Échec de l'envoi du lot de ${validatedData.payouts.length} paiements`,
        type: "WAVE_PAYMENT_FAILED",
        metadata: {
          batchSize: validatedData.payouts.length,
          totalAmount: validatedData.payouts.reduce((sum, p) => sum + p.receive_amount, 0),
          error: errorData
        }
      })
      
      return NextResponse.json(
        { message: "Erreur lors de l'envoi du lot de paiements", error: errorData },
        { status: waveResponse.status }
      )
    }

    const waveData = JSON.parse(responseText)
    console.log('Données Wave reçues:', waveData)

    // Sauvegarder l'ID du lot pour le suivi
    const batchRecord = await prisma.waveTransactionAssignment.create({
      data: {
        transactionId: waveData.id,
        type: "batch",
        description: `Lot de ${validatedData.payouts.length} paiements`,
        amount: validatedData.payouts.reduce((sum, p) => sum + p.receive_amount, 0),
        fee: 0, // Les frais seront calculés individuellement
        currency: validatedData.payouts[0].currency,
        timestamp: new Date(),
        waveData: {
          batchId: waveData.id,
          payouts: validatedData.payouts,
          status: "processing"
        },
        userId: session.user.id
      }
    })

    // Créer une notification de succès
    await createNotification({
      userId: session.user.id,
      title: "Lot de paiements soumis",
      message: `Lot de ${validatedData.payouts.length} paiements soumis avec succès. ID: ${waveData.id}`,
      type: "INFO",
      relatedType: "wave_transaction",
      relatedId: waveData.id,
      actionUrl: "/wave-transactions",
      metadata: {
        batchId: waveData.id,
        batchSize: validatedData.payouts.length,
        totalAmount: validatedData.payouts.reduce((sum, p) => sum + p.receive_amount, 0)
      }
    })

    return NextResponse.json({
      success: true,
      batchId: waveData.id,
      batchRecord,
      message: `Lot de ${validatedData.payouts.length} paiements soumis avec succès. Utilisez l'ID ${waveData.id} pour suivre le statut.`
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Données invalides", errors: error.errors },
        { status: 400 }
      )
    }

    console.error("Erreur lors de l'envoi du lot de paiements:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

// GET pour récupérer le statut d'un lot de paiements
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
    const batchId = searchParams.get('id')

    if (!batchId) {
      return NextResponse.json(
        { message: "ID de lot requis" },
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

    // Appeler l'API Wave pour récupérer le statut du lot
    const waveResponse = await fetch(`https://api.wave.com/v1/payout-batch/${batchId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${user.waveApiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!waveResponse.ok) {
      const errorData = await waveResponse.json().catch(() => ({}))
      return NextResponse.json(
        { message: "Erreur lors de la récupération du lot", error: errorData },
        { status: waveResponse.status }
      )
    }

    const waveData = await waveResponse.json()

    // Récupérer l'enregistrement local associé
    const localBatch = await prisma.waveTransactionAssignment.findFirst({
      where: {
        transactionId: batchId,
        userId: session.user.id,
        type: "batch"
      }
    })

    // Mettre à jour le statut local si nécessaire
    if (localBatch && typeof localBatch.waveData === 'object' && localBatch.waveData !== null) {
      const currentWaveData = localBatch.waveData as any
      if (waveData.status !== currentWaveData.status) {
        await prisma.waveTransactionAssignment.update({
          where: { id: localBatch.id },
          data: {
            waveData: {
              ...currentWaveData,
              ...waveData
            }
          }
        })
      }
    }

    return NextResponse.json({
      success: true,
      batch: waveData,
      localRecord: localBatch
    })

  } catch (error) {
    console.error("Erreur lors de la récupération du lot:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 