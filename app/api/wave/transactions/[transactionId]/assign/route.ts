import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"
import { z } from "zod"

const assignmentSchema = z.object({
  type: z.enum(["revenue", "expense"]),
  description: z.string().min(1, "La description est requise"),
  notes: z.string().optional(),
  projectId: z.string().optional(),
  clientId: z.string().optional(),
  providerId: z.string().optional(),
  category: z.string().optional(),
  waveTransactionData: z.object({
    transaction_id: z.string(),
    amount: z.string(),
    fee: z.string(),
    currency: z.string(),
    timestamp: z.string(),
    counterparty_name: z.string().optional(),
    counterparty_mobile: z.string().optional(),
    payment_reason: z.string().optional()
  })
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Non autorisé" },
        { status: 401 }
      )
    }

    const { transactionId } = await params
    const body = await request.json()
    const validatedData = assignmentSchema.parse(body)

    // Vérifier si la transaction n'est pas déjà assignée
    const existingAssignment = await prisma.waveTransactionAssignment.findUnique({
      where: {
        userId_transactionId: {
          userId: session.user.id,
          transactionId: transactionId
        }
      }
    })

    if (existingAssignment) {
      return NextResponse.json(
        { message: "Cette transaction est déjà assignée" },
        { status: 400 }
      )
    }

    let localRecord = null

    if (validatedData.type === "revenue") {
      // Créer une facture ou un revenu
      localRecord = await prisma.invoice.create({
        data: {
          invoiceNumber: `WAVE-${transactionId}`,
          amount: parseFloat(validatedData.waveTransactionData.amount),
          status: "PAID",
          notes: validatedData.notes,
          paidDate: new Date(validatedData.waveTransactionData.timestamp),
          userId: session.user.id,
          ...(validatedData.clientId && { clientId: validatedData.clientId }),
          ...(validatedData.projectId && { projectId: validatedData.projectId })
        }
      })
    } else {
      // Créer une dépense
      localRecord = await prisma.expense.create({
        data: {
          description: validatedData.description,
          amount: Math.abs(parseFloat(validatedData.waveTransactionData.amount)),
          category: validatedData.category || "Paiement Wave",
          type: "GENERAL",
          notes: validatedData.notes,
          userId: session.user.id,
          ...(validatedData.projectId && { projectId: validatedData.projectId })
        }
      })
    }

    // Créer l'assignation Wave
    const assignment = await prisma.waveTransactionAssignment.create({
      data: {
        transactionId: transactionId,
        type: validatedData.type,
        description: validatedData.description,
        amount: parseFloat(validatedData.waveTransactionData.amount),
        fee: parseFloat(validatedData.waveTransactionData.fee),
        currency: validatedData.waveTransactionData.currency,
        timestamp: new Date(validatedData.waveTransactionData.timestamp),
        counterpartyName: validatedData.waveTransactionData.counterparty_name,
        counterpartyMobile: validatedData.waveTransactionData.counterparty_mobile,
        notes: validatedData.notes,
        waveData: validatedData.waveTransactionData,
        userId: session.user.id,
        ...(validatedData.type === "revenue" && localRecord && { invoiceId: localRecord.id }),
        ...(validatedData.type === "expense" && localRecord && { expenseId: localRecord.id }),
        ...(validatedData.projectId && { projectId: validatedData.projectId }),
        ...(validatedData.clientId && { clientId: validatedData.clientId }),
        ...(validatedData.providerId && { providerId: validatedData.providerId })
      }
    })

    // Créer une notification
    const notificationType = validatedData.type === "revenue" ? "INVOICE_PAID" : "SUCCESS"
    const title = validatedData.type === "revenue" 
      ? "Transaction assignée comme revenu"
      : "Transaction assignée comme dépense"

    await createNotification({
      userId: session.user.id,
      title,
      message: `Transaction ${transactionId} assignée : ${validatedData.description}`,
      type: notificationType,
      relatedType: "wave_transaction",
      relatedId: transactionId,
      actionUrl: "/wave-transactions",
      metadata: {
        amount: parseFloat(validatedData.waveTransactionData.amount),
        currency: validatedData.waveTransactionData.currency,
        type: validatedData.type,
        transactionId: transactionId
      }
    })

    return NextResponse.json({
      success: true,
      assignment,
      localRecord,
      message: "Transaction assignée avec succès"
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Données invalides", errors: error.errors },
        { status: 400 }
      )
    }

    console.error("Erreur lors de l'assignation:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Non autorisé" },
        { status: 401 }
      )
    }

    const { transactionId } = await params

    // Récupérer l'assignation
    const assignment = await prisma.waveTransactionAssignment.findUnique({
      where: {
        userId_transactionId: {
          userId: session.user.id,
          transactionId: transactionId
        }
      }
    })

    if (!assignment) {
      return NextResponse.json(
        { message: "Assignation non trouvée" },
        { status: 404 }
      )
    }

    // Supprimer l'assignation
    await prisma.waveTransactionAssignment.delete({
      where: {
        userId_transactionId: {
          userId: session.user.id,
          transactionId: transactionId
        }
      }
    })

    // Créer une notification
    await createNotification({
      userId: session.user.id,
      title: "Assignation supprimée",
      message: `L'assignation de la transaction ${transactionId} a été supprimée`,
      type: "INFO",
      relatedType: "wave_transaction",
      relatedId: transactionId,
      actionUrl: "/wave-transactions",
      metadata: {
        transactionId: transactionId,
        action: "unassigned"
      }
    })

    return NextResponse.json({
      success: true,
      message: "Assignation supprimée avec succès"
    })

  } catch (error) {
    console.error("Erreur lors de la suppression de l'assignation:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 