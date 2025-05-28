import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"

export async function PUT(
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
    const { paymentMethod = 'WAVE', paidDate, transactionId, amount: paidAmount } = body

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

    // Vérifier si la facture n'est pas déjà payée
    if (invoice.status === 'PAID') {
      return NextResponse.json(
        { message: "Cette facture est déjà marquée comme payée" },
        { status: 400 }
      )
    }

    // Mise à jour de la facture
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        status: "PAID",
        paidDate: paidDate ? new Date(paidDate) : new Date()
      },
      include: {
        project: {
          include: {
            client: true
          }
        }
      }
    })

    // Créer une notification
    await createNotification({
      userId: session.user.id,
      title: "Facture payée",
      message: `La facture ${invoice.invoiceNumber} a été marquée comme payée (${paymentMethod})`,
      type: "SUCCESS",
      relatedType: "invoice",
      relatedId: invoice.id,
      actionUrl: `/invoices/${invoice.id}`,
      metadata: {
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount,
        paymentMethod,
        transactionId: transactionId || null
      }
    })

    return NextResponse.json({
      success: true,
      message: `Facture ${invoice.invoiceNumber} marquée comme payée avec succès`,
      invoice: updatedInvoice,
      paymentMethod,
      transactionId: transactionId || null
    })

  } catch (error) {
    console.error("Erreur lors du marquage comme payée:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 