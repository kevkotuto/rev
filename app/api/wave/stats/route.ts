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

    // Récupérer les assignations Wave de l'utilisateur
    const waveAssignments = await prisma.waveTransactionAssignment.findMany({
      where: {
        userId: session.user.id
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

    const recentTransactions = waveAssignments.slice(0, 5)

    // Statistiques par mois (derniers 6 mois)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const monthlyStats = await prisma.waveTransactionAssignment.groupBy({
      by: ['timestamp'],
      where: {
        userId: session.user.id,
        timestamp: {
          gte: sixMonthsAgo
        }
      },
      _sum: {
        amount: true
      },
      _count: {
        id: true
      }
    })

    // Grouper par mois
    const monthlyData = monthlyStats.reduce((acc: any, stat) => {
      const month = new Date(stat.timestamp).toISOString().slice(0, 7) // YYYY-MM
      if (!acc[month]) {
        acc[month] = { revenue: 0, expenses: 0, count: 0 }
      }
      
      if (stat._sum.amount && stat._sum.amount > 0) {
        acc[month].revenue += stat._sum.amount
      } else if (stat._sum.amount && stat._sum.amount < 0) {
        acc[month].expenses += Math.abs(stat._sum.amount)
      }
      
      acc[month].count += stat._count.id
      return acc
    }, {})

    return NextResponse.json({
      totalTransactions,
      totalRevenue,
      totalExpenses,
      netAmount: totalRevenue - totalExpenses,
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
      })),
      monthlyData
    })

  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques Wave:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 