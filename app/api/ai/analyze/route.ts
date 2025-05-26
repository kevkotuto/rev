import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { ChatOpenAI } from "@langchain/openai"
import { PromptTemplate } from "@langchain/core/prompts"
import { prisma } from "@/lib/prisma"

const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0.3,
  openAIApiKey: process.env.OPENAI_API_KEY,
})

const analysisPrompt = PromptTemplate.fromTemplate(`
Tu es REV AI, l'assistant business intelligence de l'application freelance REV en Côte d'Ivoire.

Analyse les données suivantes et génère un rapport d'analyse intelligent et actionnable :

**DONNÉES BUSINESS:**
{businessData}

**CONTEXTE:**
- Freelance en Côte d'Ivoire
- Devise : XOF (Franc CFA)
- Période d'analyse : {period}

**INSTRUCTIONS:**
Génère une analyse structurée avec :

1. **RÉSUMÉ EXECUTIF** (2-3 phrases)
   - Performance globale
   - Points clés

2. **INSIGHTS STRATÉGIQUES** (3-4 points)
   - Tendances importantes
   - Opportunités identifiées
   - Alertes/risques

3. **RECOMMANDATIONS PRIORITAIRES** (2-3 actions)
   - Actions concrètes à prendre
   - Impact estimé

4. **MÉTRIQUES CLÉS À SURVEILLER**
   - 2-3 KPIs importants

Style : Professionnel, concis, français ivoirien, emojis stratégiques.
Format : JSON avec les sections ci-dessus.
`)

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

    // Récupération des données business complètes
    const [user, clients, projects, tasks, invoices, expenses, timeEntries] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true, createdAt: true }
      }),
      prisma.client.findMany({
        where: { userId },
        include: {
          projects: { select: { amount: true, status: true } },
          _count: { select: { projects: true } }
        }
      }),
      prisma.project.findMany({
        where: { userId },
        include: {
          client: { select: { name: true } },
          _count: { select: { tasks: true } }
        },
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.task.findMany({
        where: { userId },
        include: { project: { select: { name: true } } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.invoice.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.expense.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      }),
      // Note: timeEntries n'existe pas encore dans le schéma, on simule
      Promise.resolve([])
    ])

    // Calcul des métriques avancées
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const lastMonth = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

    const recentInvoices = invoices.filter(i => i.createdAt >= thirtyDaysAgo)
    const previousInvoices = invoices.filter(i => i.createdAt >= lastMonth && i.createdAt < thirtyDaysAgo)
    
    const recentExpenses = expenses.filter(e => e.createdAt >= thirtyDaysAgo)
    const previousExpenses = expenses.filter(e => e.createdAt >= lastMonth && e.createdAt < thirtyDaysAgo)

    // Analyse financière
    const currentRevenue = recentInvoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + i.amount, 0)
    const previousRevenue = previousInvoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + i.amount, 0)
    const revenueGrowth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0

    const currentExpenses = recentExpenses.reduce((sum, e) => sum + e.amount, 0)
    const previousExpenseSum = previousExpenses.reduce((sum, e) => sum + e.amount, 0)

    // Analyse des projets
    const activeProjects = projects.filter(p => p.status === 'IN_PROGRESS')
    const completedProjects = projects.filter(p => p.status === 'COMPLETED')
    const averageProjectValue = projects.length > 0 ? projects.reduce((sum, p) => sum + p.amount, 0) / projects.length : 0

    // Analyse des tâches
    const overdueTasks = tasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < now && t.status !== 'DONE'
    )
    const urgentTasks = tasks.filter(t => t.priority === 'URGENT' && t.status !== 'DONE')
    const taskCompletionRate = tasks.length > 0 ? (tasks.filter(t => t.status === 'DONE').length / tasks.length) * 100 : 0

    // Analyse client
    const topClients = clients
      .map(c => ({
        ...c,
        totalValue: c.projects.reduce((sum, p) => sum + p.amount, 0)
      }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 3)

    const businessData = {
      period: "30 derniers jours",
      financial: {
        currentRevenue,
        previousRevenue,
        revenueGrowth: Math.round(revenueGrowth * 100) / 100,
        currentExpenses,
        profit: currentRevenue - currentExpenses,
        pendingRevenue: invoices.filter(i => i.status === 'PENDING').reduce((sum, i) => sum + i.amount, 0)
      },
      projects: {
        total: projects.length,
        active: activeProjects.length,
        completed: completedProjects.length,
        averageValue: Math.round(averageProjectValue),
        completionRate: projects.length > 0 ? Math.round((completedProjects.length / projects.length) * 100) : 0
      },
      tasks: {
        total: tasks.length,
        overdue: overdueTasks.length,
        urgent: urgentTasks.length,
        completionRate: Math.round(taskCompletionRate)
      },
      clients: {
        total: clients.length,
        topClients: topClients.map(c => ({ name: c.name, value: c.totalValue, projects: c._count.projects }))
      },
      alerts: [
        ...(overdueTasks.length > 0 ? [`${overdueTasks.length} tâche(s) en retard`] : []),
        ...(urgentTasks.length > 3 ? [`${urgentTasks.length} tâches urgentes`] : []),
        ...(revenueGrowth < -10 ? [`Baisse de chiffre d'affaires de ${Math.abs(revenueGrowth)}%`] : []),
      ]
    }

    // Génération de l'analyse IA
    const analysis = await llm.invoke(
      await analysisPrompt.format({
        businessData: JSON.stringify(businessData, null, 2),
        period: "30 derniers jours"
      })
    )

    let parsedAnalysis
    try {
      // Tentative de parsing JSON du contenu IA
      const jsonMatch = analysis.content.toString().match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsedAnalysis = JSON.parse(jsonMatch[0])
      } else {
        throw new Error("Format JSON non trouvé")
      }
    } catch (error) {
      // Fallback avec structure manuelle
      parsedAnalysis = {
        resumeExecutif: "Analyse générée avec succès. Consultez les données détaillées ci-dessous.",
        insightsStrategiques: [
          `📊 ${projects.length} projets gérés avec ${Math.round(taskCompletionRate)}% de tâches complétées`,
          `💰 Chiffre d'affaires : ${currentRevenue.toLocaleString()} XOF sur 30 jours`,
          `⚠️ ${overdueTasks.length} tâche(s) en retard nécessitent une attention`,
          `🎯 ${urgentTasks.length} tâche(s) urgente(s) en cours`
        ],
        recommendationsPrioritaires: [
          overdueTasks.length > 0 ? "Traiter en priorité les tâches en retard" : "Maintenir le rythme de productivité",
          revenueGrowth > 0 ? "Capitaliser sur la croissance actuelle" : "Analyser les opportunités de nouveaux projets",
          urgentTasks.length > 3 ? "Optimiser la planification pour réduire l'urgence" : "Continuer la gestion proactive"
        ],
        metriquesClés: [
          `Taux de completion des tâches: ${Math.round(taskCompletionRate)}%`,
          `Croissance du CA: ${revenueGrowth > 0 ? '+' : ''}${Math.round(revenueGrowth)}%`,
          `Projets actifs: ${activeProjects.length}`
        ]
      }
    }

    return NextResponse.json({
      analysis: parsedAnalysis,
      rawData: businessData,
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error("Erreur analyse IA:", error)
    return NextResponse.json(
      { 
        message: "Erreur lors de l'analyse IA",
        error: error instanceof Error ? error.message : "Erreur inconnue" 
      },
      { status: 500 }
    )
  }
} 