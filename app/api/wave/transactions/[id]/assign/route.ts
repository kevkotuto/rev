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
  invoiceId: z.string().optional(),
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

    const { id: transactionId } = await params
    const body = await request.json()
    const validatedData = assignmentSchema.parse(body)

    // Vérifier si la transaction n'est pas déjà assignée
    const existingAssignment = await prisma.waveTransactionAssignment.findUnique({
      where: {
        userId_transactionId: {
          userId: session.user.id,
          transactionId: transactionId
        }
      },
      include: {
        client: true,
        provider: true,
        project: true
      }
    })

    // Log pour debug
    console.log(`[DEBUG] Vérification assignation pour transaction ${transactionId}:`, {
      existingAssignment: existingAssignment ? {
        id: existingAssignment.id,
        type: existingAssignment.type,
        description: existingAssignment.description,
        hasClient: !!existingAssignment.client,
        hasProvider: !!existingAssignment.provider,
        hasProject: !!existingAssignment.project
      } : null
    })

    if (existingAssignment) {
      // Vérifier si c'est une assignation automatique basique qu'on peut remplacer
      const isBasicAssignment = !existingAssignment.clientId && !existingAssignment.providerId
      const hasConflict = existingAssignment.waveData && 
                          (existingAssignment.waveData as any)?.conflict?.needsResolution
      
      if (isBasicAssignment && !hasConflict) {
        // C'est une assignation basique sans client/prestataire, on peut la remplacer
        console.log(`[DEBUG] Remplacement d'une assignation basique pour ${transactionId}`)
        
        // Supprimer l'ancienne assignation basique
        await prisma.waveTransactionAssignment.delete({
          where: { id: existingAssignment.id }
        })
      } else {
        return NextResponse.json(
          { 
            message: "Cette transaction est déjà assignée", 
            details: {
              type: existingAssignment.type,
              description: existingAssignment.description,
              hasClient: !!existingAssignment.client,
              hasProvider: !!existingAssignment.provider,
              hasConflict: hasConflict
            }
          },
          { status: 400 }
        )
      }
    }

    let localRecord = null

    if (validatedData.type === "revenue") {
      // Si une facture existante est spécifiée, l'utiliser
      if (validatedData.invoiceId) {
        // Vérifier que la facture existe et appartient à l'utilisateur
        const existingInvoice = await prisma.invoice.findFirst({
          where: {
            id: validatedData.invoiceId,
            userId: session.user.id,
            status: 'PENDING' // Seulement les factures en attente
          }
        })

        if (!existingInvoice) {
          return NextResponse.json(
            { message: "Facture non trouvée ou déjà payée" },
            { status: 404 }
          )
        }

        // Vérifier que le montant de la transaction correspond (avec une tolérance de 10%)
        const transactionAmount = Math.abs(parseFloat(validatedData.waveTransactionData.amount))
        const invoiceAmount = existingInvoice.amount
        const tolerance = invoiceAmount * 0.1 // 10% de tolérance

        if (transactionAmount < (invoiceAmount - tolerance) || transactionAmount > (invoiceAmount + tolerance)) {
          return NextResponse.json(
            { 
              message: `Le montant de la transaction (${transactionAmount} XOF) ne correspond pas au montant de la facture (${invoiceAmount} XOF)`,
              details: {
                transactionAmount,
                invoiceAmount,
                tolerance
              }
            },
            { status: 400 }
          )
        }

        // Marquer la facture comme payée
        localRecord = await prisma.invoice.update({
          where: { id: validatedData.invoiceId },
          data: {
            status: "PAID",
            paidDate: new Date(validatedData.waveTransactionData.timestamp),
            notes: existingInvoice.notes 
              ? `${existingInvoice.notes}\n\nPayé via Wave - Transaction: ${transactionId}`
              : `Payé via Wave - Transaction: ${transactionId}`
          }
        })
      } else {
        // Récupérer les informations du client si un clientId est fourni
        let clientInfo = null
        if (validatedData.clientId) {
          clientInfo = await prisma.client.findUnique({
            where: { id: validatedData.clientId }
          })
        }

        // Créer une nouvelle facture
        localRecord = await prisma.invoice.create({
          data: {
            invoiceNumber: `WAVE-${transactionId}`,
            amount: parseFloat(validatedData.waveTransactionData.amount),
            status: "PAID",
            notes: validatedData.notes,
            paidDate: new Date(validatedData.waveTransactionData.timestamp),
            userId: session.user.id,
            // Utiliser les informations client directement dans la facture
            clientName: clientInfo?.name || validatedData.waveTransactionData.counterparty_name,
            clientEmail: clientInfo?.email,
            clientPhone: clientInfo?.phone || validatedData.waveTransactionData.counterparty_mobile,
            clientAddress: clientInfo?.address,
            ...(validatedData.projectId && { projectId: validatedData.projectId })
          }
        })
      }
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
        ...(validatedData.providerId && { providerId: validatedData.providerId }),
        ...(validatedData.invoiceId && { invoiceId: validatedData.invoiceId })
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

    const { id: transactionId } = await params

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