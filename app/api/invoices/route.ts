import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { invoiceSchema } from "@/lib/validations"
import { generateInvoiceNumber } from "@/lib/format"
import { WaveAPI, formatWaveAmount, getWaveCurrency } from "@/lib/wave"

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
    const projectId = searchParams.get('projectId')
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    const where: any = {
      userId: session.user.id
    }

    if (projectId) where.projectId = projectId
    if (status) where.status = status as any
    if (type) where.type = type as any

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        project: {
          include: {
            client: true,
            services: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(invoices)
  } catch (error) {
    console.error("Erreur lors de la récupération des factures:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

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
    const validatedData = invoiceSchema.parse(body)

    // Récupérer les informations utilisateur
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json(
        { message: "Utilisateur non trouvé" },
        { status: 404 }
      )
    }

    // Récupérer les informations du projet et client si applicable
    let project = null
    let client = null
    if (validatedData.projectId) {
      project = await prisma.project.findFirst({
        where: {
          id: validatedData.projectId,
          userId: session.user.id
        },
        include: {
          client: true,
          services: true
        }
      })

      if (!project) {
        return NextResponse.json(
          { message: "Projet non trouvé" },
          { status: 404 }
        )
      }

      client = project.client
    }

    // Générer le numéro de facture
    const invoiceNumber = generateInvoiceNumber(
      validatedData.type === 'PROFORMA' ? 'PRO' : 'INV'
    )

    // Créer la facture avec transformation des dates
    const { generatePaymentLink, ...invoiceDataWithoutPaymentLink } = validatedData
    const invoiceData = {
      ...invoiceDataWithoutPaymentLink,
      invoiceNumber,
      userId: session.user.id,
      // Transformer les dates en format ISO-8601 DateTime
      dueDate: validatedData.dueDate ? new Date(validatedData.dueDate).toISOString() : null,
      paidDate: validatedData.paidDate ? new Date(validatedData.paidDate).toISOString() : null,
      // Copier les informations client pour la facture
      clientName: client?.name || body.clientName,
      clientEmail: client?.email || body.clientEmail,
      clientAddress: client?.address || body.clientAddress,
      clientPhone: client?.phone || body.clientPhone,
    }

    const invoice = await prisma.invoice.create({
      data: invoiceData,
      include: {
        project: {
          include: {
            client: true,
            services: true
          }
        }
      }
    })

    // Générer le lien de paiement Wave si demandé et si c'est une facture (pas proforma)
    if (body.generatePaymentLink && validatedData.type === 'INVOICE' && user.waveApiKey) {
      try {
        const waveApi = new WaveAPI(user.waveApiKey)
        
        const checkoutSession = await waveApi.createCheckoutSession({
          amount: formatWaveAmount(validatedData.amount),
          currency: getWaveCurrency(user.currency),
          success_url: `${process.env.NEXTAUTH_URL}/invoices/${invoice.id}/success`,
          error_url: `${process.env.NEXTAUTH_URL}/invoices/${invoice.id}/error`,
          client_reference: invoice.invoiceNumber
        })

        // Mettre à jour la facture avec les informations Wave
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            paymentLink: checkoutSession.checkout_url,
            waveCheckoutId: checkoutSession.id
          }
        })

        return NextResponse.json({
          ...invoice,
          paymentLink: checkoutSession.checkout_url,
          waveCheckoutId: checkoutSession.id
        }, { status: 201 })

      } catch (waveError) {
        console.error("Erreur Wave:", waveError)
        // Retourner la facture même si Wave échoue
        return NextResponse.json({
          ...invoice,
          waveError: "Erreur lors de la génération du lien de paiement"
        }, { status: 201 })
      }
    }

    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    console.error("Erreur lors de la création de la facture:", error)
    return NextResponse.json(
      { message: "Erreur lors de la création de la facture" },
      { status: 500 }
    )
  }
} 