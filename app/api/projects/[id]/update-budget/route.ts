import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST - Recalculer le budget du projet basé sur les services
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

    // Vérifier que le projet appartient à l'utilisateur
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      },
      include: {
        services: true
      }
    })

    if (!project) {
      return NextResponse.json(
        { message: "Projet non trouvé" },
        { status: 404 }
      )
    }

    // Calculer le total des services
    const servicesTotal = project.services.reduce((sum, service) => {
      return sum + (service.amount * service.quantity)
    }, 0)

    // Mettre à jour le montant du projet
    const updatedProject = await prisma.project.update({
      where: { id: params.id },
      data: {
        amount: servicesTotal
      }
    })

    return NextResponse.json({
      message: "Budget du projet mis à jour",
      project: updatedProject,
      servicesTotal,
      servicesCount: project.services.length
    })

  } catch (error) {
    console.error("Erreur lors de la mise à jour du budget:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 