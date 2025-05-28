import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Non autorisé" },
        { status: 401 }
      )
    }

    const checkoutId = params.id

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

    // Récupérer d'abord les informations de la session checkout
    const checkoutResponse = await fetch(`https://api.wave.com/v1/checkout/sessions/${checkoutId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${user.waveApiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!checkoutResponse.ok) {
      return NextResponse.json(
        { message: "Session checkout non trouvée" },
        { status: 404 }
      )
    }

    const checkoutData = await checkoutResponse.json()

    // Vérifier que la session peut être remboursée
    if (checkoutData.payment_status !== "succeeded") {
      return NextResponse.json(
        { message: "Seules les sessions checkout avec paiement réussi peuvent être remboursées" },
        { status: 400 }
      )
    }

    // Appeler l'API Wave pour rembourser la session checkout
    const waveResponse = await fetch(`https://api.wave.com/v1/checkout/sessions/${checkoutId}/refund`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user.waveApiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!waveResponse.ok) {
      const errorData = await waveResponse.json().catch(() => ({}))
      
      // Gestion des erreurs spécifiques
      if (waveResponse.status === 404) {
        return NextResponse.json(
          { message: "Session checkout non trouvée" },
          { status: 404 }
        )
      }
      
      return NextResponse.json(
        { message: "Erreur lors du remboursement de la session checkout", error: errorData },
        { status: waveResponse.status }
      )
    }

    // Mettre à jour l'enregistrement local
    const localCheckout = await prisma.waveTransactionAssignment.findFirst({
      where: {
        transactionId: checkoutId,
        userId: session.user.id,
        type: "checkout"
      }
    })

    if (localCheckout && typeof localCheckout.waveData === 'object' && localCheckout.waveData !== null) {
      const currentWaveData = localCheckout.waveData as any
      await prisma.waveTransactionAssignment.update({
        where: { id: localCheckout.id },
        data: {
          waveData: {
            ...currentWaveData,
            refunded: true,
            refunded_at: new Date().toISOString()
          }
        }
      })
    }

    // Créer une dépense pour le remboursement
    await prisma.expense.create({
      data: {
        description: `Remboursement checkout ${checkoutId}`,
        amount: parseFloat(checkoutData.amount),
        category: "Remboursement",
        type: "GENERAL",
        userId: session.user.id,
        ...(localCheckout?.projectId && { projectId: localCheckout.projectId })
      }
    })

    // Créer une notification
    await createNotification({
      userId: session.user.id,
      title: "Session checkout remboursée",
      message: `La session checkout ${checkoutId} de ${checkoutData.amount} ${checkoutData.currency} a été remboursée avec succès`,
      type: "SUCCESS",
      relatedType: "wave_transaction",
      relatedId: checkoutId,
      actionUrl: "/wave-transactions",
      metadata: {
        checkoutId,
        amount: checkoutData.amount,
        currency: checkoutData.currency,
        action: "refunded"
      }
    })

    return NextResponse.json({
      success: true,
      message: "Session checkout remboursée avec succès"
    })

  } catch (error) {
    console.error("Erreur lors du remboursement de la session checkout:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 