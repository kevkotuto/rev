import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'thisYear'

    // Calculer les dates selon la période
    const now = new Date()
    let startDate: Date
    let endDate: Date

    switch (period) {
      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        break
      case 'lastMonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        endDate = new Date(now.getFullYear(), now.getMonth(), 0)
        break
      case 'thisYear':
        startDate = new Date(now.getFullYear(), 0, 1)
        endDate = new Date(now.getFullYear(), 11, 31)
        break
      case 'lastYear':
        startDate = new Date(now.getFullYear() - 1, 0, 1)
        endDate = new Date(now.getFullYear() - 1, 11, 31)
        break
      default:
        startDate = new Date(now.getFullYear(), 0, 1)
        endDate = new Date(now.getFullYear(), 11, 31)
    }

    // Récupérer les factures payées (revenus) - utiliser la date de paiement
    const paidInvoices = await prisma.invoice.findMany({
      where: {
        userId: session.user.id,
        status: 'PAID',
        paidDate: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        project: {
          select: { name: true }
        }
      }
    })

    // Récupérer toutes les factures pour les statistiques
    const allInvoices = await prisma.invoice.findMany({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    // Récupérer les factures en attente (revenus potentiels)
    const pendingInvoices = await prisma.invoice.findMany({
      where: {
        userId: session.user.id,
        status: { in: ['PENDING', 'OVERDUE'] },
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    // Récupérer les dépenses
    const expenses = await prisma.expense.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        project: {
          select: { name: true }
        }
      }
    })

    // Calculer les totaux
    const totalRevenue = paidInvoices.reduce((sum, invoice) => sum + invoice.amount, 0)
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)
    const netProfit = totalRevenue - totalExpenses
    const pendingRevenue = pendingInvoices.reduce((sum, invoice) => sum + invoice.amount, 0)

    // Statistiques des factures
    const paidInvoicesCount = allInvoices.filter(i => i.status === 'PAID').length
    const pendingInvoicesCount = allInvoices.filter(i => i.status === 'PENDING').length
    const overdueInvoicesCount = allInvoices.filter(i => i.status === 'OVERDUE').length

    // Données mensuelles (12 derniers mois)
    const monthlyData = []
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      
      const monthInvoices = await prisma.invoice.findMany({
        where: {
          userId: session.user.id,
          status: 'PAID',
          paidDate: {
            gte: monthStart,
            lte: monthEnd
          }
        }
      })

      const monthExpenses = await prisma.expense.findMany({
        where: {
          userId: session.user.id,
          date: {
            gte: monthStart,
            lte: monthEnd
          }
        }
      })

      const revenue = monthInvoices.reduce((sum, invoice) => sum + invoice.amount, 0)
      const expenseTotal = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0)

      monthlyData.push({
        month: monthStart.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
        revenue,
        expenses: expenseTotal,
        profit: revenue - expenseTotal
      })
    }

    // Dépenses par catégorie
    const expensesByCategory = await prisma.expense.groupBy({
      by: ['category'],
      where: {
        userId: session.user.id,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        amount: true
      },
      _count: {
        id: true
      }
    })

    const formattedExpensesByCategory = expensesByCategory.map(group => ({
      category: group.category || 'OTHER',
      amount: group._sum.amount || 0,
      count: group._count.id
    }))

    // Transactions récentes (revenus et dépenses)
    const recentTransactions: any[] = []

    // Ajouter les factures récentes
    const recentInvoices = await prisma.invoice.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        project: {
          select: { name: true }
        }
      }
    })

    recentInvoices.forEach(invoice => {
      // Utiliser la date de paiement si disponible, sinon la date de création
      const displayDate = invoice.paidDate ? invoice.paidDate : invoice.createdAt
      const dateLabel = invoice.paidDate ? 'Payée le' : 'Créée le'
      
      recentTransactions.push({
        id: `invoice-${invoice.id}`,
        type: 'revenue' as const,
        description: `Facture ${invoice.invoiceNumber}${invoice.project ? ` - ${invoice.project.name}` : ''}`,
        amount: invoice.amount,
        date: displayDate.toISOString(),
        status: invoice.status,
        dateLabel
      })
    })

    // Ajouter les dépenses récentes
    const recentExpenses = await prisma.expense.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        project: {
          select: { name: true }
        }
      }
    })

    recentExpenses.forEach(expense => {
      recentTransactions.push({
        id: `expense-${expense.id}`,
        type: 'expense' as const,
        description: expense.description,
        amount: expense.amount,
        date: expense.date.toISOString(),
        status: 'PAID',
        category: expense.category
      })
    })

    // Trier les transactions par date
    recentTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const financeData = {
      totalRevenue,
      totalExpenses,
      netProfit,
      pendingRevenue,
      pendingInvoices: pendingInvoicesCount,
      paidInvoices: paidInvoicesCount,
      overdueInvoices: overdueInvoicesCount,
      monthlyData,
      expensesByCategory: formattedExpensesByCategory,
      recentTransactions: recentTransactions.slice(0, 20)
    }

    return NextResponse.json(financeData)
  } catch (error) {
    console.error("Erreur lors du calcul des données financières:", error)
    return NextResponse.json(
      { error: "Erreur lors du calcul des données financières" },
      { status: 500 }
    )
  }
} 