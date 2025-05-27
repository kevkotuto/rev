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
    const { isPaid, paymentMethod, paidAt } = body

    // Vérifier que la relation projet-prestataire existe et appartient à l'utilisateur
    const projectProvider = await prisma.projectProvider.findFirst({
      where: {
        id,
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
        { message: "Relation prestataire-projet non trouvée" },
        { status: 404 }
      )
    }

    // Récupérer l'état précédent pour savoir si on doit créer/supprimer une dépense
    const wasAlreadyPaid = projectProvider.isPaid

    // Mise à jour avec gestion des valeurs null
    const updateData: any = {
      isPaid: Boolean(isPaid)
    }

    // Si on marque comme payé, on ajoute les informations de paiement
    if (isPaid) {
      updateData.paymentMethod = paymentMethod || 'CASH'
      updateData.paidDate = paidAt ? new Date(paidAt) : new Date()
    } else {
      // Si on marque comme non payé, on supprime les informations de paiement
      updateData.paymentMethod = null
      updateData.paidDate = null
    }

    // Commencer une transaction pour mettre à jour le prestataire et gérer la dépense
    const result = await prisma.$transaction(async (tx) => {
      // Mettre à jour le prestataire
      const updatedProjectProvider = await tx.projectProvider.update({
        where: { id },
        data: updateData,
        include: {
          project: true,
          provider: true
        }
      })

      // Gérer la création/suppression de la dépense
      if (isPaid && !wasAlreadyPaid) {
        // Créer une dépense pour ce paiement
        await tx.expense.create({
          data: {
            description: `Paiement prestataire - ${projectProvider.provider.name} (${projectProvider.project.name})`,
            amount: projectProvider.amount,
            category: 'PROVIDER_PAYMENT',
            type: 'PROJECT',
            date: updateData.paidDate || new Date(),
            notes: `Paiement effectué par ${updateData.paymentMethod} pour le projet "${projectProvider.project.name}"`,
            projectId: projectProvider.projectId,
            userId: session.user.id
          }
        })
      } else if (!isPaid && wasAlreadyPaid) {
        // Supprimer la dépense correspondante si elle existe
        const existingExpense = await tx.expense.findFirst({
          where: {
            userId: session.user.id,
            projectId: projectProvider.projectId,
            description: {
              contains: `Paiement prestataire - ${projectProvider.provider.name}`
            },
            amount: projectProvider.amount
          }
        })

        if (existingExpense) {
          await tx.expense.delete({
            where: { id: existingExpense.id }
          })
        }
      }

      return updatedProjectProvider
    })

    const statusMessage = isPaid ? 'payé' : 'non payé'
    const expenseMessage = isPaid && !wasAlreadyPaid 
      ? ' et une dépense a été créée automatiquement'
      : !isPaid && wasAlreadyPaid 
        ? ' et la dépense correspondante a été supprimée'
        : ''

    return NextResponse.json({
      projectProvider: result,
      message: `Prestataire marqué comme ${statusMessage} avec succès${expenseMessage}`
    })

  } catch (error) {
    console.error("Erreur lors de la mise à jour du statut de paiement:", error)
    return NextResponse.json(
      { message: "Erreur lors de la mise à jour du statut de paiement" },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer l'assignation d'un prestataire
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

    const { id } = params

    // Vérifier que le ProjectProvider appartient à l'utilisateur via le projet
    const projectProvider = await prisma.projectProvider.findFirst({
      where: {
        id,
        project: {
          userId: session.user.id
        }
      }
    })

    if (!projectProvider) {
      return NextResponse.json(
        { message: "Relation prestataire-projet non trouvée" },
        { status: 404 }
      )
    }

    await prisma.projectProvider.delete({
      where: {
        id
      }
    })

    return NextResponse.json({ message: "Prestataire retiré du projet avec succès" })
  } catch (error) {
    console.error("Erreur lors de la suppression du ProjectProvider:", error)
    return NextResponse.json(
      { message: "Erreur lors de la suppression" },
      { status: 500 }
    )
  }
} 