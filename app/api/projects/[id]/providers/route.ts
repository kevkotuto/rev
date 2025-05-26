import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const assignProviderSchema = z.object({
  providerId: z.string(),
  amount: z.number().positive(),
  notes: z.string().optional()
})

const updateProviderSchema = z.object({
  amount: z.number().positive().optional(),
  isPaid: z.boolean().optional(),
  paymentMethod: z.string().optional(),
  notes: z.string().optional()
})

// GET - Récupérer les prestataires assignés à un projet
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

    const projectProviders = await prisma.projectProvider.findMany({
      where: {
        projectId: params.id,
        project: {
          userId: session.user.id
        }
      },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            photo: true,
            bankName: true,
            bankAccount: true,
            bankIban: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(projectProviders)
  } catch (error) {
    console.error("Erreur lors de la récupération des prestataires:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

// POST - Assigner un prestataire à un projet
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
    const validatedData = assignProviderSchema.parse(body)

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

    // Vérifier que le prestataire appartient à l'utilisateur
    const provider = await prisma.provider.findFirst({
      where: {
        id: validatedData.providerId,
        userId: session.user.id
      }
    })

    if (!provider) {
      return NextResponse.json(
        { message: "Prestataire non trouvé" },
        { status: 404 }
      )
    }

    // Vérifier si le prestataire n'est pas déjà assigné
    const existingAssignment = await prisma.projectProvider.findUnique({
      where: {
        projectId_providerId: {
          projectId: params.id,
          providerId: validatedData.providerId
        }
      }
    })

    if (existingAssignment) {
      return NextResponse.json(
        { message: "Ce prestataire est déjà assigné à ce projet" },
        { status: 400 }
      )
    }

    const projectProvider = await prisma.projectProvider.create({
      data: {
        projectId: params.id,
        providerId: validatedData.providerId,
        amount: validatedData.amount,
        notes: validatedData.notes
      },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            photo: true,
            bankName: true,
            bankAccount: true,
            bankIban: true
          }
        }
      }
    })

    return NextResponse.json(projectProvider, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Données invalides", errors: error.errors },
        { status: 400 }
      )
    }

    console.error("Erreur lors de l'assignation du prestataire:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 