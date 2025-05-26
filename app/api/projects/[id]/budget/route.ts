import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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

    // Récupérer le projet avec tous les éléments du budget
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      },
      include: {
        projectProviders: {
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
        },
        expenses: {
          where: {
            type: "PROJECT"
          }
        },
        invoices: {
          where: {
            type: "INVOICE",
            status: "PAID"
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

    // Calculer le budget
    const budget = {
      // Revenus
      projectAmount: project.amount,
      paidInvoices: project.invoices.reduce((sum, invoice) => sum + invoice.amount, 0),
      
      // Coûts
      providerCosts: project.projectProviders.reduce((sum, pp) => sum + pp.amount, 0),
      paidProviders: project.projectProviders
        .filter(pp => pp.isPaid)
        .reduce((sum, pp) => sum + pp.amount, 0),
      unpaidProviders: project.projectProviders
        .filter(pp => !pp.isPaid)
        .reduce((sum, pp) => sum + pp.amount, 0),
      
      projectExpenses: project.expenses.reduce((sum, expense) => sum + expense.amount, 0),
      
      // Calculs
      totalCosts: 0,
      netProfit: 0,
      profitMargin: 0,
      
      // Détails
      providers: project.projectProviders.map(pp => ({
        id: pp.id,
        provider: pp.provider,
        amount: pp.amount,
        isPaid: pp.isPaid,
        paidAt: pp.paidAt
      })),
      
      expenses: project.expenses.map(expense => ({
        id: expense.id,
        description: expense.description,
        amount: expense.amount,
        category: expense.category,
        date: expense.date
      }))
    }

    // Calculer les totaux
    budget.totalCosts = budget.providerCosts + budget.projectExpenses
    budget.netProfit = budget.paidInvoices - budget.totalCosts
    budget.profitMargin = budget.paidInvoices > 0 ? (budget.netProfit / budget.paidInvoices) * 100 : 0

    return NextResponse.json(budget)
  } catch (error) {
    console.error("Erreur lors de la récupération du budget:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 