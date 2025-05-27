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
    
    // Récupérer les paramètres de date
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    // Construire les filtres de date
    const dateFilter: any = {}
    if (startDate && endDate) {
      dateFilter.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59.999Z') // Inclure toute la journée de fin
      }
    } else if (startDate) {
      dateFilter.createdAt = {
        gte: new Date(startDate)
      }
    } else if (endDate) {
      dateFilter.createdAt = {
        lte: new Date(endDate + 'T23:59:59.999Z')
      }
    }
    
    // Filtres spécifiques pour les factures (utilise paidDate pour les revenus)
    const invoiceDateFilter: any = {}
    if (startDate && endDate) {
      invoiceDateFilter.paidDate = {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59.999Z')
      }
    } else if (startDate) {
      invoiceDateFilter.paidDate = {
        gte: new Date(startDate)
      }
    } else if (endDate) {
      invoiceDateFilter.paidDate = {
        lte: new Date(endDate + 'T23:59:59.999Z')
      }
    }
    
    // Filtres pour les dépenses (utilise date au lieu de createdAt)
    const expenseDateFilter: any = {}
    if (startDate && endDate) {
      expenseDateFilter.date = {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59.999Z')
      }
    } else if (startDate) {
      expenseDateFilter.date = {
        gte: new Date(startDate)
      }
    } else if (endDate) {
      expenseDateFilter.date = {
        lte: new Date(endDate + 'T23:59:59.999Z')
      }
    }

    // Statistiques générales
    const [
      totalClients,
      totalProjects,
      totalInvoices,
      totalExpenses,
      activeProjects,
      completedProjects,
      pendingInvoices,
      paidInvoices,
      totalRevenue,
      totalExpenseAmount,
      totalProviders,
      totalTasks,
      totalFiles,
      recentActivities,
      projectsWithDates
    ] = await Promise.all([
      // Nombre total de clients
      prisma.client.count({
        where: { userId }
      }),

      // Nombre total de projets
      prisma.project.count({
        where: { userId }
      }),

      // Nombre total de factures
      prisma.invoice.count({
        where: { userId }
      }),

      // Nombre total de dépenses
      prisma.expense.count({
        where: { userId }
      }),

      // Projets actifs
      prisma.project.count({
        where: {
          userId,
          status: "IN_PROGRESS"
        }
      }),

      // Projets terminés
      prisma.project.count({
        where: {
          userId,
          status: "COMPLETED"
        }
      }),

      // Factures en attente
      prisma.invoice.count({
        where: {
          userId,
          status: "PENDING"
        }
      }),

      // Factures payées
      prisma.invoice.count({
        where: {
          userId,
          status: "PAID"
        }
      }),

      // Revenus totaux (factures payées)
      prisma.invoice.aggregate({
        where: {
          userId,
          status: "PAID",
          ...invoiceDateFilter
        },
        _sum: {
          amount: true
        }
      }),

      // Total des dépenses
      prisma.expense.aggregate({
        where: { 
          userId,
          ...expenseDateFilter
        },
        _sum: {
          amount: true
        }
      }),

      // Nombre total de prestataires
      prisma.provider.count({
        where: { userId }
      }),

      // Nombre total de tâches
      prisma.task.count({
        where: { userId }
      }),

      // Nombre total de fichiers
      prisma.file.count({
        where: { userId }
      }),

      // Activités récentes (dernières factures et projets)
      prisma.$transaction([
        prisma.invoice.findMany({
          where: { 
            userId,
            ...dateFilter
          },
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            invoiceNumber: true,
            amount: true,
            status: true,
            createdAt: true,
            type: true
          }
        }),
        prisma.project.findMany({
          where: { 
            userId,
            ...dateFilter
          },
          take: 5,
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            name: true,
            status: true,
            updatedAt: true,
            client: {
              select: {
                name: true
              }
            }
          }
        })
      ]),

      // Projets avec leurs dates pour analyse des délais
      prisma.project.findMany({
        where: { 
          userId,
          ...dateFilter
        },
        select: {
          id: true,
          name: true,
          status: true,
          startDate: true,
          endDate: true,
          createdAt: true,
          updatedAt: true,
          amount: true,
          client: {
            select: {
              name: true
            }
          }
        }
      })
    ])

    // Calculs des revenus par mois (6 derniers mois)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const monthlyRevenue = await prisma.invoice.groupBy({
      by: ['createdAt'],
      where: {
        userId,
        status: 'PAID',
        createdAt: {
          gte: sixMonthsAgo
        }
      },
      _sum: {
        amount: true
      }
    })

    // Organiser les revenus par mois
    const revenueByMonth = Array.from({ length: 6 }, (_, i) => {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      const monthRevenue = monthlyRevenue
        .filter(item => {
          const itemDate = new Date(item.createdAt)
          const itemMonthKey = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}`
          return itemMonthKey === monthKey
        })
        .reduce((sum, item) => sum + (item._sum.amount || 0), 0)

      return {
        month: date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
        revenue: monthRevenue
      }
    }).reverse()

    // Analyse des délais de projets
    const now = new Date()
    const projectDelayAnalysis = {
      onTime: 0,
      delayed: 0,
      upcoming: 0,
      averageDuration: 0
    }

    let totalDuration = 0
    let completedWithDates = 0

    projectsWithDates.forEach(project => {
      if (project.status === 'COMPLETED' && project.startDate && project.endDate) {
        const duration = new Date(project.endDate).getTime() - new Date(project.startDate).getTime()
        totalDuration += duration
        completedWithDates++
      }

      if (project.endDate) {
        const endDate = new Date(project.endDate)
        if (project.status === 'COMPLETED') {
          projectDelayAnalysis.onTime++
        } else if (endDate < now) {
          projectDelayAnalysis.delayed++
        } else {
          projectDelayAnalysis.upcoming++
        }
      }
    })

    if (completedWithDates > 0) {
      projectDelayAnalysis.averageDuration = Math.round(totalDuration / completedWithDates / (1000 * 60 * 60 * 24)) // en jours
    }

    // Projets par type et statut
    const projectsByType = projectsWithDates.reduce((acc, project) => {
      const type = project.client ? 'CLIENT' : 'PERSONNEL'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const stats = {
      overview: {
        totalClients,
        totalProjects,
        totalInvoices,
        totalExpenses,
        activeProjects,
        completedProjects,
        pendingInvoices,
        paidInvoices,
        totalProviders,
        totalTasks,
        totalFiles
      },
      projectAnalysis: {
        projectsByType,
        delayAnalysis: projectDelayAnalysis,
        averageProjectValue: totalProjects > 0 ? projectsWithDates.reduce((sum, p) => sum + p.amount, 0) / totalProjects : 0
      },
      financial: {
        totalRevenue: totalRevenue._sum.amount || 0,
        totalExpenses: totalExpenseAmount._sum.amount || 0,
        netProfit: (totalRevenue._sum.amount || 0) - (totalExpenseAmount._sum.amount || 0),
        revenueByMonth
      },
      recentActivities: {
        invoices: recentActivities[0],
        projects: recentActivities[1]
      }
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 