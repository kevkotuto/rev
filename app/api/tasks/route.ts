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
  projectId: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
})

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
    const projectId = searchParams.get('projectId')
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const limit = searchParams.get('limit')

    // Construire les filtres
    const where: any = {
      userId: session.user.id
    }

    if (projectId && projectId !== 'all') {
      where.projectId = projectId
    }

    if (status && status !== 'all') {
      // Si le statut contient des virgules, c'est une liste de statuts
      if (status.includes(',')) {
        where.status = {
          in: status.split(',').map(s => s.trim())
        }
      } else {
        where.status = status
      }
    }

    if (priority && priority !== 'all') {
      where.priority = priority
    }

    // Récupérer les tâches avec pagination optionnelle
    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        },
        parent: {
          select: {
            id: true,
            title: true
          }
        },
        _count: {
          select: {
            subtasks: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' }
      ],
      take: limit ? parseInt(limit) : undefined
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error("Erreur lors de la récupération des tâches:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

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
    const validatedData = taskSchema.parse(body)

    // Si projectId est fourni, vérifier que le projet appartient à l'utilisateur
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

    // Si parentId est fourni, vérifier que la tâche parent existe
    if (validatedData.parentId) {
      const parentTask = await prisma.task.findFirst({
        where: {
          id: validatedData.parentId,
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

    // Construire les données en omettant les champs non définis
    const taskData: any = {
      title: validatedData.title,
      description: validatedData.description,
      status: validatedData.status,
      priority: validatedData.priority,
      userId: session.user.id,
      dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null
    }

    // Ajouter projectId seulement s'il est défini et différent de "none"
    if (validatedData.projectId && validatedData.projectId !== "none") {
      taskData.projectId = validatedData.projectId
    }

    // Ajouter parentId seulement s'il est défini
    if (validatedData.parentId) {
      taskData.parentId = validatedData.parentId
    }

    const task = await prisma.task.create({
      data: taskData,
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        },
        parent: {
          select: {
            id: true,
            title: true
          }
        },
        _count: {
          select: {
            subtasks: true
          }
        }
      }
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Données invalides", errors: error.errors },
        { status: 400 }
      )
    }

    console.error("Erreur lors de la création de la tâche:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 