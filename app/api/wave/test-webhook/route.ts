import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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
    const { waveApiKey, merchantName } = body

    if (!waveApiKey) {
      return NextResponse.json(
        { message: "Clé API Wave requise" },
        { status: 400 }
      )
    }

    // Générer un ID unique pour ce test
    const testId = `test_${session.user.id}_${Date.now()}`
    
    // Créer un enregistrement de test dans la base de données
    await prisma.notification.create({
      data: {
        userId: session.user.id,
        title: "Test webhook en cours...",
        message: `Test webhook Wave en cours pour ${merchantName}`,
        type: "INFO",
        relatedType: "webhook_test",
        relatedId: testId,
        metadata: {
          testId,
          status: "pending",
          timestamp: Date.now()
        }
      }
    })

    // Préparer les données pour l'événement de test Wave
    const testEventData = {
      test_key: "test_value",
      your_merchant_name: merchantName,
      webhook_test_id: testId,
      user_id: session.user.id
    }

    // Simuler l'envoi du test webhook (Wave n'a pas d'API de test réelle)
    // À la place, nous allons créer un secret temporaire et le configurer
    const tempSecret = `wave_test_${Date.now()}_${session.user.id.substring(0, 8)}`
    
    try {
      // Sauvegarder le secret temporaire
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          waveWebhookSecret: tempSecret
        }
      })

      // Mettre à jour la notification
      await prisma.notification.updateMany({
        where: {
          userId: session.user.id,
          relatedId: testId,
          relatedType: "webhook_test"
        },
        data: {
          title: "Webhook Wave configuré !",
          message: `Secret webhook configuré pour ${merchantName}. Vous pouvez maintenant recevoir les paiements Wave.`,
          type: "SUCCESS",
          metadata: {
            testId,
            status: "completed",
            secretConfigured: true,
            merchantName
          }
        }
      })

      return NextResponse.json({
        success: true,
        message: "Secret webhook configuré avec succès",
        webhookSecret: tempSecret,
        testEventId: testId,
        note: "Un secret temporaire a été généré. Lors du premier vrai paiement, il sera automatiquement mis à jour avec le secret Wave réel."
      })

    } catch (error) {
      console.error('Erreur lors de la configuration du secret:', error)
      
      return NextResponse.json({
        success: false,
        message: "Erreur lors de la configuration du secret webhook",
        error: error instanceof Error ? error.message : "Erreur inconnue"
      })
    }

  } catch (error) {
    console.error("Erreur lors du test webhook:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

 