import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Fonction helper pour mettre à jour le budget du projet
async function updateProjectBudget(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { services: true }
  })
  
  if (project) {
    const servicesTotal = project.services.reduce((sum, service) => {
      return sum + (service.amount * service.quantity)
    }, 0)
    
    await prisma.project.update({
      where: { id: projectId },
      data: { amount: servicesTotal }
    })
  }
}

const updateServiceSchema = z.object({
  name: z.string().min(1, "Le nom du service est requis").optional(),
  description: z.string().optional(),
  amount: z.number().positive("Le montant doit être positif").optional(),
  quantity: z.number().positive("La quantité doit être positive").optional(),
  unit: z.string().optional()
})

// PUT - Mettre à jour un service
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Non autorisé" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = updateServiceSchema.parse(body)

    // Vérifier que le service existe et appartient à l'utilisateur
    const service = await prisma.projectService.findFirst({
      where: {
        id: params.id,
        project: {
          userId: session.user.id
        }
      }
    })

    if (!service) {
      return NextResponse.json(
        { message: "Service non trouvé" },
        { status: 404 }
      )
    }

    const updatedService = await prisma.projectService.update({
      where: { id: params.id },
      data: validatedData
    })

    // Recalculer le budget du projet
    await updateProjectBudget(service.projectId)

    return NextResponse.json(updatedService)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Données invalides", errors: error.errors },
        { status: 400 }
      )
    }

    console.error("Erreur lors de la mise à jour du service:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer un service
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Non autorisé" },
        { status: 401 }
      )
    }

    // Vérifier que le service existe et appartient à l'utilisateur
    const service = await prisma.projectService.findFirst({
      where: {
        id: params.id,
        project: {
          userId: session.user.id
        }
      }
    })

    if (!service) {
      return NextResponse.json(
        { message: "Service non trouvé" },
        { status: 404 }
      )
    }

    await prisma.projectService.delete({
      where: { id: params.id }
    })

    // Recalculer le budget du projet
    await updateProjectBudget(service.projectId)

    return NextResponse.json({ message: "Service supprimé avec succès" })
  } catch (error) {
    console.error("Erreur lors de la suppression du service:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 