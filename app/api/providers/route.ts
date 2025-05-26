import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const providerSchema = z.object({
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

// GET - Récupérer tous les prestataires
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
    const search = searchParams.get('search')

    const where: any = {
      userId: session.user.id
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { role: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } }
      ]
    }

    const providers = await prisma.provider.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(providers)
  } catch (error) {
    console.error("Erreur lors de la récupération des prestataires:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

// POST - Créer un nouveau prestataire
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
    const validatedData = providerSchema.parse(body)

    // Vérifier si un prestataire avec le même email existe déjà
    if (validatedData.email) {
      const existingProvider = await prisma.provider.findFirst({
        where: {
          email: validatedData.email,
          userId: session.user.id
        }
      })

      if (existingProvider) {
        return NextResponse.json(
          { message: "Un prestataire avec cet email existe déjà" },
          { status: 400 }
        )
      }
    }

    const provider = await prisma.provider.create({
      data: {
        ...validatedData,
        email: validatedData.email || null,
        userId: session.user.id
      }
    })

    return NextResponse.json(provider, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Données invalides", errors: error.errors },
        { status: 400 }
      )
    }

    console.error("Erreur lors de la création du prestataire:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 