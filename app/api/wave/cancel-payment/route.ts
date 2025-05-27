import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"
import { z } from "zod"

const cancelPaymentSchema = z.object({
  paymentId: z.string().min(1, "L'ID du paiement est requis"),
  reason: z.string().optional()
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
    const { paymentId, reason } = cancelPaymentSchema.parse(body)

    // Récupérer le paiement prestataire
    const payment = await prisma.providerPayment.findFirst({
      where: {
        id: paymentId,
        userId: session.user.id,
        status: "COMPLETED"
      },
      include: {
        provider: true,
        projectProvider: {
          include: {
            project: true
          }
        }
      }
    })

    if (!payment) {
      return NextResponse.json(
        { message: "Paiement non trouvé ou déjà annulé" },
        { status: 404 }
      )
    }

    // Marquer le paiement comme annulé
    const cancelledPayment = await prisma.providerPayment.update({
      where: { id: paymentId },
      data: {
        status: "FAILED",
        notes: `${payment.notes || ""}\n\nAnnulé le ${new Date().toLocaleString('fr-FR')}: ${reason || "Aucune raison spécifiée"}`
      }
    })

    // Créer une dépense d'annulation (montant négatif pour compenser)
    const cancellationExpense = await prisma.expense.create({
      data: {
        description: `Annulation paiement prestataire - ${payment.provider.name}`,
        amount: -payment.amount, // Montant négatif pour compenser
        category: "Annulation paiement",
        type: "GENERAL",
        notes: reason,
        userId: session.user.id,
        ...(payment.projectProvider?.projectId && { projectId: payment.projectProvider.projectId })
      }
    })

    // Créer une notification
    await createNotification({
      userId: session.user.id,
      title: "Paiement prestataire annulé",
      message: `Le paiement de ${payment.amount} XOF à ${payment.provider.name} a été annulé`,
      type: "PROVIDER_PAYMENT_FAILED",
      relatedType: "provider",
      relatedId: payment.providerId,
      actionUrl: `/providers/${payment.providerId}`,
      metadata: {
        amount: payment.amount,
        currency: "XOF",
        providerName: payment.provider.name,
        reason: reason,
        originalPaymentId: paymentId
      }
    })

    return NextResponse.json({
      success: true,
      cancelledPayment,
      cancellationExpense,
      message: "Paiement annulé avec succès"
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Données invalides", errors: error.errors },
        { status: 400 }
      )
    }

    console.error("Erreur lors de l'annulation du paiement:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 