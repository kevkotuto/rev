import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    
    // Paramètre de sécurité optionnel
    const invoiceNumber = searchParams.get('invoiceNumber')

    const invoice = await prisma.invoice.findFirst({
      where: {
        id
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

    // Vérification de sécurité optionnelle avec le numéro de facture
    if (invoiceNumber && invoice.invoiceNumber !== invoiceNumber) {
      return NextResponse.json(
        { message: "Numéro de facture invalide" },
        { status: 403 }
      )
    }

    // Retourner seulement les informations nécessaires (pas les données sensibles)
    const publicInvoiceData = {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      type: invoice.type,
      amount: invoice.amount,
      status: invoice.status,
      dueDate: invoice.dueDate,
      paidDate: invoice.paidDate,
      clientName: invoice.clientName,
      project: invoice.project ? {
        name: invoice.project.name,
        client: invoice.project.client ? {
          name: invoice.project.client.name
        } : undefined
      } : undefined,
      createdAt: invoice.createdAt,
      waveCheckoutId: invoice.waveCheckoutId // Nécessaire pour la vérification de sécurité
    }

    return NextResponse.json(publicInvoiceData)
  } catch (error) {
    console.error("Erreur lors de la récupération de la facture publique:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 