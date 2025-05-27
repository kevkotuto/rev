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
    const { regenerate = false } = body

    // Vérifier que la facture existe et appartient à l'utilisateur
    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        userId: session.user.id
      },
      include: {
        project: {
          include: {
            client: true
          }
        }
      }
    })

    if (!invoice) {
      return NextResponse.json(
        { message: "Facture non trouvée" },
        { status: 404 }
      )
    }

    // Vérifier si un lien existe déjà et si on ne force pas la régénération
    if (invoice.paymentLink && !regenerate) {
      return NextResponse.json(
        { 
          message: "Un lien de paiement existe déjà pour cette facture",
          paymentLink: invoice.paymentLink
        },
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

    // Préparer les URLs de redirection
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    
    // Préparer la requête selon la documentation Wave
    const checkoutData = {
      amount: invoice.amount.toString(),
      currency: user.currency === 'FCFA' ? 'XOF' : (user.currency || 'XOF'),
      error_url: `${baseUrl}/payment/error?invoice=${invoice.invoiceNumber}`,
      success_url: `${baseUrl}/payment/success?invoice=${invoice.invoiceNumber}`,
      client_reference: invoice.invoiceNumber
    }

    console.log('Requête Wave Checkout:', checkoutData)

    // Effectuer l'appel à l'API Wave
    let waveResponse
    try {
      const waveApiResponse = await fetch('https://api.wave.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.waveApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(checkoutData)
      })

      console.log('Statut réponse Wave:', waveApiResponse.status)

      if (!waveApiResponse.ok) {
        const errorText = await waveApiResponse.text()
        console.error('Erreur Wave API:', errorText)
        
        let errorMessage = 'Erreur inconnue'
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.message || errorData.error || 'Erreur inconnue'
        } catch {
          errorMessage = errorText || 'Erreur inconnue'
        }
        
        throw new Error(`Wave API Error: ${errorMessage}`)
      }

      waveResponse = await waveApiResponse.json()
      console.log('Réponse Wave Checkout:', waveResponse)
      
    } catch (error) {
      console.error('Erreur Wave API:', error)
      return NextResponse.json(
        { message: `Erreur lors de la génération du lien Wave: ${error instanceof Error ? error.message : 'Erreur inconnue'}` },
        { status: 400 }
      )
    }

    // Mettre à jour la facture avec le nouveau lien
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        paymentLink: waveResponse.wave_launch_url,
        waveCheckoutId: waveResponse.id
      }
    })

    const actionMessage = regenerate ? 'régénéré' : 'généré'

    return NextResponse.json({
      message: `Lien de paiement Wave ${actionMessage} avec succès`,
      paymentLink: waveResponse.wave_launch_url,
      checkoutId: waveResponse.id,
      invoice: updatedInvoice
    })

  } catch (error) {
    console.error("Erreur lors de la génération du lien de paiement:", error)
    return NextResponse.json(
      { message: "Erreur lors de la génération du lien de paiement" },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Vérifier que la facture appartient à l'utilisateur
    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    })

    if (!invoice) {
      return NextResponse.json(
        { message: "Facture non trouvée" },
        { status: 404 }
      )
    }

    // Supprimer le lien de paiement
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        paymentLink: null,
        waveCheckoutId: null
      },
      include: {
        project: {
          include: {
            client: true
          }
        }
      }
    })

    return NextResponse.json({
      invoice: updatedInvoice,
      message: "Lien de paiement supprimé avec succès"
    })

  } catch (error) {
    console.error("Erreur lors de la suppression du lien de paiement:", error)
    return NextResponse.json(
      { message: "Erreur lors de la suppression du lien de paiement" },
      { status: 500 }
    )
  }
} 