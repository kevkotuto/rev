import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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

    const { id: payoutId } = await params

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

    // Récupérer d'abord les détails du paiement pour vérifier s'il peut être annulé
    const paymentResponse = await fetch(`https://api.wave.com/v1/payout/${payoutId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${user.waveApiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!paymentResponse.ok) {
      return NextResponse.json(
        { message: "Impossible de récupérer les détails du paiement" },
        { status: 400 }
      )
    }

    const paymentData = await paymentResponse.json()

    // Vérifier si le paiement peut être annulé (moins de 3 jours)
    const paymentDate = new Date(paymentData.timestamp)
    const now = new Date()
    const daysDiff = (now.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24)

    if (daysDiff > 3) {
      return NextResponse.json(
        { 
          message: "Délai d'annulation dépassé",
          error: "payout-reversal-time-limit-exceeded",
          details: "Les paiements ne peuvent être annulés que dans les 3 jours suivant leur création"
        },
        { status: 400 }
      )
    }

    // Vérifier le statut du paiement
    if (paymentData.status === 'reversed') {
      return NextResponse.json(
        { 
          message: "Paiement déjà annulé",
          status: "already_reversed"
        },
        { status: 200 }
      )
    }

    if (paymentData.status !== 'succeeded') {
      return NextResponse.json(
        { 
          message: "Seuls les paiements réussis peuvent être annulés",
          currentStatus: paymentData.status
        },
        { status: 400 }
      )
    }

    // Appeler l'API Wave pour annuler le paiement
    const reverseResponse = await fetch(`https://api.wave.com/v1/payout/${payoutId}/reverse`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user.waveApiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (reverseResponse.ok) {
      // Succès de l'annulation - mettre à jour la dépense locale si elle existe
      try {
        const localExpense = await prisma.expense.findFirst({
          where: {
            userId: session.user.id,
            category: 'PROVIDER_PAYMENT',
            notes: {
              contains: payoutId
            }
          }
        })

        if (localExpense) {
          // Créer une dépense inverse pour la comptabilité
          await prisma.expense.create({
            data: {
              description: `ANNULATION - ${localExpense.description}`,
              amount: -localExpense.amount, // Montant négatif pour annuler
              category: 'PROVIDER_PAYMENT_REVERSAL',
              type: localExpense.type,
              date: new Date(),
              notes: `Annulation du paiement Wave\nPaiement original: ${payoutId}\nDate d'annulation: ${new Date().toISOString()}\nMontant remboursé: ${paymentData.receive_amount} XOF + ${paymentData.fee} XOF (frais)`,
              userId: session.user.id,
              projectId: localExpense.projectId
            }
          })

          // Mettre à jour le ProjectProvider si applicable
          if (localExpense.projectId) {
            const projectProvider = await prisma.projectProvider.findFirst({
              where: {
                projectId: localExpense.projectId,
                isPaid: true,
                paymentMethod: 'WAVE'
              },
              orderBy: {
                paidDate: 'desc'
              }
            })

            if (projectProvider) {
              await prisma.projectProvider.update({
                where: { id: projectProvider.id },
                data: {
                  isPaid: false,
                  paidDate: null,
                  paymentMethod: null
                }
              })
            }
          }
        }
      } catch (dbError) {
        console.error('Erreur lors de la mise à jour locale:', dbError)
        // L'annulation Wave a réussi, mais la mise à jour locale a échoué
        // On continue car le plus important est que l'annulation Wave soit effective
      }

      return NextResponse.json({
        message: "Paiement annulé avec succès",
        status: "reversed",
        payoutId: payoutId,
        reversalDate: new Date().toISOString()
      })

    } else {
      const errorData = await reverseResponse.json().catch(() => ({}))
      
      // Gérer les différents codes d'erreur Wave
      let errorMessage = "Erreur lors de l'annulation du paiement"
      let errorDetails = ""

      if (errorData.error_code) {
        switch (errorData.error_code) {
          case 'insufficient-funds':
            errorMessage = "Fonds insuffisants"
            errorDetails = "Le destinataire n'a pas suffisamment de solde pour couvrir l'annulation"
            break
          case 'payout-reversal-time-limit-exceeded':
            errorMessage = "Délai d'annulation dépassé"
            errorDetails = "Le délai de 3 jours pour annuler ce paiement est écoulé"
            break
          case 'payout-reversal-account-terminated':
            errorMessage = "Compte destinataire terminé"
            errorDetails = "Le compte Wave du destinataire a été fermé"
            break
          case 'not-found':
            errorMessage = "Paiement non trouvé"
            errorDetails = "Ce paiement n'existe pas ou n'appartient pas à votre compte"
            break
          default:
            errorMessage = `Erreur Wave: ${errorData.error_code}`
            errorDetails = errorData.message || "Erreur inconnue"
        }
      }

      return NextResponse.json(
        { 
          message: errorMessage,
          details: errorDetails,
          error_code: errorData.error_code,
          wave_error: errorData
        },
        { status: reverseResponse.status }
      )
    }

  } catch (error) {
    console.error("Erreur lors de l'annulation du paiement Wave:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 