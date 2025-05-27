import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const convertSchema = z.object({
  generatePaymentLink: z.boolean().default(false),
  paymentMethod: z.enum(["WAVE", "CASH", "BANK_TRANSFER"]).optional(),
  markAsPaid: z.boolean().default(false),
  paidDate: z.string().optional()
})

// POST - Convertir une proforma en facture
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Non autorisé" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = convertSchema.parse(body)

    // Récupérer la proforma
    const proforma = await prisma.invoice.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
        type: "PROFORMA"
      }
    })

    if (!proforma) {
      return NextResponse.json(
        { message: "Proforma non trouvée" },
        { status: 404 }
      )
    }

    // Vérifier s'il existe déjà une facture pour ce projet
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        projectId: proforma.projectId,
        type: "INVOICE"
      }
    })

    if (existingInvoice) {
      return NextResponse.json(
        { message: "Une facture existe déjà pour ce projet" },
        { status: 400 }
      )
    }

    // Générer le numéro de facture
    const currentYear = new Date().getFullYear()
    const lastInvoice = await prisma.invoice.findFirst({
      where: {
        userId: session.user.id,
        type: "INVOICE",
        invoiceNumber: {
          startsWith: `INV-${currentYear}`
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    let invoiceNumber = `INV-${currentYear}-001`
    if (lastInvoice) {
      const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-')[2])
      const nextNumber = (lastNumber + 1).toString().padStart(3, '0')
      invoiceNumber = `INV-${currentYear}-${nextNumber}`
    }

    let paymentLink = null

    // Intégration Wave CI réelle
    if (validatedData.generatePaymentLink && validatedData.paymentMethod === "WAVE") {
      try {
        // Récupérer la configuration Wave de l'utilisateur
        const user = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { waveApiKey: true }
        })

        if (user?.waveApiKey) {
          // Préparer les données pour Wave CI
          const checkoutData = {
            amount: proforma.amount.toString(),
            currency: "XOF",
            error_url: `${process.env.NEXTAUTH_URL}/payment/error?invoice=${invoiceNumber}`,
            success_url: `${process.env.NEXTAUTH_URL}/payment/success?invoice=${invoiceNumber}`,
            client_reference: invoiceNumber
          }

          // Appeler l'API Wave CI
          const waveResponse = await fetch('https://api.wave.com/v1/checkout/sessions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${user.waveApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(checkoutData)
          })

          if (waveResponse.ok) {
            const waveData = await waveResponse.json()
            paymentLink = waveData.wave_launch_url
          } else {
            console.error('Erreur Wave API:', await waveResponse.text())
          }
        }
      } catch (error) {
        console.error('Erreur lors de la création du lien de paiement Wave:', error)
      }
    }

    // Déterminer la date de paiement
    let paidDate = null
    if (validatedData.markAsPaid) {
      if (validatedData.paidDate) {
        paidDate = new Date(validatedData.paidDate)
      } else {
        paidDate = new Date() // Date actuelle par défaut
      }
    }

    // Créer la facture
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: invoiceNumber,
        type: "INVOICE",
        amount: proforma.amount,
        status: validatedData.markAsPaid ? "PAID" : "PENDING",
        dueDate: proforma.dueDate,
        paidDate: paidDate,
        paymentLink: paymentLink,
        projectId: proforma.projectId,
        userId: session.user.id
      }
    })

    // Marquer la proforma comme convertie
    await prisma.invoice.update({
      where: { id: params.id },
      data: { 
        status: "CONVERTED"
      }
    })

    return NextResponse.json({
      invoice,
      paymentLink,
      message: paymentLink 
        ? "Facture créée avec succès et lien de paiement généré"
        : "Facture créée avec succès"
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Données invalides", errors: error.errors },
        { status: 400 }
      )
    }

    console.error("Erreur lors de la conversion de la proforma:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 