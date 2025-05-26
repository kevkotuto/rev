import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const activitySchema = z.object({
  type: z.enum(["PROJECT_CREATED", "PROJECT_UPDATED", "PROJECT_COMPLETED", "TASK_CREATED", "TASK_UPDATED", "TASK_COMPLETED", "INVOICE_CREATED", "INVOICE_SENT", "CLIENT_ADDED", "FILE_UPLOADED"]),
  description: z.string().min(1, "La description est requise"),
  metadata: z.record(z.any()).optional(),
  projectId: z.string().optional(),
  taskId: z.string().optional(),
  clientId: z.string().optional(),
  invoiceId: z.string().optional()
})

// GET - Récupérer les activités de l'utilisateur
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Non autorisé" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const projectId = searchParams.get('projectId')
    const taskId = searchParams.get('taskId')
    const clientId = searchParams.get('clientId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {
      userId: session.user.id
    }

    if (type) {
      where.type = type
    }

    if (projectId) {
      where.projectId = projectId
    }

    if (taskId) {
      where.taskId = taskId
    }

    if (clientId) {
      where.clientId = clientId
    }

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    const [activities, totalCount] = await Promise.all([
      prisma.activity.findMany({
        where,
        include: {
          project: {
            select: {
              id: true,
              name: true,
              color: true
            }
          },
          task: {
            select: {
              id: true,
              title: true,
              status: true
            }
          },
          client: {
            select: {
              id: true,
              name: true,
              company: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.activity.count({ where })
    ])

    // Regrouper les activités par date
    const activitiesByDate = activities.reduce((acc, activity) => {
      const date = activity.createdAt.toISOString().split('T')[0]
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(activity)
      return acc
    }, {} as Record<string, typeof activities>)

    // Statistiques sur les types d'activités
    const activityStats = await prisma.activity.groupBy({
      by: ['type'],
      where: {
        userId: session.user.id,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 derniers jours
        }
      },
      _count: {
        type: true
      }
    })

    return NextResponse.json({
      activities,
      activitiesByDate,
      activityStats,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: totalCount > offset + limit
      }
    })
  } catch (error) {
    console.error("Erreur récupération activités:", error)
    return NextResponse.json(
      { message: "Erreur lors de la récupération des activités" },
      { status: 500 }
    )
  }
}

// POST - Créer une nouvelle activité (log automatique)
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
    const validatedData = activitySchema.parse(body)

    // Vérifier que les IDs référencés existent et appartiennent à l'utilisateur
    if (validatedData.projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: validatedData.projectId,
          userId: session.user.id
        }
      })
      
      if (!project) {
        return NextResponse.json(
          { message: "Projet non trouvé" },
          { status: 404 }
        )
      }
    }

    if (validatedData.taskId) {
      const task = await prisma.task.findFirst({
        where: {
          id: validatedData.taskId,
          project: {
            userId: session.user.id
          }
        }
      })
      
      if (!task) {
        return NextResponse.json(
          { message: "Tâche non trouvée" },
          { status: 404 }
        )
      }
    }

    if (validatedData.clientId) {
      const client = await prisma.client.findFirst({
        where: {
          id: validatedData.clientId,
          userId: session.user.id
        }
      })
      
      if (!client) {
        return NextResponse.json(
          { message: "Client non trouvé" },
          { status: 404 }
        )
      }
    }

    const activity = await prisma.activity.create({
      data: {
        type: validatedData.type,
        description: validatedData.description,
        metadata: validatedData.metadata,
        projectId: validatedData.projectId,
        taskId: validatedData.taskId,
        clientId: validatedData.clientId,
        invoiceId: validatedData.invoiceId,
        userId: session.user.id
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        task: {
          select: {
            id: true,
            title: true,
            status: true
          }
        },
        client: {
          select: {
            id: true,
            name: true,
            company: true
          }
        }
      }
    })

    return NextResponse.json(activity, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Données invalides", errors: error.errors },
        { status: 400 }
      )
    }

    console.error("Erreur création activité:", error)
    return NextResponse.json(
      { message: "Erreur lors de la création de l'activité" },
      { status: 500 }
    )
  }
}

// DELETE - Nettoyer les anciennes activités
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Non autorisé" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const olderThanDays = parseInt(searchParams.get('olderThanDays') || '90')

    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000)

    const result = await prisma.activity.deleteMany({
      where: {
        userId: session.user.id,
        createdAt: {
          lt: cutoffDate
        }
      }
    })

    return NextResponse.json({
      message: `${result.count} activité(s) supprimée(s)`,
      count: result.count,
      cutoffDate
    })
  } catch (error) {
    console.error("Erreur nettoyage activités:", error)
    return NextResponse.json(
      { message: "Erreur lors du nettoyage des activités" },
      { status: 500 }
    )
  }
}

// Fonction utilitaire pour créer une activité automatiquement
export async function createActivity(
  userId: string,
  type: string,
  description: string,
  metadata?: Record<string, any>,
  projectId?: string,
  taskId?: string,
  clientId?: string,
  invoiceId?: string
) {
  try {
    return await prisma.activity.create({
      data: {
        type,
        description,
        metadata,
        projectId,
        taskId,
        clientId,
        invoiceId,
        userId
      }
    })
  } catch (error) {
    console.error("Erreur création activité automatique:", error)
    return null
  }
} 