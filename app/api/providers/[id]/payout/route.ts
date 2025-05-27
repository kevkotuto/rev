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

    const { id } = await params
    const body = await request.json()
    const { amount, projectProviderId, notes } = body

    // Vérifier que le prestataire existe et appartient à l'utilisateur
    const provider = await prisma.provider.findFirst({
      where: {
        id,
        userId: session.user.id
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        company: true,
        role: true,
        photo: true,
        notes: true,
        bankName: true,
        bankAccount: true,
        bankIban: true,
        waveRecipientId: true,
        userId: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!provider) {
      return NextResponse.json(
        { message: "Prestataire non trouvé" },
        { status: 404 }
      )
    }

    // Vérifier l'ID du prestataire Wave (recipient_id)
    if (!provider.waveRecipientId) {
      return NextResponse.json(
        { message: "Ce prestataire n'a pas d'ID Wave configuré. Veuillez d'abord l'ajouter dans les paramètres du prestataire." },
        { status: 400 }
      )
    }

    // Récupérer les informations utilisateur pour Wave
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        waveApiKey: true,
        currency: true
      }
    })

    if (!user?.waveApiKey) {
      return NextResponse.json(
        { message: "Configuration Wave manquante. Veuillez configurer vos clés API Wave dans les paramètres." },
        { status: 400 }
      )
    }

    // Préparer la requête B2B Payout selon la documentation Wave
    const payoutRequest = {
      currency: user.currency === 'FCFA' ? 'XOF' : (user.currency || 'XOF'),
      receive_amount: amount.toString(), // Le prestataire reçoit ce montant
      recipient_id: provider.waveRecipientId,
      client_reference: `payout-${provider.id}-${Date.now()}`,
      fee_payment_method: "SENDER_PAYS" // L'utilisateur paie les frais
    }

    console.log('Requête Wave B2B Payout:', payoutRequest)

    // Effectuer le paiement via Wave B2B Payout
    let waveResponse
    try {
      const waveApiResponse = await fetch('https://api.wave.com/v1/b2b/payout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.waveApiKey}`,
          'Content-Type': 'application/json',
          'idempotency-key': `payout-${provider.id}-${Date.now()}`
        },
        body: JSON.stringify(payoutRequest)
      })

      console.log('Statut réponse Wave B2B:', waveApiResponse.status)

      if (!waveApiResponse.ok) {
        const errorText = await waveApiResponse.text()
        console.error('Erreur Wave B2B API:', errorText)
        
        let errorMessage = 'Erreur inconnue'
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.message || errorData.error || 'Erreur inconnue'
        } catch {
          errorMessage = errorText || 'Erreur inconnue'
        }
        
        throw new Error(`Wave B2B API Error: ${errorMessage}`)
      }

      waveResponse = await waveApiResponse.json()
      console.log('Réponse Wave B2B Payout:', waveResponse)
      
    } catch (error) {
      console.error('Erreur Wave B2B API:', error)
      return NextResponse.json(
        { message: `Erreur lors du paiement Wave: ${error instanceof Error ? error.message : 'Erreur inconnue'}` },
        { status: 400 }
      )
    }

    // Créer un enregistrement de paiement avec le bon modèle
    const payment = await prisma.$transaction(async (tx) => {
      const payment = await tx.providerPayment.create({
        data: {
          providerId: provider.id,
          projectProviderId: projectProviderId || null,
          amount: parseFloat(amount),
          paymentMethod: 'WAVE',
          status: waveResponse.status === 'succeeded' ? 'COMPLETED' : 'PENDING',
          wavePayoutId: waveResponse.id,
          fees: parseFloat(waveResponse.fee || '0'),
          notes: notes || `Paiement Wave B2B - ${waveResponse.id}`,
          userId: session.user.id,
          paidAt: waveResponse.status === 'succeeded' ? new Date() : null
        }
      })

      // Si lié à un projet, mettre à jour le statut
      if (projectProviderId) {
        await tx.projectProvider.update({
          where: { id: projectProviderId },
          data: {
            isPaid: waveResponse.status === 'succeeded',
            paymentMethod: 'WAVE',
            paidDate: waveResponse.status === 'succeeded' ? new Date() : null
          }
        })
      }

      return payment
    })

    return NextResponse.json({
      payment,
      waveResponse,
      message: waveResponse.status === 'succeeded' 
        ? "Paiement Wave effectué avec succès" 
        : "Paiement Wave initié, en attente de confirmation"
    })

  } catch (error) {
    console.error("Erreur lors du paiement Wave:", error)
    return NextResponse.json(
      { message: "Erreur lors du paiement Wave" },
      { status: 500 }
    )
  }
} 