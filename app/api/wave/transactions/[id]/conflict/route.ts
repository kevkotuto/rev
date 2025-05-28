import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
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

    // Récupérer les détails complets des clients et prestataires en conflit
    const [conflictClients, conflictProviders] = await Promise.all([
      conflictData.clients ? 
        prisma.client.findMany({
          where: {
            id: { in: conflictData.clients.map((c: any) => c.id) },
            userId: session.user.id
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            company: true
          }
        }) : [],
      conflictData.providers ? 
        prisma.provider.findMany({
          where: {
            id: { in: conflictData.providers.map((p: any) => p.id) },
            userId: session.user.id
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            company: true
          }
        }) : []
    ])

    return NextResponse.json({
      assignment: {
        id: assignment.id,
        transactionId: assignment.transactionId,
        amount: assignment.amount,
        currency: assignment.currency,
        timestamp: assignment.timestamp,
        description: assignment.description,
        counterpartyMobile: assignment.counterpartyMobile
      },
      conflict: {
        senderMobile: conflictData.senderMobile,
        clients: conflictClients,
        providers: conflictProviders,
        needsResolution: true
      }
    })

  } catch (error) {
    console.error("Erreur lors de la récupération du conflit:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 