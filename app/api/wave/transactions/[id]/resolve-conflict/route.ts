import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"
import { z } from "zod"

const resolveConflictSchema = z.object({
  clientId: z.string().optional(),
  providerId: z.string().optional(),
  type: z.enum(['revenue', 'expense']),
  description: z.string(),
  projectId: z.string().optional()
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

    const { id: assignmentId } = await params
    const body = await request.json()
    const validatedData = resolveConflictSchema.parse(body)

    // Récupérer l'assignation Wave avec le conflit
    const assignment = await prisma.waveTransactionAssignment.findUnique({
      where: {
        id: assignmentId,
        userId: session.user.id
      }
    })

    if (!assignment) {
      return NextResponse.json(
        { message: "Transaction non trouvée" },
        { status: 404 }
      )
    }

    // Vérifier qu'il y a bien un conflit à résoudre
    const waveData = assignment.waveData as any
    const conflictData = waveData?.conflict
    if (!conflictData?.needsResolution) {
      return NextResponse.json(
        { message: "Cette transaction n'a pas de conflit à résoudre" },
        { status: 400 }
      )
    }

    // Mettre à jour l'assignation avec la résolution du conflit
    const updatedAssignment = await prisma.waveTransactionAssignment.update({
      where: { id: assignmentId },
      data: {
        type: validatedData.type,
        description: validatedData.description,
        clientId: validatedData.clientId || null,
        providerId: validatedData.providerId || null,
        projectId: validatedData.projectId || null,
        waveData: {
          ...waveData,
          conflict: null // Supprimer les données de conflit
        },
        counterpartyName: validatedData.clientId 
          ? (await prisma.client.findUnique({ where: { id: validatedData.clientId } }))?.name
          : validatedData.providerId 
            ? (await prisma.provider.findUnique({ where: { id: validatedData.providerId } }))?.name
            : assignment.counterpartyName
      },
      include: {
        client: true,
        provider: true,
        project: true
      }
    })

    // Créer une notification de résolution
    const entityName = validatedData.clientId 
      ? (await prisma.client.findUnique({ where: { id: validatedData.clientId } }))?.name
      : validatedData.providerId 
        ? (await prisma.provider.findUnique({ where: { id: validatedData.providerId } }))?.name
        : 'entité inconnue'
    await createNotification({
      userId: session.user.id,
      title: "Conflit d'assignation résolu",
      message: `Transaction Wave assignée à ${entityName} - ${assignment.amount} ${assignment.currency}`,
      type: "SUCCESS",
      relatedType: "wave_transaction",
      relatedId: assignmentId,
      actionUrl: "/wave-transactions",
      metadata: {
        amount: assignment.amount,
        currency: assignment.currency,
        assignedTo: entityName,
        type: validatedData.type,
        resolved: true
      }
    })

    return NextResponse.json({
      success: true,
      assignment: updatedAssignment,
      message: "Conflit résolu avec succès"
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Données invalides", errors: error.errors },
        { status: 400 }
      )
    }

    console.error("Erreur lors de la résolution du conflit:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 