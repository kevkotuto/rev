import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { clientSchema } from "@/lib/validations"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Non autorisé" },
        { status: 401 }
      )
    }

    const clients = await prisma.client.findMany({
      where: {
        userId: session.user.id
      },
      include: {
        _count: {
          select: {
            projects: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50 // Limiter le nombre de résultats pour éviter les timeouts
    })

    return NextResponse.json(clients)
  } catch (error) {
    console.error("Erreur lors de la récupération des clients:", error)
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
    const validatedData = clientSchema.parse(body)

    const client = await prisma.client.create({
      data: {
        ...validatedData,
        userId: session.user.id
      }
    })

    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    console.error("Erreur lors de la création du client:", error)
    return NextResponse.json(
      { message: "Erreur lors de la création du client" },
      { status: 500 }
    )
  }
} 