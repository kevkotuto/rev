import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateInvoiceEmailTemplate } from "@/lib/email"

export async function GET(
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

    // Récupérer la facture avec les informations complètes
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: params.id,
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

    // Récupérer les informations de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json(
        { message: "Utilisateur non trouvé" },
        { status: 404 }
      )
    }

    // Déterminer le destinataire par défaut
    const defaultRecipient = invoice.clientEmail || 
                           invoice.project?.client?.email || 
                           ""

    // Générer le sujet par défaut
    const invoiceType = invoice.type === "PROFORMA" ? "Proforma" : "Facture"
    const defaultSubject = `${invoiceType} ${invoice.invoiceNumber} - ${user.companyName || user.name}`

    // Générer le contenu HTML de l'email
    const emailContent = generateInvoiceEmailTemplate(invoice, user)

    return NextResponse.json({
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        type: invoice.type,
        amount: invoice.amount
      },
      defaultRecipient,
      defaultSubject,
      emailContent,
      client: invoice.project?.client ? {
        name: invoice.project.client.name,
        email: invoice.project.client.email
      } : null,
      customClient: invoice.clientName ? {
        name: invoice.clientName,
        email: invoice.clientEmail
      } : null
    })

  } catch (error) {
    console.error("Erreur lors de la génération de la prévisualisation email:", error)
    return NextResponse.json(
      { message: "Erreur lors de la génération de la prévisualisation" },
      { status: 500 }
    )
  }
} 