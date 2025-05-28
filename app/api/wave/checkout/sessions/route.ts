import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"
import { z } from "zod"

const checkoutSessionSchema = z.object({
  amount: z.string().min(1, "Le montant est requis"),
  currency: z.string().default("XOF"),
  success_url: z.string().url("URL de succès invalide"),
  error_url: z.string().url("URL d'erreur invalide"),
  client_reference: z.string().max(255, "La référence client ne peut pas dépasser 255 caractères").optional(),
  restrict_payer_mobile: z.string().optional(),
  aggregated_merchant_id: z.string().optional(),
  // Champs locaux pour le tracking
  projectId: z.string().optional(),
  clientId: z.string().optional(),
  description: z.string().optional()
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
    const validatedData = checkoutSessionSchema.parse(body)

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

    // Préparer les données pour l'API Wave Checkout
    const wavePayload = {
      amount: validatedData.amount,
      currency: validatedData.currency,
      success_url: validatedData.success_url,
      error_url: validatedData.error_url,
      ...(validatedData.client_reference && { client_reference: validatedData.client_reference }),
      ...(validatedData.restrict_payer_mobile && { restrict_payer_mobile: validatedData.restrict_payer_mobile }),
      ...(validatedData.aggregated_merchant_id && { aggregated_merchant_id: validatedData.aggregated_merchant_id })
    }

    console.log('Création session checkout Wave:', wavePayload)

    // Appeler l'API Wave Checkout
    const waveResponse = await fetch('https://api.wave.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user.waveApiKey}`,
        'Content-Type': 'application/json'
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
        title: "Échec de création de session checkout",
        message: `Échec de la création d'une session checkout de ${validatedData.amount} ${validatedData.currency}`,
        type: "WAVE_PAYMENT_FAILED",
        metadata: {
          amount: validatedData.amount,
          currency: validatedData.currency,
          error: errorData
        }
      })
      
      return NextResponse.json(
        { message: "Erreur lors de la création de la session checkout", error: errorData },
        { status: waveResponse.status }
      )
    }

    const waveData = JSON.parse(responseText)
    console.log('Données Wave reçues:', waveData)

    // Sauvegarder la session checkout localement
    const checkoutRecord = await prisma.waveTransactionAssignment.create({
      data: {
        transactionId: waveData.id,
        type: "checkout",
        description: validatedData.description || `Session checkout ${waveData.id}`,
        amount: parseFloat(validatedData.amount),
        fee: 0,
        currency: validatedData.currency,
        timestamp: new Date(waveData.when_created),
        waveData: waveData,
        userId: session.user.id,
        ...(validatedData.projectId && { projectId: validatedData.projectId }),
        ...(validatedData.clientId && { clientId: validatedData.clientId })
      }
    })

    // Créer une notification de succès
    await createNotification({
      userId: session.user.id,
      title: "Session checkout créée",
      message: `Session checkout de ${validatedData.amount} ${validatedData.currency} créée avec succès`,
      type: "INFO",
      relatedType: "wave_transaction",
      relatedId: waveData.id,
      actionUrl: "/wave-transactions",
      metadata: {
        checkoutId: waveData.id,
        amount: validatedData.amount,
        currency: validatedData.currency,
        waveUrl: waveData.wave_launch_url
      }
    })

    return NextResponse.json({
      success: true,
      checkout: waveData,
      localRecord: checkoutRecord,
      message: "Session checkout créée avec succès"
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Données invalides", errors: error.errors },
        { status: 400 }
      )
    }

    console.error("Erreur lors de la création de la session checkout:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

// GET pour récupérer une session checkout par transaction_id
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
    const transactionId = searchParams.get('transaction_id')

    if (!transactionId) {
      return NextResponse.json(
        { message: "ID de transaction requis" },
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

    // Appeler l'API Wave pour récupérer la session checkout
    const waveResponse = await fetch(`https://api.wave.com/v1/checkout/sessions?transaction_id=${encodeURIComponent(transactionId)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${user.waveApiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!waveResponse.ok) {
      const errorData = await waveResponse.json().catch(() => ({}))
      return NextResponse.json(
        { message: "Erreur lors de la récupération de la session checkout", error: errorData },
        { status: waveResponse.status }
      )
    }

    const waveData = await waveResponse.json()

    // Récupérer l'enregistrement local associé
    const localCheckout = await prisma.waveTransactionAssignment.findFirst({
      where: {
        transactionId: waveData.id,
        userId: session.user.id,
        type: "checkout"
      },
      include: {
        project: true,
        client: true
      }
    })

    return NextResponse.json({
      success: true,
      checkout: waveData,
      localRecord: localCheckout
    })

  } catch (error) {
    console.error("Erreur lors de la récupération de la session checkout:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 