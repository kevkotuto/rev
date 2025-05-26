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

const taskUpdateSchema = z.object({
  title: z.string().min(1, "Le titre est requis").optional(),
  description: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "REVIEW", "DONE", "CANCELLED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dueDate: z.string().nullable().optional(),
  projectId: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
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

    const task = await prisma.task.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      },
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
        subtasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true
          }
        },
        _count: {
          select: {
            subtasks: true
          }
        }
      }
    })

    if (!task) {
      return NextResponse.json(
        { message: "Tâche non trouvée" },
        { status: 404 }
      )
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error("Erreur lors de la récupération de la tâche:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

export async function PUT(
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

    const body = await request.json()
    const validatedData = taskUpdateSchema.parse(body)

    // Vérifier que la tâche existe et appartient à l'utilisateur
    const existingTask = await prisma.task.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })

    if (!existingTask) {
      return NextResponse.json(
        { message: "Tâche non trouvée" },
        { status: 404 }
      )
    }

    // Si projectId est fourni, vérifier que le projet appartient à l'utilisateur
    if (validatedData.projectId && validatedData.projectId !== "none") {
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

    // Construire les données de mise à jour
    const updateData: any = {}

    if (validatedData.title !== undefined) {
      updateData.title = validatedData.title
    }
    
    if (validatedData.description !== undefined) {
      updateData.description = validatedData.description
    }
    
    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status
    }
    
    if (validatedData.priority !== undefined) {
      updateData.priority = validatedData.priority
    }
    
    if (validatedData.dueDate !== undefined) {
      updateData.dueDate = validatedData.dueDate ? new Date(validatedData.dueDate) : null
    }

    if (validatedData.projectId !== undefined) {
      updateData.projectId = (validatedData.projectId === "none" || !validatedData.projectId) ? null : validatedData.projectId
    }
    
    if (validatedData.parentId !== undefined) {
      updateData.parentId = validatedData.parentId || null
    }

    const updatedTask = await prisma.task.update({
      where: { id: params.id },
      data: updateData,
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

    return NextResponse.json(updatedTask)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Données invalides", errors: error.errors },
        { status: 400 }
      )
    }

    console.error("Erreur lors de la mise à jour de la tâche:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Vérifier que la tâche existe et appartient à l'utilisateur
    const existingTask = await prisma.task.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      },
      include: {
        _count: {
          select: {
            subtasks: true
          }
        }
      }
    })

    if (!existingTask) {
      return NextResponse.json(
        { message: "Tâche non trouvée" },
        { status: 404 }
      )
    }

    // Vérifier s'il y a des sous-tâches
    if (existingTask._count.subtasks > 0) {
      return NextResponse.json(
        { message: "Impossible de supprimer une tâche qui a des sous-tâches" },
        { status: 400 }
      )
    }

    await prisma.task.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: "Tâche supprimée avec succès" })
  } catch (error) {
    console.error("Erreur lors de la suppression de la tâche:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 