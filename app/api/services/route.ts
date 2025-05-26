import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { serviceSchema } from "@/lib/validations"

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

    const where: any = {}

    if (projectId) {
      where.projectId = projectId
      // Vérifier que le projet appartient à l'utilisateur
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          userId: session.user.id
        }
      })

      if (!project) {
        return NextResponse.json(
          { message: "Projet non trouvé" },
          { status: 404 }
        )
      }
    } else {
      // Si pas de projectId, récupérer tous les services des projets de l'utilisateur
      where.project = {
        userId: session.user.id
      }
    }

    const services = await prisma.service.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        }
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
    const validatedData = serviceSchema.parse(body)

    // Vérifier que le projet appartient à l'utilisateur
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

    const service = await prisma.service.create({
      data: validatedData,
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json(service, { status: 201 })
  } catch (error) {
    console.error("Erreur lors de la création du service:", error)
    return NextResponse.json(
      { message: "Erreur lors de la création du service" },
      { status: 500 }
    )
  }
} 