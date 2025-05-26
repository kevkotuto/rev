import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const checkoutSchema = z.object({
  invoiceId: z.string(),
  amount: z.number().positive(),
  currency: z.string().default("XOF"),
  description: z.string().optional(),
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().optional()
})

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
    const validatedData = checkoutSchema.parse(body)

    // Vérifier que la facture existe et appartient à l'utilisateur
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: validatedData.invoiceId,
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

    // Récupérer la configuration Wave de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { waveApiKey: true }
    })

    if (!user?.waveApiKey) {
      return NextResponse.json(
        { message: "Configuration Wave manquante. Veuillez configurer votre clé API Wave dans les paramètres." },
        { status: 400 }
      )
    }

    // Préparer les données pour Wave CI
    const checkoutData = {
      amount: validatedData.amount,
      currency: validatedData.currency,
      error_url: `${process.env.NEXTAUTH_URL}/payment/cancel?invoice=${invoice.id}`,
      success_url: `${process.env.NEXTAUTH_URL}/payment/success?invoice=${invoice.id}`,
      webhook_url: `${process.env.NEXTAUTH_URL}/api/webhooks/wave`,
      reference: invoice.invoiceNumber, // Utiliser le numéro de facture comme référence
      description: validatedData.description || `Paiement facture ${invoice.invoiceNumber}`,
      customer: {
        name: validatedData.customerName || invoice.clientName || invoice.project?.client?.name || "Client",
        email: validatedData.customerEmail || invoice.clientEmail || invoice.project?.client?.email,
        phone: validatedData.customerPhone || invoice.clientPhone || invoice.project?.client?.phone
      }
    }

    // Appeler l'API Wave CI pour créer le checkout
    const waveResponse = await fetch('https://api.wave.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user.waveApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(checkoutData)
    })

    if (!waveResponse.ok) {
      const errorData = await waveResponse.json().catch(() => ({}))
      console.error('Erreur API Wave:', errorData)
      
      return NextResponse.json(
        { 
          message: "Erreur lors de la création du lien de paiement Wave",
          details: errorData.message || "Erreur inconnue"
        },
        { status: 400 }
      )
    }

    const waveData = await waveResponse.json()

    // Mettre à jour la facture avec le lien de paiement
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        paymentLink: waveData.wave_launch_url || waveData.checkout_url,
        // waveCheckoutId: waveData.id // Décommenté quand le champ sera ajouté au schéma
      }
    })

    return NextResponse.json({
      success: true,
      paymentUrl: waveData.wave_launch_url || waveData.checkout_url,
      checkoutId: waveData.id,
      message: "Lien de paiement généré avec succès"
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Données invalides", errors: error.errors },
        { status: 400 }
      )
    }

    console.error('Erreur lors de la création du checkout Wave:', error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

// GET - Récupérer les informations d'un checkout
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Non autorisé" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const invoiceId = searchParams.get('invoiceId')

    if (!invoiceId) {
      return NextResponse.json(
        { message: "ID de facture requis" },
        { status: 400 }
      )
    }

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        userId: session.user.id
      }
    })

    if (!invoice) {
      return NextResponse.json(
        { message: "Facture non trouvée" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.amount,
      status: invoice.status,
      paymentLink: invoice.paymentLink,
      hasPaymentLink: !!invoice.paymentLink
    })

  } catch (error) {
    console.error('Erreur lors de la récupération du checkout:', error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 