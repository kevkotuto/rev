import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const convertSchema = z.object({
  generatePaymentLink: z.boolean().default(false),
  paymentMethod: z.enum(["WAVE", "CASH", "BANK_TRANSFER"]).optional(),
  markAsPaid: z.boolean().default(false)
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

    // TODO: Implémenter l'intégration Wave CI plus tard
    if (validatedData.generatePaymentLink && validatedData.paymentMethod === "WAVE") {
      // Pour l'instant, on génère un lien fictif
      paymentLink = `https://checkout.wave.com/pay/${params.id}`
    }

    // Créer la facture
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: invoiceNumber,
        type: "INVOICE",
        amount: proforma.amount,
        status: validatedData.markAsPaid ? "PAID" : "PENDING",
        dueDate: proforma.dueDate,
        paidDate: validatedData.markAsPaid ? new Date() : null,
        paymentLink: paymentLink,
        projectId: proforma.projectId,
        userId: session.user.id
      }
    })

    // Marquer la proforma comme convertie
    await prisma.invoice.update({
      where: { id: params.id },
      data: { 
        status: "CANCELLED"
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