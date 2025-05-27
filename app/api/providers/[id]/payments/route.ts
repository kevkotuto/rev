import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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

    const { id: providerId } = await params

    // Vérifier que le prestataire existe et appartient à l'utilisateur
    const provider = await prisma.provider.findFirst({
      where: {
        id: providerId,
        userId: session.user.id
      }
    })

    if (!provider) {
      return NextResponse.json(
        { message: "Prestataire non trouvé" },
        { status: 404 }
      )
    }

    // Récupérer toutes les dépenses liées à ce prestataire
    const payments = await prisma.expense.findMany({
      where: {
        userId: session.user.id,
        category: 'PROVIDER_PAYMENT',
        description: {
          contains: provider.name
        }
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

    // Formater les données pour l'affichage
    const formattedPayments = payments.map(payment => ({
      id: payment.id,
      description: payment.description,
      amount: payment.amount,
      date: payment.date.toISOString(),
      notes: payment.notes,
      projectName: payment.project?.name
    }))

    return NextResponse.json(formattedPayments)

  } catch (error) {
    console.error("Erreur lors de la récupération des paiements:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 