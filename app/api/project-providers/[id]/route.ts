import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updatePaymentSchema = z.object({
  amount: z.number().positive().optional(),
  isPaid: z.boolean().optional(),
  paymentMethod: z.string().optional(),
  notes: z.string().optional()
})

const updateProviderPaymentSchema = z.object({
  isPaid: z.boolean(),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "WAVE"]).optional(),
  paidAt: z.string().optional(),
  notes: z.string().optional()
})

// GET - Récupérer les détails d'une relation projet-prestataire
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

    const projectProvider = await prisma.projectProvider.findFirst({
      where: {
        id: params.id,
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
        },
        project: {
          select: {
            id: true,
            name: true,
            amount: true
          }
        }
      }
    })

    if (!projectProvider) {
      return NextResponse.json(
        { message: "Relation projet-prestataire non trouvée" },
        { status: 404 }
      )
    }

    return NextResponse.json(projectProvider)
  } catch (error) {
    console.error("Erreur lors de la récupération de la relation:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

// PUT - Mettre à jour les informations de paiement
export async function PUT(
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
    const validatedData = updateProviderPaymentSchema.parse(body)

    // Vérifier que la relation projet-prestataire existe et appartient à l'utilisateur
    const projectProvider = await prisma.projectProvider.findFirst({
      where: {
        id: params.id,
        project: {
          userId: session.user.id
        }
      },
      include: {
        project: true,
        provider: true
      }
    })

    if (!projectProvider) {
      return NextResponse.json(
        { message: "Relation projet-prestataire non trouvée" },
        { status: 404 }
      )
    }

    // Mettre à jour le statut de paiement
    const updatedProjectProvider = await prisma.projectProvider.update({
      where: { id: params.id },
      data: {
        isPaid: validatedData.isPaid,
        paymentMethod: validatedData.paymentMethod,
        paidAt: validatedData.paidAt ? new Date(validatedData.paidAt) : null,
        notes: validatedData.notes
      },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            role: true,
            photo: true
          }
        }
      }
    })

    // Si le prestataire est marqué comme payé, créer une dépense dans le projet
    if (validatedData.isPaid && !projectProvider.isPaid) {
      await prisma.expense.create({
        data: {
          description: `Paiement prestataire: ${projectProvider.provider.name}`,
          amount: projectProvider.amount,
          category: "PROVIDER_PAYMENT",
          type: "PROJECT",
          projectId: projectProvider.projectId,
          userId: session.user.id,
          date: validatedData.paidAt ? new Date(validatedData.paidAt) : new Date()
        }
      })
    }

    return NextResponse.json(updatedProjectProvider)
  } catch (error) {
    console.error("Erreur lors de la mise à jour du paiement:", error)
    return NextResponse.json(
      { message: "Erreur lors de la mise à jour du paiement" },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer l'assignation d'un prestataire
export async function DELETE(
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

    // Vérifier que la relation existe et appartient à l'utilisateur
    const existingRelation = await prisma.projectProvider.findFirst({
      where: {
        id: params.id,
        project: {
          userId: session.user.id
        }
      }
    })

    if (!existingRelation) {
      return NextResponse.json(
        { message: "Relation projet-prestataire non trouvée" },
        { status: 404 }
      )
    }

    await prisma.projectProvider.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: "Prestataire retiré du projet avec succès" })
  } catch (error) {
    console.error("Erreur lors de la suppression de l'assignation:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 