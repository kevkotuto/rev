import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { projectSchema } from "@/lib/validations"

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

    const { id } = await params

    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: session.user.id
      },
      include: {
        client: true,
        invoices: true,
        files: true,
        projectProviders: {
          include: {
            provider: true
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json(
        { message: "Projet non trouvé" },
        { status: 404 }
      )
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error("Erreur lors de la récupération du projet:", error)
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
    const validatedData = projectSchema.parse(body)

    // Convertir les dates string en objets Date
    const projectData: any = {
      ...validatedData,
      startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
      endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
      clientId: validatedData.clientId === "none" ? null : validatedData.clientId
    }

    const project = await prisma.project.update({
      where: {
        id: params.id,
        userId: session.user.id
      },
      data: projectData,
      include: {
        client: true
      }
    })

    return NextResponse.json(project)
  } catch (error) {
    console.error("Erreur lors de la mise à jour du projet:", error)
    return NextResponse.json(
      { message: "Erreur lors de la mise à jour du projet" },
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

    // Vérifier que le projet existe et appartient à l'utilisateur
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

    // Supprimer le projet (les relations seront supprimées en cascade)
    await prisma.project.delete({
      where: {
        id: params.id
      }
    })

    return NextResponse.json({ message: "Projet supprimé avec succès" })
  } catch (error) {
    console.error("Erreur lors de la suppression du projet:", error)
    return NextResponse.json(
      { message: "Erreur lors de la suppression du projet" },
      { status: 500 }
    )
  }
} 