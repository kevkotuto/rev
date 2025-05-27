import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Non autorisé" },
        { status: 401 }
      )
    }

    // Récupérer les données d'activité de l'utilisateur
    const [projects, invoices, expenses, providers] = await Promise.all([
      prisma.project.findMany({
        where: { userId: session.user.id },
        include: {
          client: true,
          projectProviders: {
            include: { provider: true }
          }
        }
      }),
      prisma.invoice.findMany({
        where: { userId: session.user.id },
        include: { project: true }
      }),
      prisma.expense.findMany({
        where: { userId: session.user.id },
        include: { project: true }
      }),
      prisma.provider.findMany({
        where: { userId: session.user.id }
      })
    ])

    // Calculer les statistiques
    const stats = {
      totalProjects: projects.length,
      activeProjects: projects.filter(p => p.status === 'IN_PROGRESS').length,
      completedProjects: projects.filter(p => p.status === 'COMPLETED').length,
      totalRevenue: invoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + i.amount, 0),
      pendingRevenue: invoices.filter(i => i.status === 'PENDING').reduce((sum, i) => sum + i.amount, 0),
      totalExpenses: expenses.reduce((sum, e) => sum + e.amount, 0),
      totalProviders: providers.length,
      averageProjectValue: projects.length > 0 ? projects.reduce((sum, p) => sum + p.amount, 0) / projects.length : 0,
      recentProjects: projects.filter(p => {
        const oneMonthAgo = new Date()
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
        return new Date(p.createdAt) > oneMonthAgo
      }).length
    }

    // Préparer le contexte pour l'IA
    const businessContext = {
      stats,
      projectTypes: projects.reduce((acc, p) => {
        acc[p.type] = (acc[p.type] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      expenseCategories: expenses.reduce((acc, e) => {
        const category = e.category || 'OTHER'
        acc[category] = (acc[category] || 0) + e.amount
        return acc
      }, {} as Record<string, number>),
      monthlyTrends: getMonthlyTrends(projects, invoices, expenses)
    }

    // Appel à l'IA (vous pouvez utiliser OpenAI, Claude, ou toute autre API)
    const analysis = await generateBusinessAnalysis(businessContext)

    return NextResponse.json({
      analysis,
      stats: businessContext,
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error("Erreur lors de l'analyse IA:", error)
    return NextResponse.json(
      { message: "Erreur lors de l'analyse intelligente" },
      { status: 500 }
    )
  }
}

function getMonthlyTrends(projects: any[], invoices: any[], expenses: any[]) {
  const last6Months = []
  for (let i = 5; i >= 0; i--) {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    const month = date.toISOString().slice(0, 7) // YYYY-MM format
    
    last6Months.push({
      month,
      newProjects: projects.filter(p => p.createdAt.slice(0, 7) === month).length,
             revenue: invoices.filter(i => i.paidDate && i.paidDate.slice(0, 7) === month).reduce((sum, i) => sum + i.amount, 0),
      expenses: expenses.filter(e => e.date.slice(0, 7) === month).reduce((sum, e) => sum + e.amount, 0)
    })
  }
  
  return last6Months
}

async function generateBusinessAnalysis(context: any) {
  // Ici vous pouvez intégrer votre service d'IA préféré
  // Pour l'exemple, je vais créer une analyse basique basée sur les données
  
  const { stats, projectTypes, expenseCategories, monthlyTrends } = context
  
  const insights = []
  const recommendations = []
  
  // Analyse de la rentabilité
  const profitMargin = stats.totalRevenue > 0 ? ((stats.totalRevenue - stats.totalExpenses) / stats.totalRevenue) * 100 : 0
  
  if (profitMargin > 30) {
    insights.push("🟢 Excellente marge bénéficiaire (" + profitMargin.toFixed(1) + "%)")
    recommendations.push("Continuez sur cette lancée et envisagez d'augmenter vos tarifs")
  } else if (profitMargin > 15) {
    insights.push("🟡 Marge bénéficiaire correcte (" + profitMargin.toFixed(1) + "%)")
    recommendations.push("Optimisez vos coûts pour améliorer la rentabilité")
  } else {
    insights.push("🔴 Marge bénéficiaire faible (" + profitMargin.toFixed(1) + "%)")
    recommendations.push("Urgence : Révisez vos tarifs et réduisez les dépenses")
  }
  
  // Analyse du portefeuille de projets
  const completionRate = stats.totalProjects > 0 ? (stats.completedProjects / stats.totalProjects) * 100 : 0
  
  if (completionRate > 80) {
    insights.push("🟢 Excellent taux de finalisation des projets (" + completionRate.toFixed(1) + "%)")
  } else if (completionRate > 60) {
    insights.push("🟡 Taux de finalisation correct (" + completionRate.toFixed(1) + "%)")
    recommendations.push("Améliorez le suivi des projets en cours")
  } else {
    insights.push("🔴 Taux de finalisation faible (" + completionRate.toFixed(1) + "%)")
    recommendations.push("Revoyez votre processus de gestion de projet")
  }
  
  // Analyse des revenus en attente
  if (stats.pendingRevenue > stats.totalRevenue * 0.5) {
    insights.push("⚠️ Montant important en attente de paiement")
    recommendations.push("Relancez vos clients pour les factures en attente")
  }
  
  // Analyse des tendances
  const recentGrowth = monthlyTrends[5]?.newProjects - monthlyTrends[0]?.newProjects
  if (recentGrowth > 0) {
    insights.push("📈 Croissance positive du nombre de nouveaux projets")
  } else if (recentGrowth < 0) {
    insights.push("📉 Diminution du nombre de nouveaux projets")
    recommendations.push("Renforcez vos efforts commerciaux et marketing")
  }
  
  return {
    summary: `Analyse de ${stats.totalProjects} projets générant ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(stats.totalRevenue)} de revenus`,
    insights,
    recommendations,
    keyMetrics: {
      profitMargin: profitMargin.toFixed(1) + "%",
      completionRate: completionRate.toFixed(1) + "%",
      averageProjectValue: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(stats.averageProjectValue),
      topProjectType: Object.entries(projectTypes).sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || "N/A"
    }
  }
} 