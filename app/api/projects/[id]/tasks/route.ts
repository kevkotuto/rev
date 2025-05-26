import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const taskSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  description: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "REVIEW", "DONE", "CANCELLED"]).default("TODO"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  dueDate: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Non autorisé" },
        { status: 401 }
      )
    }

    // Vérifier que le projet appartient à l'utilisateur
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })

    if (!project) {
      return NextResponse.json(
        { message: "Projet non trouvé" },
        { status: 404 }
      )
    }

    // Récupérer toutes les tâches du projet avec leurs sous-tâches
    const tasks = await prisma.task.findMany({
      where: {
        projectId: params.id,
        userId: session.user.id
      },
      include: {
        subtasks: {
          include: {
            subtasks: {
              include: {
                subtasks: true // Support jusqu'à 3 niveaux de sous-tâches
              }
            }
          }
        },
        parent: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: [
        { parentId: 'asc' },
        { createdAt: 'asc' }
      ]
    })

    // Organiser les tâches en hiérarchie
    const buildTaskHierarchy = (tasks: any[], parentId: string | null = null): any[] => {
      return tasks
        .filter(task => task.parentId === parentId)
        .map(task => ({
          ...task,
          subtasks: buildTaskHierarchy(tasks, task.id)
        }))
    }

    const hierarchicalTasks = buildTaskHierarchy(tasks)

    return NextResponse.json(hierarchicalTasks)
  } catch (error) {
    console.error("Erreur lors de la récupération des tâches:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Non autorisé" },
        { status: 401 }
      )
    }

    // Vérifier que le projet appartient à l'utilisateur
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })

    if (!project) {
      return NextResponse.json(
        { message: "Projet non trouvé" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validatedData = taskSchema.parse(body)

    // Si parentId est fourni, vérifier que la tâche parent existe et appartient au même projet
    if (validatedData.parentId) {
      const parentTask = await prisma.task.findFirst({
        where: {
          id: validatedData.parentId,
          projectId: params.id,
          userId: session.user.id
        }
      })

      if (!parentTask) {
        return NextResponse.json(
          { message: "Tâche parent non trouvée" },
          { status: 404 }
        )
      }
    }

    const task = await prisma.task.create({
      data: {
        ...validatedData,
        projectId: params.id,
        userId: session.user.id,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
        parentId: validatedData.parentId || null
      },
      include: {
        subtasks: {
          include: {
            subtasks: true
          }
        },
        parent: {
          select: {
            id: true,
            title: true
          }
        },
        project: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json(task)
  } catch (error) {
    console.error("Erreur lors de la création de la tâche:", error)
    return NextResponse.json(
      { message: "Erreur lors de la création de la tâche" },
      { status: 500 }
    )
  }
} 