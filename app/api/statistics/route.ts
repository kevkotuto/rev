import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'thisYear'

    // Calculer les dates selon la période
    const now = new Date()
    let startDate: Date
    let endDate: Date
    let lastPeriodStart: Date
    let lastPeriodEnd: Date

    switch (period) {
      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        lastPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        lastPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 0)
        break
      case 'lastMonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        endDate = new Date(now.getFullYear(), now.getMonth(), 0)
        lastPeriodStart = new Date(now.getFullYear(), now.getMonth() - 2, 1)
        lastPeriodEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0)
        break
      case 'thisYear':
        startDate = new Date(now.getFullYear(), 0, 1)
        endDate = new Date(now.getFullYear(), 11, 31)
        lastPeriodStart = new Date(now.getFullYear() - 1, 0, 1)
        lastPeriodEnd = new Date(now.getFullYear() - 1, 11, 31)
        break
      case 'lastYear':
        startDate = new Date(now.getFullYear() - 1, 0, 1)
        endDate = new Date(now.getFullYear() - 1, 11, 31)
        lastPeriodStart = new Date(now.getFullYear() - 2, 0, 1)
        lastPeriodEnd = new Date(now.getFullYear() - 2, 11, 31)
        break
      default:
        startDate = new Date(now.getFullYear(), 0, 1)
        endDate = new Date(now.getFullYear(), 11, 31)
        lastPeriodStart = new Date(now.getFullYear() - 1, 0, 1)
        lastPeriodEnd = new Date(now.getFullYear() - 1, 11, 31)
    }

    // Calculer les revenus
    const invoices = await prisma.invoice.findMany({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    const lastPeriodInvoices = await prisma.invoice.findMany({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: lastPeriodStart,
          lte: lastPeriodEnd
        }
      }
    })

    const totalRevenue = invoices.reduce((sum, invoice) => sum + invoice.amount, 0)
    const lastPeriodRevenue = lastPeriodInvoices.reduce((sum, invoice) => sum + invoice.amount, 0)
    const revenueGrowth = lastPeriodRevenue > 0 ? ((totalRevenue - lastPeriodRevenue) / lastPeriodRevenue) * 100 : 0

    // Calculer les revenus du mois actuel et précédent
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    const thisMonthInvoices = await prisma.invoice.findMany({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: thisMonth,
          lt: nextMonth
        }
      }
    })

    const lastMonthInvoices = await prisma.invoice.findMany({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: lastMonth,
          lt: thisMonth
        }
      }
    })

    const thisMonthRevenue = thisMonthInvoices.reduce((sum, invoice) => sum + invoice.amount, 0)
    const lastMonthRevenue = lastMonthInvoices.reduce((sum, invoice) => sum + invoice.amount, 0)

    // Statistiques des clients
    const clients = await prisma.client.findMany({
      where: { userId: session.user.id },
      include: {
        projects: {
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate
            }
          }
        }
      }
    })

    const activeClients = clients.filter(client => client.projects.length > 0).length
    const newClients = clients.filter(client => 
      client.createdAt >= startDate && client.createdAt <= endDate
    ).length

    // Statistiques des projets
    const projects = await prisma.project.findMany({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    const completedProjects = projects.filter(p => p.status === 'COMPLETED').length
    const inProgressProjects = projects.filter(p => p.status === 'IN_PROGRESS').length
    const onHoldProjects = projects.filter(p => p.status === 'ON_HOLD').length

    // Statistiques des tâches
    const tasks = await prisma.task.findMany({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    const completedTasks = tasks.filter(t => t.status === 'DONE').length
    const pendingTasks = tasks.filter(t => t.status !== 'DONE').length

    // Statistiques des dépenses
    const expenses = await prisma.expense.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)

    const thisMonthExpenses = await prisma.expense.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: thisMonth,
          lt: nextMonth
        }
      }
    })

    const lastMonthExpenses = await prisma.expense.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: lastMonth,
          lt: thisMonth
        }
      }
    })

    const thisMonthExpensesTotal = thisMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0)
    const lastMonthExpensesTotal = lastMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0)

    // Statistiques des factures par statut
    const paidInvoices = invoices.filter(i => i.status === 'PAID').length
    const pendingInvoices = invoices.filter(i => i.status === 'PENDING').length
    const overdueInvoices = invoices.filter(i => i.status === 'OVERDUE').length

    // Revenus mensuels (12 derniers mois)
    const monthlyRevenue = []
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      
      const monthInvoices = await prisma.invoice.findMany({
        where: {
          userId: session.user.id,
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

      const monthRevenue = monthInvoices.reduce((sum, invoice) => sum + invoice.amount, 0)
      const monthExpenseTotal = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0)

      monthlyRevenue.push({
        month: monthStart.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
        revenue: monthRevenue,
        expenses: monthExpenseTotal
      })
    }

    // Projets par type
    const projectsByType = await prisma.project.groupBy({
      by: ['type'],
      where: {
        userId: session.user.id,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      _count: {
        id: true
      },
      _sum: {
        amount: true
      }
    })

    const formattedProjectsByType = projectsByType.map(group => ({
      type: group.type,
      count: group._count.id,
      revenue: group._sum.amount || 0
    }))

    const statistics = {
      revenue: {
        total: totalRevenue,
        thisMonth: thisMonthRevenue,
        lastMonth: lastMonthRevenue,
        growth: revenueGrowth
      },
      clients: {
        total: clients.length,
        active: activeClients,
        new: newClients
      },
      projects: {
        total: projects.length,
        completed: completedProjects,
        inProgress: inProgressProjects,
        onHold: onHoldProjects
      },
      tasks: {
        total: tasks.length,
        completed: completedTasks,
        pending: pendingTasks
      },
      expenses: {
        total: totalExpenses,
        thisMonth: thisMonthExpensesTotal,
        lastMonth: lastMonthExpensesTotal
      },
      invoices: {
        total: invoices.length,
        paid: paidInvoices,
        pending: pendingInvoices,
        overdue: overdueInvoices
      },
      monthlyRevenue,
      projectsByType: formattedProjectsByType
    }

    return NextResponse.json(statistics)
  } catch (error) {
    console.error('Erreur lors du calcul des statistiques:', error)
    return NextResponse.json(
      { error: 'Erreur lors du calcul des statistiques' },
      { status: 500 }
    )
  }
} 