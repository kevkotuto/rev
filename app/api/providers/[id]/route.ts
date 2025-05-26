import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateProviderSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  company: z.string().optional(),
  role: z.string().optional(),
  photo: z.string().optional(),
  notes: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  bankIban: z.string().optional()
})

// GET - Récupérer un prestataire spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const provider = await prisma.provider.findFirst({
      where: {
        id: id,
        userId: session.user.id
      },
      include: {
        projectProviders: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                status: true,
                logo: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    if (!provider) {
      return NextResponse.json(
        { message: "Prestataire non trouvé" },
        { status: 404 }
      )
    }

    return NextResponse.json(provider)
  } catch (error) {
    console.error("Erreur lors de la récupération du prestataire:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

// PUT - Mettre à jour un prestataire
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
    const body = await request.json()
    const validatedData = updateProviderSchema.parse(body)

    // Vérifier que le prestataire existe et appartient à l'utilisateur
    const existingProvider = await prisma.provider.findFirst({
      where: {
        id: id,
        userId: session.user.id
      }
    })

    if (!existingProvider) {
      return NextResponse.json(
        { message: "Prestataire non trouvé" },
        { status: 404 }
      )
    }

    // Vérifier si un autre prestataire avec le même email existe
    if (validatedData.email && validatedData.email !== existingProvider.email) {
      const duplicateProvider = await prisma.provider.findFirst({
        where: {
          email: validatedData.email,
          userId: session.user.id,
          id: { not: id }
        }
      })

      if (duplicateProvider) {
        return NextResponse.json(
          { message: "Un autre prestataire avec cet email existe déjà" },
          { status: 400 }
        )
      }
    }

    const updatedProvider = await prisma.provider.update({
      where: { id: id },
      data: {
        ...validatedData,
        email: validatedData.email || null
      }
    })

    return NextResponse.json(updatedProvider)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Données invalides", errors: error.errors },
        { status: 400 }
      )
    }

    console.error("Erreur lors de la mise à jour du prestataire:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer un prestataire
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    // Vérifier que le prestataire existe et appartient à l'utilisateur
    const existingProvider = await prisma.provider.findFirst({
      where: {
        id: id,
        userId: session.user.id
      }
    })

    if (!existingProvider) {
      return NextResponse.json(
        { message: "Prestataire non trouvé" },
        { status: 404 }
      )
    }

    await prisma.provider.delete({
      where: { id: id }
    })

    return NextResponse.json({ message: "Prestataire supprimé avec succès" })
  } catch (error) {
    console.error("Erreur lors de la suppression du prestataire:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 