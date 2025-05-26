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

const serviceSchema = z.object({
  name: z.string().min(1, "Le nom du service est requis"),
  description: z.string().optional(),
  amount: z.number().positive("Le montant doit être positif"),
  quantity: z.number().positive("La quantité doit être positive").default(1),
  unit: z.string().optional()
})

// GET - Récupérer les services d'un projet
export async function GET(
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

    const services = await prisma.projectService.findMany({
      where: {
        projectId: params.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(services)
  } catch (error) {
    console.error("Erreur lors de la récupération des services:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

// POST - Ajouter un service au projet
export async function POST(
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
    const validatedData = serviceSchema.parse(body)

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

    const service = await prisma.projectService.create({
      data: {
        projectId: params.id,
        name: validatedData.name,
        description: validatedData.description,
        amount: validatedData.amount,
        quantity: validatedData.quantity,
        unit: validatedData.unit
      }
    })

    // Recalculer et mettre à jour le budget du projet
    await updateProjectBudget(params.id)

    return NextResponse.json(service, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Données invalides", errors: error.errors },
        { status: 400 }
      )
    }

    console.error("Erreur lors de la création du service:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 