import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Non autorisé" },
        { status: 401 }
      )
    }

    // Récupérer toutes les assignations Wave récentes
    const allAssignments = await prisma.waveTransactionAssignment.findMany({
      where: {
        userId: session.user.id
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        },
        provider: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        },
        project: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 100 // Limiter pour la performance
    })

    // Filtrer les assignations avec conflit non résolu
    const conflictAssignments = allAssignments.filter(assignment => {
      const waveData = assignment.waveData as any
      return waveData?.conflict?.needsResolution === true
    })

    // Enrichir les données avec les détails du conflit
    const conflictsWithDetails = await Promise.all(
      conflictAssignments.map(async (assignment) => {
        const waveData = assignment.waveData as any
        const conflictData = waveData?.conflict
        
        if (!conflictData?.needsResolution) {
          return null // Ignorer les assignations sans conflit
        }
        
        // Récupérer les détails complets des entités en conflit
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

        return {
          id: assignment.id,
          transactionId: assignment.transactionId,
          amount: assignment.amount,
          currency: assignment.currency,
          timestamp: assignment.timestamp,
          description: assignment.description,
          counterpartyMobile: assignment.counterpartyMobile,
          counterpartyName: assignment.counterpartyName,
          conflict: {
            senderMobile: conflictData.senderMobile,
            clients: conflictClients,
            providers: conflictProviders,
            totalOptions: conflictClients.length + conflictProviders.length
          }
        }
      })
    )

    // Filtrer les valeurs null
    const validConflicts = conflictsWithDetails.filter(c => c !== null)

    return NextResponse.json({
      conflicts: validConflicts,
      total: validConflicts.length,
      message: validConflicts.length > 0 
        ? `${validConflicts.length} transaction(s) en conflit trouvée(s)`
        : "Aucune transaction en conflit"
    })

  } catch (error) {
    console.error("Erreur lors de la récupération des conflits:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 