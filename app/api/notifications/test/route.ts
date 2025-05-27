import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createNotification } from "@/lib/notifications"

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
    const { type = 'INFO' } = body

    // Créer une notification de test
    const notification = await createNotification({
      userId: session.user.id,
      title: "Notification de test",
      message: "Ceci est une notification de test pour vérifier le bon fonctionnement du système.",
      type: type,
      relatedType: "test",
      relatedId: "test-" + Date.now(),
      actionUrl: "/notifications",
      metadata: {
        testData: true,
        timestamp: new Date().toISOString(),
        amount: "1000",
        currency: "XOF"
      }
    })

    if (notification) {
      return NextResponse.json({
        message: "Notification de test créée avec succès",
        notification
      })
    } else {
      return NextResponse.json(
        { message: "Erreur lors de la création de la notification" },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Erreur lors de la création de la notification de test:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 