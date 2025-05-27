import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const partialConvertSchema = z.object({
  selectedServices: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    unitPrice: z.number(),
    quantity: z.number(),
    unit: z.string().optional(),
    projectServiceId: z.string().optional()
  })),
  clientInfo: z.object({
    name: z.string().optional(),
    email: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional()
  }).optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  generatePaymentLink: z.boolean().default(false),
  paymentMethod: z.enum(["WAVE", "CASH", "BANK_TRANSFER"]).optional(),
  markAsPaid: z.boolean().default(false),
  paidDate: z.string().optional()
})

// POST - Convertir partiellement une proforma en facture
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
    const validatedData = partialConvertSchema.parse(body)

    // Récupérer la proforma
    const proforma = await prisma.invoice.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
        type: "PROFORMA"
      },
      include: {
        project: {
          include: {
            client: true,
            services: true
          }
        }
      }
    })

    if (!proforma) {
      return NextResponse.json(
        { message: "Proforma non trouvée" },
        { status: 404 }
      )
    }

    // Calculer le montant total des services sélectionnés
    const totalAmount = validatedData.selectedServices.reduce((sum, service) => {
      return sum + (service.unitPrice * service.quantity)
    }, 0)

    if (totalAmount <= 0) {
      return NextResponse.json(
        { message: "Aucun service sélectionné ou montant invalide" },
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

    // Informations client (priorité : données fournies > projet > proforma)
    const clientInfo = validatedData.clientInfo || {}
    const clientName = clientInfo.name || proforma.project?.client?.name || proforma.clientName
    const clientEmail = clientInfo.email || proforma.project?.client?.email || proforma.clientEmail
    const clientAddress = clientInfo.address || proforma.project?.client?.address || proforma.clientAddress
    const clientPhone = clientInfo.phone || proforma.project?.client?.phone || proforma.clientPhone

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
            amount: totalAmount.toString(),
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

    // Créer la facture partielle
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: invoiceNumber,
        type: "INVOICE",
        amount: totalAmount,
        status: validatedData.markAsPaid ? "PAID" : "PENDING",
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : proforma.dueDate,
        paidDate: paidDate,
        paymentLink: paymentLink,
        notes: validatedData.notes,
        clientName: clientName,
        clientEmail: clientEmail,
        clientAddress: clientAddress,
        clientPhone: clientPhone,
        parentProformaId: proforma.id,
        projectId: proforma.projectId,
        userId: session.user.id,
        items: {
          create: validatedData.selectedServices.map(service => ({
            name: service.name,
            description: service.description,
            unitPrice: service.unitPrice,
            quantity: service.quantity,
            unit: service.unit,
            totalPrice: service.unitPrice * service.quantity,
            projectServiceId: service.projectServiceId
          }))
        }
      },
      include: {
        items: true,
        project: {
          include: {
            client: true,
            services: true
          }
        }
      }
    })

    // Vérifier si tous les services de la proforma ont été facturés
    const allInvoicesFromProforma = await prisma.invoice.findMany({
      where: {
        parentProformaId: proforma.id,
        type: "INVOICE"
      },
      include: {
        items: true
      }
    })

    const totalInvoicedAmount = allInvoicesFromProforma.reduce((sum, inv) => sum + inv.amount, 0)
    
    // Si tout est facturé, marquer la proforma comme convertie
    if (totalInvoicedAmount >= proforma.amount) {
      await prisma.invoice.update({
        where: { id: proforma.id },
        data: { status: "CONVERTED" }
      })
    }

    return NextResponse.json({
      invoice,
      paymentLink,
      totalInvoicedAmount,
      remainingAmount: proforma.amount - totalInvoicedAmount,
      isFullyConverted: totalInvoicedAmount >= proforma.amount,
      message: paymentLink 
        ? "Facture partielle créée avec succès et lien de paiement généré"
        : "Facture partielle créée avec succès"
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Données invalides", errors: error.errors },
        { status: 400 }
      )
    }

    console.error("Erreur lors de la conversion partielle:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 