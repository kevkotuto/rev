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

    // Récupérer les paramètres de période
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Construire les filtres de date
    const dateFilter: any = {}
    if (startDate) {
      dateFilter.gte = new Date(startDate)
    }
    if (endDate) {
      const endDateTime = new Date(endDate)
      endDateTime.setHours(23, 59, 59, 999) // Fin de journée
      dateFilter.lte = endDateTime
    }

    // Récupérer les assignations Wave de l'utilisateur avec filtres de période
    const waveAssignments = await prisma.waveTransactionAssignment.findMany({
      where: {
        userId: session.user.id,
        ...(Object.keys(dateFilter).length > 0 && { timestamp: dateFilter })
      },
      include: {
        project: true,
        client: true,
        provider: true
      },
      orderBy: {
        timestamp: 'desc'
      }
    })

    // Calculer les statistiques
    const totalTransactions = waveAssignments.length
    const totalRevenue = waveAssignments
      .filter(t => t.type === 'revenue')
      .reduce((sum, t) => sum + t.amount, 0)
    
    const totalExpenses = waveAssignments
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)

    const recentTransactions = waveAssignments.slice(0, 10)

    // Statistiques par catégorie
    const transactionsByType = {
      revenue: waveAssignments.filter(t => t.type === 'revenue').length,
      expense: waveAssignments.filter(t => t.type === 'expense').length,
      assigned: waveAssignments.length,
      unassigned: 0 // Sera calculé plus tard si nécessaire
    }

    // Statistiques par projet
    const projectStats = waveAssignments.reduce((acc: any, t) => {
      if (t.project) {
        if (!acc[t.project.id]) {
          acc[t.project.id] = {
            projectName: t.project.name,
            totalAmount: 0,
            transactionCount: 0,
            revenue: 0,
            expenses: 0
          }
        }
        acc[t.project.id].totalAmount += t.amount
        acc[t.project.id].transactionCount += 1
        if (t.type === 'revenue') {
          acc[t.project.id].revenue += t.amount
        } else {
          acc[t.project.id].expenses += Math.abs(t.amount)
        }
      }
      return acc
    }, {})

    // Statistiques par client
    const clientStats = waveAssignments.reduce((acc: any, t) => {
      if (t.client) {
        if (!acc[t.client.id]) {
          acc[t.client.id] = {
            clientName: t.client.name,
            totalAmount: 0,
            transactionCount: 0,
            revenue: 0,
            expenses: 0
          }
        }
        acc[t.client.id].totalAmount += t.amount
        acc[t.client.id].transactionCount += 1
        if (t.type === 'revenue') {
          acc[t.client.id].revenue += t.amount
        } else {
          acc[t.client.id].expenses += Math.abs(t.amount)
        }
      }
      return acc
    }, {})

    // Statistiques par prestataire
    const providerStats = waveAssignments.reduce((acc: any, t) => {
      if (t.provider) {
        if (!acc[t.provider.id]) {
          acc[t.provider.id] = {
            providerName: t.provider.name,
            totalAmount: 0,
            transactionCount: 0,
            expenses: 0
          }
        }
        acc[t.provider.id].totalAmount += Math.abs(t.amount)
        acc[t.provider.id].transactionCount += 1
        acc[t.provider.id].expenses += Math.abs(t.amount)
      }
      return acc
    }, {})

    // Évolution temporelle (par jour/semaine selon la période)
    const timeSeriesData = waveAssignments.reduce((acc: any, t) => {
      const date = new Date(t.timestamp)
      let timeKey: string
      
      // Déterminer la granularité selon la période
      const periodDays = startDate && endDate 
        ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
        : 30

      if (periodDays <= 7) {
        // Par jour pour les périodes courtes
        timeKey = date.toISOString().split('T')[0]
      } else if (periodDays <= 90) {
        // Par semaine pour les périodes moyennes
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        timeKey = weekStart.toISOString().split('T')[0]
      } else {
        // Par mois pour les longues périodes
        timeKey = date.toISOString().slice(0, 7) // YYYY-MM
      }
      
      if (!acc[timeKey]) {
        acc[timeKey] = { revenue: 0, expenses: 0, count: 0, net: 0 }
      }
      
      if (t.type === 'revenue') {
        acc[timeKey].revenue += t.amount
      } else {
        acc[timeKey].expenses += Math.abs(t.amount)
      }
      acc[timeKey].count += 1
      acc[timeKey].net = acc[timeKey].revenue - acc[timeKey].expenses
      
      return acc
    }, {})

    return NextResponse.json({
      totalTransactions,
      totalRevenue,
      totalExpenses,
      netAmount: totalRevenue - totalExpenses,
      transactionsByType,
      projectStats: Object.values(projectStats).slice(0, 5), // Top 5 projets
      clientStats: Object.values(clientStats).slice(0, 5), // Top 5 clients
      providerStats: Object.values(providerStats).slice(0, 5), // Top 5 prestataires
      timeSeriesData,
      period: {
        startDate,
        endDate,
        totalDays: startDate && endDate 
          ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
          : null
      },
      recentTransactions: recentTransactions.map(t => ({
        id: t.id,
        transactionId: t.transactionId,
        type: t.type,
        description: t.description,
        amount: t.amount,
        currency: t.currency,
        timestamp: t.timestamp,
        counterpartyName: t.counterpartyName,
        counterpartyMobile: t.counterpartyMobile,
        project: t.project ? {
          id: t.project.id,
          name: t.project.name
        } : null,
        client: t.client ? {
          id: t.client.id,
          name: t.client.name
        } : null,
        provider: t.provider ? {
          id: t.provider.id,
          name: t.provider.name
        } : null
      }))
    })

  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques Wave:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 