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

    const userId = session.user.id
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
    const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)

    // Données parallèles pour optimiser les performances
    const [
      currentMonthStats,
      previousMonthStats,
      yearlyStats,
      projectsData,
      tasksData,
      invoicesData,
      expensesData
    ] = await Promise.all([
      // Stats du mois actuel
      Promise.all([
        prisma.invoice.findMany({
          where: { 
            userId, 
            createdAt: { gte: thirtyDaysAgo },
            status: 'PAID'
          },
          select: { amount: true }
        }),
        prisma.expense.findMany({
          where: { 
            userId, 
            createdAt: { gte: thirtyDaysAgo }
          },
          select: { amount: true }
        }),
        prisma.project.count({
          where: { 
            userId, 
            createdAt: { gte: thirtyDaysAgo }
          }
        }),
        prisma.task.count({
          where: { 
            userId, 
            createdAt: { gte: thirtyDaysAgo },
            status: 'DONE'
          }
        })
      ]),
      
      // Stats du mois précédent
      Promise.all([
        prisma.invoice.findMany({
          where: { 
            userId, 
            createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
            status: 'PAID'
          },
          select: { amount: true }
        }),
        prisma.expense.findMany({
          where: { 
            userId, 
            createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo }
          },
          select: { amount: true }
        })
      ]),

      // Stats annuelles pour les tendances
      Promise.all([
        prisma.invoice.findMany({
          where: { 
            userId, 
            createdAt: { gte: yearAgo },
            status: 'PAID'
          },
          select: { amount: true, createdAt: true }
        }),
        prisma.project.findMany({
          where: { 
            userId, 
            createdAt: { gte: yearAgo }
          },
          select: { status: true, amount: true, createdAt: true }
        })
      ]),

      // Données des projets
      prisma.project.findMany({
        where: { userId },
        include: {
          client: { select: { name: true } },
          _count: { select: { tasks: true } }
        }
      }),

      // Données des tâches
      prisma.task.findMany({
        where: { userId },
        select: {
          status: true,
          priority: true,
          dueDate: true,
          createdAt: true
        }
      }),

      // Données des factures
      prisma.invoice.findMany({
        where: { userId },
        select: {
          status: true,
          amount: true,
          type: true,
          createdAt: true,
          dueDate: true
        }
      }),

      // Données des dépenses
      prisma.expense.findMany({
        where: { userId },
        select: {
          amount: true,
          category: true,
          createdAt: true
        }
      })
    ])

    // Calculs des métriques actuelles
    const currentRevenue = currentMonthStats[0].reduce((sum, inv) => sum + inv.amount, 0)
    const currentExpenses = currentMonthStats[1].reduce((sum, exp) => sum + exp.amount, 0)
    const currentProjectsCount = currentMonthStats[2]
    const currentTasksCompleted = currentMonthStats[3]

    // Calculs des métriques précédentes
    const previousRevenue = previousMonthStats[0].reduce((sum, inv) => sum + inv.amount, 0)
    const previousExpenses = previousMonthStats[1].reduce((sum, exp) => sum + exp.amount, 0)

    // Calculs de croissance
    const revenueGrowth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0
    const expenseGrowth = previousExpenses > 0 ? ((currentExpenses - previousExpenses) / previousExpenses) * 100 : 0
    const profitMargin = currentRevenue > 0 ? ((currentRevenue - currentExpenses) / currentRevenue) * 100 : 0

    // Analyse des projets
    const activeProjects = projectsData.filter(p => p.status === 'IN_PROGRESS')
    const completedProjects = projectsData.filter(p => p.status === 'COMPLETED')
    const averageProjectValue = projectsData.length > 0 ? projectsData.reduce((sum, p) => sum + p.amount, 0) / projectsData.length : 0

    // Analyse des tâches
    const overdueTasks = tasksData.filter(t => 
      t.dueDate && new Date(t.dueDate) < now && t.status !== 'DONE'
    )
    const urgentTasks = tasksData.filter(t => t.priority === 'URGENT' && t.status !== 'DONE')
    const taskCompletionRate = tasksData.length > 0 ? (tasksData.filter(t => t.status === 'DONE').length / tasksData.length) * 100 : 0

    // Analyse financière
    const totalRevenue = invoicesData.filter(i => i.status === 'PAID').reduce((sum, i) => sum + i.amount, 0)
    const pendingRevenue = invoicesData.filter(i => i.status === 'PENDING').reduce((sum, i) => sum + i.amount, 0)
    const overdueInvoices = invoicesData.filter(i => 
      i.dueDate && new Date(i.dueDate) < now && i.status === 'PENDING'
    )

    // Revenus par mois (derniers 12 mois)
    const monthlyRevenue = []
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      
      const monthRevenue = yearlyStats[0]
        .filter(inv => inv.createdAt >= monthStart && inv.createdAt <= monthEnd)
        .reduce((sum, inv) => sum + inv.amount, 0)
      
      monthlyRevenue.push({
        month: monthStart.toISOString().slice(0, 7), // YYYY-MM
        revenue: monthRevenue,
        monthName: monthStart.toLocaleDateString('fr-FR', { month: 'long' })
      })
    }

    // Top catégories de dépenses
    const expensesByCategory = expensesData.reduce((acc, expense) => {
      const category = expense.category || 'Autres'
      acc[category] = (acc[category] || 0) + expense.amount
      return acc
    }, {} as Record<string, number>)

    // KPIs et alertes
    const kpis = {
      revenueGrowth: Math.round(revenueGrowth * 100) / 100,
      profitMargin: Math.round(profitMargin * 100) / 100,
      taskCompletionRate: Math.round(taskCompletionRate * 100) / 100,
      averageProjectValue: Math.round(averageProjectValue),
      activeProjectsCount: activeProjects.length,
      monthlyRevenueAverage: Math.round(monthlyRevenue.reduce((sum, m) => sum + m.revenue, 0) / 12)
    }

    const alerts = []
    if (overdueTasks.length > 0) alerts.push(`${overdueTasks.length} tâche(s) en retard`)
    if (urgentTasks.length > 3) alerts.push(`${urgentTasks.length} tâches urgentes`)
    if (overdueInvoices.length > 0) alerts.push(`${overdueInvoices.length} facture(s) impayée(s)`)
    if (revenueGrowth < -10) alerts.push(`Baisse de CA de ${Math.abs(revenueGrowth).toFixed(1)}%`)
    if (profitMargin < 20) alerts.push(`Marge bénéficiaire faible (${profitMargin.toFixed(1)}%)`)

    const analytics = {
      kpis,
      financial: {
        currentRevenue,
        previousRevenue,
        revenueGrowth,
        totalRevenue,
        pendingRevenue,
        currentExpenses,
        profitMargin,
        monthlyRevenue,
        expensesByCategory: Object.entries(expensesByCategory)
          .map(([category, amount]) => ({ category, amount }))
          .sort((a, b) => b.amount - a.amount)
      },
      projects: {
        total: projectsData.length,
        active: activeProjects.length,
        completed: completedProjects.length,
        averageValue: averageProjectValue,
        completionRate: projectsData.length > 0 ? (completedProjects.length / projectsData.length) * 100 : 0
      },
      tasks: {
        total: tasksData.length,
        completed: tasksData.filter(t => t.status === 'DONE').length,
        overdue: overdueTasks.length,
        urgent: urgentTasks.length,
        completionRate: taskCompletionRate
      },
      trends: {
        projectsThisMonth: currentProjectsCount,
        tasksCompletedThisMonth: currentTasksCompleted,
        revenueGrowthTrend: revenueGrowth > 0 ? 'up' : revenueGrowth < 0 ? 'down' : 'stable'
      },
      alerts,
      generatedAt: new Date().toISOString()
    }

    return NextResponse.json(analytics)

  } catch (error) {
    console.error("Erreur analytics dashboard:", error)
    return NextResponse.json(
      { message: "Erreur lors du calcul des analytics" },
      { status: 500 }
    )
  }
} 