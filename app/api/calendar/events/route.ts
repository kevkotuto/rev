import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const eventSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  description: z.string().optional(),
  type: z.enum(["MEETING", "DEADLINE", "REMINDER", "CALL", "PRESENTATION", "DELIVERY", "MAINTENANCE"]),
  startDate: z.string(),
  endDate: z.string().optional(),
  isAllDay: z.boolean().default(false),
  location: z.string().optional(),
  url: z.string().optional(),
  projectId: z.string().optional(),
  clientId: z.string().optional(),
  taskId: z.string().optional(),
  reminders: z.array(z.object({
    minutesBefore: z.number().min(0),
    type: z.enum(["EMAIL", "SMS", "NOTIFICATION"])
  })).optional()
})

// GET - Récupérer les événements
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
    const type = searchParams.get('type')
    const projectId = searchParams.get('projectId')

    const where: any = {
      userId: session.user.id
    }

    // Filtres optionnels
    if (startDate && endDate) {
      where.startDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    if (type) {
      where.type = type
    }

    if (projectId) {
      where.projectId = projectId
    }

    const events = await prisma.event.findMany({
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
        client: {
          select: {
            id: true,
            name: true
          }
        },
        task: {
          select: {
            id: true,
            title: true,
            status: true
          }
        },
        reminders: true
      },
      orderBy: { startDate: 'asc' }
    })

    return NextResponse.json(events)
  } catch (error) {
    console.error("Erreur récupération événements:", error)
    return NextResponse.json(
      { message: "Erreur lors de la récupération des événements" },
      { status: 500 }
    )
  }
}

// POST - Créer un nouvel événement
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
    const validatedData = eventSchema.parse(body)

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

    if (validatedData.clientId) {
      const client = await prisma.client.findFirst({
        where: { id: validatedData.clientId, userId: session.user.id }
      })
      if (!client) {
        return NextResponse.json(
          { message: "Client non trouvé" },
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

    // Créer l'événement avec les rappels
    const event = await prisma.event.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        type: validatedData.type,
        startDate: new Date(validatedData.startDate),
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
        isAllDay: validatedData.isAllDay,
        location: validatedData.location,
        url: validatedData.url,
        projectId: validatedData.projectId,
        clientId: validatedData.clientId,
        taskId: validatedData.taskId,
        userId: session.user.id,
        reminders: validatedData.reminders ? {
          create: validatedData.reminders.map(reminder => ({
            minutesBefore: reminder.minutesBefore,
            type: reminder.type
          }))
        } : undefined
      },
      include: {
        project: {
          select: {
            name: true,
            client: { select: { name: true } }
          }
        },
        client: { select: { name: true } },
        task: { select: { title: true } },
        reminders: true
      }
    })

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Données invalides", errors: error.errors },
        { status: 400 }
      )
    }

    console.error("Erreur création événement:", error)
    return NextResponse.json(
      { message: "Erreur lors de la création de l'événement" },
      { status: 500 }
    )
  }
} 