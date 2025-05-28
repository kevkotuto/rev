import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"

export async function GET(
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

    // Appeler l'API Wave pour récupérer la session checkout
    const waveResponse = await fetch(`https://api.wave.com/v1/checkout/sessions/${checkoutId}`, {
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
        transactionId: checkoutId,
        userId: session.user.id,
        type: "checkout"
      },
      include: {
        project: true,
        client: true
      }
    })

    // Mettre à jour les données locales si nécessaire
    if (localCheckout && typeof localCheckout.waveData === 'object' && localCheckout.waveData !== null) {
      const currentWaveData = localCheckout.waveData as any
      if (waveData.checkout_status !== currentWaveData.checkout_status || 
          waveData.payment_status !== currentWaveData.payment_status) {
        await prisma.waveTransactionAssignment.update({
          where: { id: localCheckout.id },
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