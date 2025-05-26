import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const timeEntrySchema = z.object({
  description: z.string().optional(),
  startTime: z.string(),
  endTime: z.string().optional(),
  projectId: z.string().optional(),
  taskId: z.string().optional(),
  isRunning: z.boolean().default(false)
})

const timeEntryUpdateSchema = z.object({
  description: z.string().optional(),
  endTime: z.string().optional(),
  isRunning: z.boolean().optional()
})

// GET - Récupérer les entrées de temps
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
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const projectId = searchParams.get('projectId')
    const taskId = searchParams.get('taskId')
    const isRunning = searchParams.get('isRunning')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {
      userId: session.user.id
    }

    // Filtres optionnels
    if (startDate && endDate) {
      where.startTime = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    if (projectId) {
      where.projectId = projectId
    }

    if (taskId) {
      where.taskId = taskId
    }

    if (isRunning !== null) {
      where.isRunning = isRunning === 'true'
    }

    const timeEntries = await prisma.timeEntry.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            client: {
              select: { name: true }
            }
          }
        },
        task: {
          select: {
            id: true,
            title: true,
            status: true
          }
        }
      },
      orderBy: { startTime: 'desc' },
      take: limit
    })

    // Calculer les totaux
    const totalMinutes = timeEntries.reduce((total, entry) => {
      return total + (entry.duration || 0)
    }, 0)

    const summary = {
      totalEntries: timeEntries.length,
      totalMinutes,
      totalHours: Math.round((totalMinutes / 60) * 100) / 100,
      runningEntries: timeEntries.filter(entry => entry.isRunning).length
    }

    return NextResponse.json({
      timeEntries,
      summary
    })
  } catch (error) {
    console.error("Erreur récupération temps:", error)
    return NextResponse.json(
      { message: "Erreur lors de la récupération des entrées de temps" },
      { status: 500 }
    )
  }
}

// POST - Créer une nouvelle entrée de temps
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
    const validatedData = timeEntrySchema.parse(body)

    // Vérifications des relations
    if (validatedData.projectId) {
      const project = await prisma.project.findFirst({
        where: { id: validatedData.projectId, userId: session.user.id }
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
        where: { id: validatedData.taskId, userId: session.user.id }
      })
      if (!task) {
        return NextResponse.json(
          { message: "Tâche non trouvée" },
          { status: 404 }
        )
      }
    }

    // Si on démarre un nouveau timer, arrêter les autres timers en cours
    if (validatedData.isRunning) {
      await prisma.timeEntry.updateMany({
        where: {
          userId: session.user.id,
          isRunning: true
        },
        data: {
          isRunning: false,
          endTime: new Date(),
          duration: {
            // Note: Prisma ne supporte pas le calcul direct, on le fera en JavaScript
          }
        }
      })

      // Récupérer et mettre à jour les durées des entrées arrêtées
      const runningEntries = await prisma.timeEntry.findMany({
        where: {
          userId: session.user.id,
          endTime: { not: null },
          duration: null
        }
      })

      for (const entry of runningEntries) {
        if (entry.endTime) {
          const duration = Math.round((entry.endTime.getTime() - entry.startTime.getTime()) / (1000 * 60))
          await prisma.timeEntry.update({
            where: { id: entry.id },
            data: { duration }
          })
        }
      }
    }

    // Calculer la durée si on a une heure de fin
    let duration: number | null = null
    if (validatedData.endTime && !validatedData.isRunning) {
      const startTime = new Date(validatedData.startTime)
      const endTime = new Date(validatedData.endTime)
      duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))
    }

    const timeEntry = await prisma.timeEntry.create({
      data: {
        description: validatedData.description,
        startTime: new Date(validatedData.startTime),
        endTime: validatedData.endTime ? new Date(validatedData.endTime) : null,
        duration,
        isRunning: validatedData.isRunning,
        projectId: validatedData.projectId,
        taskId: validatedData.taskId,
        userId: session.user.id
      },
      include: {
        project: {
          select: {
            name: true,
            client: { select: { name: true } }
          }
        },
        task: { select: { title: true } }
      }
    })

    return NextResponse.json(timeEntry, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Données invalides", errors: error.errors },
        { status: 400 }
      )
    }

    console.error("Erreur création entrée temps:", error)
    return NextResponse.json(
      { message: "Erreur lors de la création de l'entrée de temps" },
      { status: 500 }
    )
  }
}

// PUT - Mettre à jour une entrée de temps (surtout pour arrêter le timer)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Non autorisé" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const entryId = searchParams.get('id')

    if (!entryId) {
      return NextResponse.json(
        { message: "ID de l'entrée requis" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = timeEntryUpdateSchema.parse(body)

    // Vérifier que l'entrée existe et appartient à l'utilisateur
    const existingEntry = await prisma.timeEntry.findFirst({
      where: {
        id: entryId,
        userId: session.user.id
      }
    })

    if (!existingEntry) {
      return NextResponse.json(
        { message: "Entrée de temps non trouvée" },
        { status: 404 }
      )
    }

    // Préparer les données de mise à jour
    const updateData: any = {}

    if (validatedData.description !== undefined) {
      updateData.description = validatedData.description
    }

    if (validatedData.endTime !== undefined) {
      updateData.endTime = new Date(validatedData.endTime)
      // Calculer la durée
      const duration = Math.round((updateData.endTime.getTime() - existingEntry.startTime.getTime()) / (1000 * 60))
      updateData.duration = duration
    }

    if (validatedData.isRunning !== undefined) {
      updateData.isRunning = validatedData.isRunning
      
      // Si on arrête le timer, définir l'heure de fin maintenant
      if (!validatedData.isRunning && existingEntry.isRunning) {
        updateData.endTime = new Date()
        const duration = Math.round((updateData.endTime.getTime() - existingEntry.startTime.getTime()) / (1000 * 60))
        updateData.duration = duration
      }
    }

    const updatedEntry = await prisma.timeEntry.update({
      where: { id: entryId },
      data: updateData,
      include: {
        project: {
          select: {
            name: true,
            client: { select: { name: true } }
          }
        },
        task: { select: { title: true } }
      }
    })

    return NextResponse.json(updatedEntry)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Données invalides", errors: error.errors },
        { status: 400 }
      )
    }

    console.error("Erreur mise à jour entrée temps:", error)
    return NextResponse.json(
      { message: "Erreur lors de la mise à jour de l'entrée de temps" },
      { status: 500 }
    )
  }
} 