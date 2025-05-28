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

    // Appeler l'API Wave pour expirer la session checkout
    const waveResponse = await fetch(`https://api.wave.com/v1/checkout/sessions/${checkoutId}/expire`, {
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
      
      if (waveResponse.status === 409) {
        return NextResponse.json(
          { message: "La session checkout est déjà complétée ou expirée" },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { message: "Erreur lors de l'expiration de la session checkout", error: errorData },
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
            checkout_status: "expired",
            when_completed: new Date().toISOString()
          }
        }
      })
    }

    // Créer une notification
    await createNotification({
      userId: session.user.id,
      title: "Session checkout expirée",
      message: `La session checkout ${checkoutId} a été expirée avec succès`,
      type: "INFO",
      relatedType: "wave_transaction",
      relatedId: checkoutId,
      actionUrl: "/wave-transactions",
      metadata: {
        checkoutId,
        action: "expired"
      }
    })

    return NextResponse.json({
      success: true,
      message: "Session checkout expirée avec succès"
    })

  } catch (error) {
    console.error("Erreur lors de l'expiration de la session checkout:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 