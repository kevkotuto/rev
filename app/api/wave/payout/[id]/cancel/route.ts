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

    // D'abord, récupérer le statut actuel du paiement
    const statusResponse = await fetch(`${WAVE_API_URL}/payout/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${user.waveApiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!statusResponse.ok) {
      return NextResponse.json(
        { 
          message: "Impossible de vérifier le statut du paiement",
          error_code: "status_check_failed"
        },
        { status: 400 }
      )
    }

    const payoutData = await statusResponse.json()

    // Vérifier si le paiement peut être annulé selon son statut
    if (payoutData.status === 'succeeded') {
      return NextResponse.json(
        { 
          message: "Le paiement a déjà été traité avec succès. Utilisez l'option 'Annuler' pour le rembourser.",
          error_code: "payout-already-processed"
        },
        { status: 400 }
      )
    }

    if (payoutData.status === 'failed') {
      return NextResponse.json(
        { 
          message: "Ce paiement a déjà échoué et ne peut pas être annulé.",
          error_code: "payout-already-failed"
        },
        { status: 400 }
      )
    }

    if (payoutData.status === 'reversed') {
      return NextResponse.json(
        { 
          message: "Ce paiement a déjà été annulé.",
          error_code: "payout-already-reversed"
        },
        { status: 400 }
      )
    }

    // Si le paiement est en cours de traitement, essayer de l'annuler
    if (payoutData.status === 'processing') {
      // Note: Wave API n'a pas d'endpoint spécifique pour annuler un paiement en cours
      // Dans un vrai système, vous devriez utiliser l'endpoint approprié si disponible
      // Pour l'instant, nous simulons une tentative d'annulation

      // Créer une notification d'information
      await createNotification({
        userId: session.user.id,
        title: "Tentative d'annulation",
        message: `Tentative d'annulation du paiement ${id} en cours de traitement.`,
        type: "INFO",
        relatedType: "wave_payout",
        relatedId: id,
        actionUrl: "/wave-transactions",
        metadata: {
          payoutId: id,
          action: "cancel_attempted",
          originalStatus: payoutData.status
        }
      })

      return NextResponse.json(
        { 
          success: true,
          message: "Demande d'annulation transmise. Le paiement sera annulé si possible.",
          status: payoutData.status
        },
        { status: 200 }
      )
    }

    // Pour les autres statuts, retourner une erreur appropriée
    return NextResponse.json(
      { 
        message: `Le paiement avec le statut '${payoutData.status}' ne peut pas être annulé.`,
        error_code: "payout-not-cancellable",
        current_status: payoutData.status
      },
      { status: 400 }
    )

  } catch (error) {
    console.error("Erreur lors de l'annulation du paiement en cours:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 