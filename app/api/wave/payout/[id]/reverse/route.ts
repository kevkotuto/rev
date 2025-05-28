import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"

const WAVE_API_URL = "https://api.wave.com/v1"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Non autorisé" },
        { status: 401 }
      )
    }

    // Récupérer le token Wave API de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { waveApiKey: true }
    })

    if (!user?.waveApiKey) {
      return NextResponse.json(
        { message: "Token Wave API manquant. Veuillez configurer votre clé API Wave dans les paramètres." },
        { status: 400 }
      )
    }

    const { id } = await params

    // Appeler l'API Wave pour annuler le paiement
    const response = await fetch(`${WAVE_API_URL}/payout/${id}/reverse`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user.waveApiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      // Succès de l'annulation - pas de body retourné par l'API Wave
      // Créer une notification
      await createNotification({
        userId: session.user.id,
        title: "Paiement annulé",
        message: `Le paiement ${id} a été annulé avec succès. Le remboursement sera traité.`,
        type: "SUCCESS",
        relatedType: "wave_payout",
        relatedId: id,
        actionUrl: "/wave-transactions",
        metadata: {
          payoutId: id,
          action: "reversed"
        }
      })

      return NextResponse.json(
        { 
          success: true,
          message: "Paiement annulé avec succès. Le remboursement sera traité."
        },
        { status: 200 }
      )
    } else {
      const error = await response.json()
      
      // Créer une notification d'erreur
      await createNotification({
        userId: session.user.id,
        title: "Échec de l'annulation",
        message: `Impossible d'annuler le paiement ${id}: ${error.error_message || 'Erreur inconnue'}`,
        type: "ERROR",
        relatedType: "wave_payout",
        relatedId: id,
        actionUrl: "/wave-transactions",
        metadata: {
          payoutId: id,
          action: "reverse_failed",
          error_code: error.error_code
        }
      })
      
      // Retourner l'erreur avec le code d'erreur spécifique de Wave
      return NextResponse.json(
        { 
          message: error.error_message || "Erreur lors de l'annulation du paiement",
          error_code: error.error_code
        },
        { status: response.status }
      )
    }

  } catch (error) {
    console.error("Erreur lors de l'annulation du paiement:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 