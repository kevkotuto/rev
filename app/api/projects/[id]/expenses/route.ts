import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { expenseSchema } from "@/lib/validations"

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

    const expenses = await prisma.expense.findMany({
      where: {
        projectId: params.id,
        userId: session.user.id
      },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    })

    return NextResponse.json(expenses)
  } catch (error) {
    console.error("Erreur lors de la récupération des dépenses du projet:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

export async function POST(
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

    const body = await request.json()
    const validatedData = expenseSchema.parse({
      ...body,
      projectId: params.id,
      type: "PROJECT"
    })

    const expense = await prisma.expense.create({
      data: {
        description: validatedData.description,
        amount: validatedData.amount,
        category: validatedData.category,
        date: validatedData.date,
        notes: validatedData.notes,
        type: validatedData.type,
        projectId: params.id,
        userId: session.user.id
      },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    console.error("Erreur lors de la création de la dépense:", error)
    return NextResponse.json(
      { message: "Erreur lors de la création de la dépense" },
      { status: 500 }
    )
  }
} 