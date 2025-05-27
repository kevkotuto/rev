import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Types pour les statistiques
interface Statistics {
  revenue: {
    total: number
    thisMonth: number
    lastMonth: number
    growth: number
    pending: number
    overdue: number
  }
  clients: {
    total: number
    active: number
    new: number
    topClients: Array<{
      name: string
      revenue: number
      projects: number
    }>
  }
  projects: {
    total: number
    completed: number
    inProgress: number
    onHold: number
    cancelled: number
    averageValue: number
    profitability: number
  }
  tasks: {
    total: number
    completed: number
    pending: number
    overdue: number
    completionRate: number
  }
  expenses: {
    total: number
    thisMonth: number
    lastMonth: number
    byCategory: Array<{
      category: string
      amount: number
      percentage: number
    }>
  }
  invoices: {
    total: number
    paid: number
    pending: number
    overdue: number
    cancelled: number
    averagePaymentDelay: number
  }
  monthlyRevenue: Array<{
    month: string
    revenue: number
    expenses: number
    profit: number
    invoicesCount: number
  }>
  projectsByType: Array<{
    type: string
    count: number
    revenue: number
    percentage: number
  }>
  performance: {
    profitMargin: number
    revenuePerClient: number
    projectSuccessRate: number
    paymentDelayTrend: number
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Non autorisé" },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'thisMonth'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Construction des filtres de date
    let dateFilter = {}
    let previousDateFilter = {}
    
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const duration = end.getTime() - start.getTime()
      
      dateFilter = {
        createdAt: {
          gte: start,
          lte: end
        }
      }
      
      // Période précédente pour comparaison
      const previousStart = new Date(start.getTime() - duration)
      const previousEnd = start
      
      previousDateFilter = {
        createdAt: {
          gte: previousStart,
          lte: previousEnd
        }
      }
    } else {
      // Logique pour les périodes prédéfinies
      const now = new Date()
      let start: Date, end: Date
      
      switch (period) {
        case 'thisWeek':
          start = new Date(now.setDate(now.getDate() - now.getDay()))
          end = new Date()
          break
        case 'thisMonth':
          start = new Date(now.getFullYear(), now.getMonth(), 1)
          end = new Date()
          break
        case 'lastMonth':
          start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          end = new Date(now.getFullYear(), now.getMonth(), 0)
          break
        case 'thisQuarter':
          start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
          end = new Date()
          break
        case 'thisYear':
          start = new Date(now.getFullYear(), 0, 1)
          end = new Date()
          break
        case 'lastYear':
          start = new Date(now.getFullYear() - 1, 0, 1)
          end = new Date(now.getFullYear() - 1, 11, 31)
          break
        default:
          start = new Date(now.getFullYear(), now.getMonth(), 1)
          end = new Date()
      }
      
      const duration = end.getTime() - start.getTime()
      
      dateFilter = {
        createdAt: {
          gte: start,
          lte: end
        }
      }
      
      // Période précédente
      const previousStart = new Date(start.getTime() - duration)
      const previousEnd = start
      
      previousDateFilter = {
        createdAt: {
          gte: previousStart,
          lte: previousEnd
        }
      }
    }

    // Récupération des données
    const [
      clients, 
      projects, 
      tasks, 
      invoices, 
      expenses,
      previousInvoices,
      previousExpenses,
      paidInvoicesInPeriod,
      paidInvoicesPreviousPeriod
    ] = await Promise.all([
      prisma.client.findMany({
        where: { userId },
        include: {
          projects: { 
            select: { amount: true, status: true },
            where: startDate && endDate ? dateFilter : {}
          },
          _count: { select: { projects: true } }
        }
      }),
      prisma.project.findMany({
        where: { 
          userId,
          ...(startDate && endDate ? dateFilter : {})
        },
        include: {
          client: { select: { name: true } }
        }
      }),
      prisma.task.findMany({
        where: { 
          userId,
          ...(startDate && endDate ? dateFilter : {})
        }
      }),
      prisma.invoice.findMany({
        where: { 
          userId,
          ...(startDate && endDate ? dateFilter : {})
        }
      }),
      prisma.expense.findMany({
        where: { 
          userId,
          ...(startDate && endDate ? dateFilter : {})
        }
      }),
      // Données période précédente pour comparaison
      prisma.invoice.findMany({
        where: { 
          userId,
          ...previousDateFilter
        }
      }),
      prisma.expense.findMany({
        where: { 
          userId,
          ...previousDateFilter
        }
      }),
      // Factures payées dans la période (basé sur paidDate)
      prisma.invoice.findMany({
        where: { 
          userId,
          status: 'PAID',
          ...(startDate && endDate ? {
            paidDate: {
              gte: new Date(startDate),
              lte: new Date(endDate + 'T23:59:59.999Z')
            }
          } : {})
        }
      }),
      // Factures payées période précédente - simplifié
      prisma.invoice.findMany({
        where: { 
          userId,
          status: 'PAID'
        }
      })
    ])

    // Calculs des métriques de revenus - utiliser les factures payées dans la période
    const totalRevenue = paidInvoicesInPeriod.reduce((sum, i) => sum + i.amount, 0)
    const pendingRevenue = invoices.filter(i => i.status === 'PENDING').reduce((sum, i) => sum + i.amount, 0)
    const overdueRevenue = invoices.filter(i => i.status === 'OVERDUE').reduce((sum, i) => sum + i.amount, 0)
    
    // Calculer les revenus de la période précédente manuellement
    const previousRevenue = startDate && endDate ? 
      paidInvoicesPreviousPeriod.filter(i => {
        if (!i.paidDate) return false
        const paidDate = new Date(i.paidDate)
        const duration = new Date(endDate).getTime() - new Date(startDate).getTime()
        const previousStart = new Date(new Date(startDate).getTime() - duration)
        const previousEnd = new Date(startDate)
        return paidDate >= previousStart && paidDate < previousEnd
      }).reduce((sum, i) => sum + i.amount, 0) : 0
    const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0

    // Calculs des dépenses
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
    const previousExpensesTotal = previousExpenses.reduce((sum, e) => sum + e.amount, 0)

    // Analyse des clients
    const activeClients = clients.filter(c => c.projects.some(p => p.status === 'IN_PROGRESS')).length
    const newClients = clients.filter(c => {
      const clientCreated = new Date(c.createdAt)
      return startDate && endDate ? 
        clientCreated >= new Date(startDate) && clientCreated <= new Date(endDate) :
        clientCreated >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    }).length

    // Top clients
    const topClients = clients
      .map(c => ({
        name: c.name,
        revenue: c.projects.reduce((sum, p) => sum + p.amount, 0),
        projects: c._count.projects
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    // Analyse des projets
    const completedProjects = projects.filter(p => p.status === 'COMPLETED').length
    const inProgressProjects = projects.filter(p => p.status === 'IN_PROGRESS').length
    const onHoldProjects = projects.filter(p => p.status === 'ON_HOLD').length
    const cancelledProjects = projects.filter(p => p.status === 'CANCELLED').length
    
    const averageProjectValue = projects.length > 0 ? projects.reduce((sum, p) => sum + p.amount, 0) / projects.length : 0
    const projectSuccessRate = projects.length > 0 ? (completedProjects / projects.length) * 100 : 0

    // Analyse des tâches
    const now = new Date()
    const completedTasks = tasks.filter(t => t.status === 'DONE').length
    const pendingTasks = tasks.filter(t => t.status !== 'DONE').length
    const overdueTasks = tasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < now && t.status !== 'DONE'
    ).length
    const taskCompletionRate = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0

    // Analyse des factures
    const paidInvoices = invoices.filter(i => i.status === 'PAID').length
    const pendingInvoices = invoices.filter(i => i.status === 'PENDING').length
    const overdueInvoices = invoices.filter(i => i.status === 'OVERDUE').length
    const cancelledInvoices = invoices.filter(i => i.status === 'CANCELLED').length

    // Calcul du délai de paiement moyen
    const paidInvoicesWithDates = invoices.filter(i => i.status === 'PAID' && i.paidDate && i.createdAt)
    const averagePaymentDelay = paidInvoicesWithDates.length > 0 ? 
      paidInvoicesWithDates.reduce((sum, i) => {
        const paymentDate = new Date(i.paidDate!)
        const creationDate = new Date(i.createdAt)
        return sum + (paymentDate.getTime() - creationDate.getTime()) / (1000 * 60 * 60 * 24)
      }, 0) / paidInvoicesWithDates.length : 0

    // Dépenses par catégorie
    const expensesByCategory = expenses.reduce((acc, expense) => {
      const category = expense.category || 'Autres'
      acc[category] = (acc[category] || 0) + expense.amount
      return acc
    }, {} as Record<string, number>)

    const expensesCategoryArray = Object.entries(expensesByCategory).map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
    })).sort((a, b) => b.amount - a.amount)

    // Revenus mensuels (6 derniers mois)
    const monthlyData: { [key: string]: { revenue: number; expenses: number; invoicesCount: number } } = {}
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthKey = date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })
      monthlyData[monthKey] = { revenue: 0, expenses: 0, invoicesCount: 0 }
    }

    // Agrégation des données mensuelles
    // Récupérer toutes les factures payées pour l'analyse mensuelle
    const allPaidInvoices = await prisma.invoice.findMany({
      where: { 
        userId,
        status: 'PAID',
        paidDate: { not: null }
      }
    })
    
    allPaidInvoices.forEach(invoice => {
      if (invoice.paidDate) {
        const paymentDate = new Date(invoice.paidDate)
        const monthKey = paymentDate.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })
        if (monthlyData[monthKey]) {
          monthlyData[monthKey].revenue += invoice.amount
        }
      }
    })
    
    // Pour le comptage des factures, utiliser la date de création
    invoices.forEach(invoice => {
      const invoiceDate = new Date(invoice.createdAt)
      const monthKey = invoiceDate.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].invoicesCount++
      }
    })

    expenses.forEach(expense => {
      const expenseDate = new Date(expense.createdAt)
      const monthKey = expenseDate.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].expenses += expense.amount
      }
    })

    const monthlyRevenue = Object.entries(monthlyData).map(([month, data]) => ({
      month,
      revenue: data.revenue,
      expenses: data.expenses,
      profit: data.revenue - data.expenses,
      invoicesCount: data.invoicesCount
    }))

    // Projets par type
    const projectsByType = projects.reduce((acc, project) => {
      const type = project.client ? 'Projets clients' : 'Projets personnels'
      acc[type] = (acc[type] || { count: 0, revenue: 0 })
      acc[type].count++
      acc[type].revenue += project.amount
      return acc
    }, {} as Record<string, { count: number; revenue: number }>)

    const projectsTypeArray = Object.entries(projectsByType).map(([type, data]) => ({
      type,
      count: data.count,
      revenue: data.revenue,
      percentage: projects.length > 0 ? (data.count / projects.length) * 100 : 0
    }))

    // Métriques de performance
    const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0
    const revenuePerClient = clients.length > 0 ? totalRevenue / clients.length : 0
    const profitability = projects.length > 0 ? ((totalRevenue - totalExpenses) / projects.length) : 0

    // Tendance des délais de paiement (comparaison avec période précédente)
    const previousPaidInvoices = previousInvoices.filter(i => i.status === 'PAID' && i.paidDate && i.createdAt)
    const previousAveragePaymentDelay = previousPaidInvoices.length > 0 ? 
      previousPaidInvoices.reduce((sum, i) => {
        const paymentDate = new Date(i.paidDate!)
        const creationDate = new Date(i.createdAt)
        return sum + (paymentDate.getTime() - creationDate.getTime()) / (1000 * 60 * 60 * 24)
      }, 0) / previousPaidInvoices.length : 0

    const paymentDelayTrend = averagePaymentDelay - previousAveragePaymentDelay

    // Construction de la réponse
    const statistics: Statistics = {
      revenue: {
        total: totalRevenue,
        thisMonth: totalRevenue, // Ajusté selon la période
        lastMonth: previousRevenue,
        growth: revenueGrowth,
        pending: pendingRevenue,
        overdue: overdueRevenue
      },
      clients: {
        total: clients.length,
        active: activeClients,
        new: newClients,
        topClients
      },
      projects: {
        total: projects.length,
        completed: completedProjects,
        inProgress: inProgressProjects,
        onHold: onHoldProjects,
        cancelled: cancelledProjects,
        averageValue: averageProjectValue,
        profitability
      },
      tasks: {
        total: tasks.length,
        completed: completedTasks,
        pending: pendingTasks,
        overdue: overdueTasks,
        completionRate: taskCompletionRate
      },
      expenses: {
        total: totalExpenses,
        thisMonth: totalExpenses, // Ajusté selon la période
        lastMonth: previousExpensesTotal,
        byCategory: expensesCategoryArray
      },
      invoices: {
        total: invoices.length,
        paid: paidInvoices,
        pending: pendingInvoices,
        overdue: overdueInvoices,
        cancelled: cancelledInvoices,
        averagePaymentDelay: Math.round(averagePaymentDelay)
      },
      monthlyRevenue,
      projectsByType: projectsTypeArray,
      performance: {
        profitMargin,
        revenuePerClient,
        projectSuccessRate,
        paymentDelayTrend
      }
    }

    return NextResponse.json(statistics)

  } catch (error) {
    console.error("Erreur lors du calcul des statistiques:", error)
    return NextResponse.json(
      { 
        message: "Erreur lors du calcul des statistiques",
        error: error instanceof Error ? error.message : "Erreur inconnue" 
      },
      { status: 500 }
    )
  }
} 