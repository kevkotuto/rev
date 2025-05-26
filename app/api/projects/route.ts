import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { projectSchema } from "@/lib/validations"

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
    const clientId = searchParams.get('clientId')
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    const where: any = {
      userId: session.user.id
    }

    if (clientId) where.clientId = clientId
    if (status) where.status = status
    if (type) where.type = type

    const projects = await prisma.project.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        services: true,
        _count: {
          select: {
            services: true,
            expenses: true,
            invoices: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(projects)
  } catch (error) {
    console.error("Erreur lors de la récupération des projets:", error)
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
    const validatedData = projectSchema.parse(body)

    // Convertir les dates string en objets Date
    const projectData: any = {
      ...validatedData,
      userId: session.user.id
    }

    if (validatedData.startDate) {
      projectData.startDate = new Date(validatedData.startDate)
    }
    if (validatedData.endDate) {
      projectData.endDate = new Date(validatedData.endDate)
    }

    const project = await prisma.project.create({
      data: projectData,
      include: {
        client: true,
        services: true
      }
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error("Erreur lors de la création du projet:", error)
    return NextResponse.json(
      { message: "Erreur lors de la création du projet" },
      { status: 500 }
    )
  }
} 