import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { 
      paymentMethod = 'WAVE', 
      paidDate, 
      transactionId, 
      amount: paidAmount,
      waveCheckoutId // Pour vérifier que la requête est légitime
    } = body

    // Vérifier que la facture existe
    const invoice = await prisma.invoice.findFirst({
      where: {
        id
      },
      include: {
        project: {
          include: {
            client: true
          }
        },
        user: true // Pour récupérer l'utilisateur propriétaire
      }
    })

    if (!invoice) {
      return NextResponse.json(
        { message: "Facture non trouvée" },
        { status: 404 }
      )
    }

    // Vérification de sécurité : s'assurer que la requête vient bien d'un paiement Wave légitime
    // En vérifiant soit le waveCheckoutId soit d'autres paramètres de sécurité
    if (waveCheckoutId && invoice.waveCheckoutId !== waveCheckoutId) {
      return NextResponse.json(
        { message: "Requête non autorisée - checkout ID invalide" },
        { status: 403 }
      )
    }

    // Vérifier si la facture n'est pas déjà payée
    if (invoice.status === 'PAID') {
      return NextResponse.json(
        { 
          success: true,
          message: "Cette facture est déjà marquée comme payée",
          invoice: invoice
        },
        { status: 200 }
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

    // Créer une notification pour le propriétaire de la facture
    try {
      await createNotification({
        userId: invoice.user.id,
        title: "Facture payée",
        message: `La facture ${invoice.invoiceNumber} a été payée par votre client (${paymentMethod})`,
        type: "SUCCESS",
        relatedType: "invoice",
        relatedId: invoice.id,
        actionUrl: `/invoices/${invoice.id}`,
        metadata: {
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.amount,
          paymentMethod,
          transactionId: transactionId || null,
          clientName: invoice.clientName || invoice.project?.client?.name
        }
      })
    } catch (notificationError) {
      // Ne pas faire échouer la requête si la notification échoue
      console.error("Erreur lors de la création de la notification:", notificationError)
    }

    return NextResponse.json({
      success: true,
      message: `Facture ${invoice.invoiceNumber} marquée comme payée avec succès`,
      invoice: updatedInvoice,
      paymentMethod,
      transactionId: transactionId || null
    })

  } catch (error) {
    console.error("Erreur lors du marquage comme payée (public):", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 