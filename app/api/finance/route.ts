import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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
    const period = searchParams.get('period') || 'thisYear'

    // Calculer les dates selon la période
    const now = new Date()
    let startDate: Date
    let endDate: Date
    let previousStartDate: Date
    let previousEndDate: Date

    switch (period) {
      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        previousEndDate = new Date(now.getFullYear(), now.getMonth(), 0)
        break
      case 'lastMonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        endDate = new Date(now.getFullYear(), now.getMonth(), 0)
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 2, 1)
        previousEndDate = new Date(now.getFullYear(), now.getMonth() - 1, 0)
        break
      case 'thisYear':
        startDate = new Date(now.getFullYear(), 0, 1)
        endDate = new Date(now.getFullYear(), 11, 31)
        previousStartDate = new Date(now.getFullYear() - 1, 0, 1)
        previousEndDate = new Date(now.getFullYear() - 1, 11, 31)
        break
      case 'lastYear':
        startDate = new Date(now.getFullYear() - 1, 0, 1)
        endDate = new Date(now.getFullYear() - 1, 11, 31)
        previousStartDate = new Date(now.getFullYear() - 2, 0, 1)
        previousEndDate = new Date(now.getFullYear() - 2, 11, 31)
        break
      default:
        startDate = new Date(now.getFullYear(), 0, 1)
        endDate = new Date(now.getFullYear(), 11, 31)
        previousStartDate = new Date(now.getFullYear() - 1, 0, 1)
        previousEndDate = new Date(now.getFullYear() - 1, 11, 31)
    }

    // Récupérer les factures pour la période
    const invoices = await prisma.invoice.findMany({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
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

    // Récupérer les factures de la période précédente pour comparaison
    const previousInvoices = await prisma.invoice.findMany({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: previousStartDate,
          lte: previousEndDate
        }
      }
    })

    // Récupérer les dépenses pour la période
    const expenses = await prisma.expense.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    // Récupérer les dépenses de la période précédente
    const previousExpenses = await prisma.expense.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: previousStartDate,
          lte: previousEndDate
        }
      }
    })

    // Calculer les métriques principales
    const totalRevenue = invoices
      .filter(inv => inv.status === 'PAID')
      .reduce((sum, inv) => sum + inv.amount, 0)

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)
    const netProfit = totalRevenue - totalExpenses

    const pendingInvoices = invoices
      .filter(inv => inv.status === 'PENDING')
      .reduce((sum, inv) => sum + inv.amount, 0)

    const paidInvoices = invoices
      .filter(inv => inv.status === 'PAID')
      .reduce((sum, inv) => sum + inv.amount, 0)

    const overdueInvoices = invoices
      .filter(inv => inv.status === 'OVERDUE')
      .reduce((sum, inv) => sum + inv.amount, 0)

    // Calculer la croissance
    const previousRevenue = previousInvoices
      .filter(inv => inv.status === 'PAID')
      .reduce((sum, inv) => sum + inv.amount, 0)

    const growth = previousRevenue > 0 
      ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 
      : 0

    // Statistiques des factures
    const invoiceStats = {
      total: invoices.length,
      paid: invoices.filter(inv => inv.status === 'PAID').length,
      pending: invoices.filter(inv => inv.status === 'PENDING').length,
      overdue: invoices.filter(inv => inv.status === 'OVERDUE').length
    }

    // Évolution mensuelle (derniers 6 mois)
    const monthlyRevenue = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      
      const monthInvoices = await prisma.invoice.findMany({
        where: {
          userId: session.user.id,
          status: 'PAID',
          createdAt: {
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

      const monthRevenue = monthInvoices.reduce((sum, inv) => sum + inv.amount, 0)
      const monthExpense = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0)

      monthlyRevenue.push({
        month: monthStart.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
        revenue: monthRevenue,
        expenses: monthExpense
      })
    }

    // Revenus par projet
    const projectRevenue = new Map<string, { name: string; amount: number }>()
    
    invoices
      .filter(inv => inv.status === 'PAID' && inv.project)
      .forEach(inv => {
        const projectId = inv.project!.id
        const projectName = inv.project!.name
        
        if (projectRevenue.has(projectId)) {
          projectRevenue.get(projectId)!.amount += inv.amount
        } else {
          projectRevenue.set(projectId, { name: projectName, amount: inv.amount })
        }
      })

    const revenueByProject = Array.from(projectRevenue.values())
      .map(project => ({
        ...project,
        percentage: totalRevenue > 0 ? (project.amount / totalRevenue) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount)

    // Dépenses par catégorie
    const expensesByCategory = expenses.reduce((acc, expense) => {
      const category = expense.category || 'Autres'
      if (acc[category]) {
        acc[category] += expense.amount
      } else {
        acc[category] = expense.amount
      }
      return acc
    }, {} as Record<string, number>)

    const expensesByCategoryArray = Object.entries(expensesByCategory)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount)

    const financeData = {
      totalRevenue,
      totalExpenses,
      netProfit,
      pendingInvoices,
      paidInvoices,
      overdueInvoices,
      monthlyRevenue,
      revenueByProject,
      expensesByCategory: expensesByCategoryArray,
      cashFlow: {
        thisMonth: totalRevenue,
        lastMonth: previousRevenue,
        growth
      },
      invoiceStats
    }

    return NextResponse.json(financeData)
  } catch (error) {
    console.error("Erreur lors de la récupération des données financières:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 