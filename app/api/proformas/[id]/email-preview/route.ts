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

    // Récupérer le proforma avec les informations complètes
    const proforma = await prisma.invoice.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
        type: "PROFORMA"
      },
      include: {
        project: {
          include: {
            client: true
          }
        }
      }
    })

    if (!proforma) {
      return NextResponse.json(
        { message: "Proforma non trouvé" },
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
    const defaultRecipient = proforma.clientEmail || 
                           proforma.project?.client?.email || 
                           ""

    // Générer le sujet par défaut
    const defaultSubject = `Proforma ${proforma.invoiceNumber} - ${user.companyName || user.name}`

    // Générer le contenu HTML de l'email
    const emailContent = generateInvoiceEmailTemplate(proforma, user)

    return NextResponse.json({
      proforma: {
        id: proforma.id,
        invoiceNumber: proforma.invoiceNumber,
        type: proforma.type,
        amount: proforma.amount
      },
      defaultRecipient,
      defaultSubject,
      emailContent,
      client: proforma.project?.client ? {
        name: proforma.project.client.name,
        email: proforma.project.client.email
      } : null,
      customClient: proforma.clientName ? {
        name: proforma.clientName,
        email: proforma.clientEmail
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