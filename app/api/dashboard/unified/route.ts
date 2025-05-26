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
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Requêtes parallèles pour optimiser les performances
    const [
      projects,
      tasks,
      clients,
      invoices,
      files,
      activities,
      notifications,
      tags
    ] = await Promise.all([
      // Projets avec statistiques
      prisma.project.findMany({
        where: { userId },
        include: {
          tasks: {
            select: {
              id: true,
              status: true,
              priority: true,
              dueDate: true
            }
          },
          client: {
            select: {
              id: true,
              name: true,
              company: true
            }
          },
          _count: {
            select: {
              tasks: true,
              files: true
            }
          }
        }
      }),

      // Tâches avec détails
      prisma.task.findMany({
        where: {
          project: { userId }
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              color: true
            }
          }
        }
      }),

      // Clients
      prisma.client.findMany({
        where: { userId },
        include: {
          _count: {
            select: {
              projects: true,
              invoices: true
            }
          }
        }
      }),

      // Factures avec calculs
      prisma.invoice.findMany({
        where: { userId },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              company: true
            }
          },
          project: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }),

      // Fichiers
      prisma.file.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          size: true,
          type: true,
          createdAt: true,
          projectId: true
        }
      }),

      // Activités récentes
      prisma.activity.findMany({
        where: { 
          userId,
          createdAt: {
            gte: thirtyDaysAgo
          }
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              color: true
            }
          },
          task: {
            select: {
              id: true,
              title: true
            }
          },
          client: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      }),

      // Notifications
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),

      // Tags avec utilisation
      prisma.tag.findMany({
        where: { userId },
        include: {
          _count: {
            select: {
              projects: true,
              tasks: true,
              clients: true,
              files: true
            }
          }
        }
      })
    ])

    // Calculs des métriques
    const projectStats = {
      total: projects.length,
      active: projects.filter(p => p.status === 'IN_PROGRESS').length,
      completed: projects.filter(p => p.status === 'COMPLETED').length,
      pending: projects.filter(p => p.status === 'PENDING').length,
      cancelled: projects.filter(p => p.status === 'CANCELLED').length,
      averageTasksPerProject: projects.length > 0 ? Math.round(projects.reduce((sum, p) => sum + p._count.tasks, 0) / projects.length) : 0
    }

    const taskStats = {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'PENDING').length,
      inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
      completed: tasks.filter(t => t.status === 'COMPLETED').length,
      cancelled: tasks.filter(t => t.status === 'CANCELLED').length,
      overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'COMPLETED').length,
      urgent: tasks.filter(t => t.priority === 'HIGH' && t.status !== 'COMPLETED').length,
      dueToday: tasks.filter(t => {
        if (!t.dueDate || t.status === 'COMPLETED') return false
        const due = new Date(t.dueDate)
        return due.toDateString() === now.toDateString()
      }).length,
      dueThisWeek: tasks.filter(t => {
        if (!t.dueDate || t.status === 'COMPLETED') return false
        const due = new Date(t.dueDate)
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        return due >= now && due <= weekFromNow
      }).length
    }

    const clientStats = {
      total: clients.length,
      activeProjects: clients.filter(c => c._count.projects > 0).length,
      withInvoices: clients.filter(c => c._count.invoices > 0).length,
      averageProjectsPerClient: clients.length > 0 ? Math.round(clients.reduce((sum, c) => sum + c._count.projects, 0) / clients.length) : 0
    }

    const invoiceStats = {
      total: invoices.length,
      draft: invoices.filter(i => i.status === 'DRAFT').length,
      sent: invoices.filter(i => i.status === 'SENT').length,
      paid: invoices.filter(i => i.status === 'PAID').length,
      overdue: invoices.filter(i => i.status === 'SENT' && i.dueDate && new Date(i.dueDate) < now).length,
      totalAmount: invoices.reduce((sum, i) => sum + (i.amount || 0), 0),
      paidAmount: invoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + (i.amount || 0), 0),
      pendingAmount: invoices.filter(i => i.status === 'SENT').reduce((sum, i) => sum + (i.amount || 0), 0),
      overdueAmount: invoices.filter(i => i.status === 'SENT' && i.dueDate && new Date(i.dueDate) < now).reduce((sum, i) => sum + (i.amount || 0), 0)
    }

    const fileStats = {
      total: files.length,
      totalSize: files.reduce((sum, f) => sum + (f.size || 0), 0),
      byType: files.reduce((acc, f) => {
        const type = f.type || 'unknown'
        acc[type] = (acc[type] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      recentUploads: files.filter(f => f.createdAt >= thirtyDaysAgo).length
    }

    // Tendances mensuelles
    const thisMonthTasks = tasks.filter(t => t.createdAt >= startOfMonth).length
    const lastMonthTasks = tasks.filter(t => t.createdAt >= startOfLastMonth && t.createdAt <= endOfLastMonth).length
    const thisMonthProjects = projects.filter(p => p.createdAt >= startOfMonth).length
    const lastMonthProjects = projects.filter(p => p.createdAt >= startOfLastMonth && p.createdAt <= endOfLastMonth).length

    const trends = {
      tasks: {
        current: thisMonthTasks,
        previous: lastMonthTasks,
        growth: lastMonthTasks > 0 ? ((thisMonthTasks - lastMonthTasks) / lastMonthTasks) * 100 : 0
      },
      projects: {
        current: thisMonthProjects,
        previous: lastMonthProjects,
        growth: lastMonthProjects > 0 ? ((thisMonthProjects - lastMonthProjects) / lastMonthProjects) * 100 : 0
      },
      revenue: {
        current: invoices.filter(i => i.paidAt >= startOfMonth).reduce((sum, i) => sum + (i.amount || 0), 0),
        previous: invoices.filter(i => i.paidAt >= startOfLastMonth && i.paidAt <= endOfLastMonth).reduce((sum, i) => sum + (i.amount || 0), 0),
        growth: 0 // Calculé après
      }
    }
    trends.revenue.growth = trends.revenue.previous > 0 ? ((trends.revenue.current - trends.revenue.previous) / trends.revenue.previous) * 100 : 0

    // Activités par type
    const activityByType = activities.reduce((acc, activity) => {
      acc[activity.type] = (acc[activity.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Productivité et performance
    const productivity = {
      tasksCompletionRate: taskStats.total > 0 ? (taskStats.completed / taskStats.total) * 100 : 0,
      projectsCompletionRate: projectStats.total > 0 ? (projectStats.completed / projectStats.total) * 100 : 0,
      averageTasksPerDay: activities.filter(a => a.type === 'TASK_COMPLETED').length / 30,
      invoicePaymentRate: invoiceStats.total > 0 ? (invoiceStats.paid / invoiceStats.total) * 100 : 0
    }

    // Alertes et recommandations
    const alerts = []
    const recommendations = []

    if (taskStats.overdue > 0) {
      alerts.push(`${taskStats.overdue} tâche(s) en retard`)
    }
    if (invoiceStats.overdue > 0) {
      alerts.push(`${invoiceStats.overdue} facture(s) en retard de paiement`)
    }
    if (taskStats.dueToday > 0) {
      alerts.push(`${taskStats.dueToday} tâche(s) à terminer aujourd'hui`)
    }

    if (productivity.tasksCompletionRate < 70) {
      recommendations.push("Améliorer la gestion des tâches pour augmenter le taux de completion")
    }
    if (invoiceStats.pendingAmount > invoiceStats.paidAmount) {
      recommendations.push("Suivre les factures en attente pour améliorer la trésorerie")
    }
    if (projectStats.active > 5) {
      recommendations.push("Considérer finaliser certains projets pour réduire la charge")
    }

    // Données pour graphiques
    const chartData = {
      projectsByStatus: [
        { name: 'En cours', value: projectStats.active, color: '#3B82F6' },
        { name: 'Terminés', value: projectStats.completed, color: '#10B981' },
        { name: 'En attente', value: projectStats.pending, color: '#F59E0B' },
        { name: 'Annulés', value: projectStats.cancelled, color: '#EF4444' }
      ],
      tasksByStatus: [
        { name: 'En attente', value: taskStats.pending, color: '#F59E0B' },
        { name: 'En cours', value: taskStats.inProgress, color: '#3B82F6' },
        { name: 'Terminées', value: taskStats.completed, color: '#10B981' },
        { name: 'Annulées', value: taskStats.cancelled, color: '#EF4444' }
      ],
      monthlyRevenue: trends.revenue,
      activitiesByType: Object.entries(activityByType).map(([type, count]) => ({
        type,
        count,
        label: type.replace('_', ' ')
      }))
    }

    // Prochaines échéances
    const upcomingDeadlines = tasks
      .filter(t => t.dueDate && t.status !== 'COMPLETED')
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 5)
      .map(task => ({
        id: task.id,
        title: task.title,
        dueDate: task.dueDate,
        priority: task.priority,
        project: task.project,
        isOverdue: new Date(task.dueDate!) < now,
        daysUntilDue: Math.ceil((new Date(task.dueDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      }))

    return NextResponse.json({
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email
      },
      stats: {
        projects: projectStats,
        tasks: taskStats,
        clients: clientStats,
        invoices: invoiceStats,
        files: fileStats
      },
      trends,
      productivity,
      alerts,
      recommendations,
      chartData,
      recentActivities: activities.slice(0, 10),
      upcomingDeadlines,
      notifications: notifications.filter(n => !n.isRead).slice(0, 5),
      tags: tags.filter(t => t._count.projects + t._count.tasks + t._count.clients + t._count.files > 0),
      summary: {
        totalProjects: projectStats.total,
        activeProjects: projectStats.active,
        totalTasks: taskStats.total,
        completedTasks: taskStats.completed,
        totalRevenue: invoiceStats.totalAmount,
        pendingRevenue: invoiceStats.pendingAmount,
        unreadNotifications: notifications.filter(n => !n.isRead).length,
        overdueItems: taskStats.overdue + invoiceStats.overdue
      },
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error("Erreur dashboard unifié:", error)
    return NextResponse.json(
      { message: "Erreur lors de la génération du dashboard" },
      { status: 500 }
    )
  }
} 