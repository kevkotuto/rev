import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { ChatOpenAI } from "@langchain/openai"
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents"
import { ChatPromptTemplate } from "@langchain/core/prompts"
import { HumanMessage, AIMessage } from "@langchain/core/messages"
import { DynamicStructuredTool } from "@langchain/core/tools"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

// Configuration du modèle IA
const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0.7,
  openAIApiKey: process.env.OPENAI_API_KEY,
})

// Outils personnalisés pour REV
const createTaskTool = new DynamicStructuredTool({
  name: "create_task",
  description: "Créer une nouvelle tâche pour l'utilisateur",
  schema: z.object({
    title: z.string().describe("Titre de la tâche"),
    description: z.string().optional().describe("Description détaillée"),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
    dueDate: z.string().optional().describe("Date d'échéance (YYYY-MM-DD)"),
    projectId: z.string().optional().describe("ID du projet associé"),
  }),
  func: async ({ title, description, priority, dueDate, projectId }, runManager, userId) => {
    try {
      const taskData: any = {
        title,
        description,
        priority,
        status: "TODO",
        userId: userId as string,
        dueDate: dueDate ? new Date(dueDate) : null,
      }

      if (projectId) {
        taskData.projectId = projectId
      }

      const task = await prisma.task.create({
        data: taskData,
        include: {
          project: { select: { name: true } }
        }
      })

      return `✅ Tâche créée avec succès: "${title}" (Priorité: ${priority})`
    } catch (error) {
      return `❌ Erreur lors de la création de la tâche: ${error}`
    }
  },
})

const getProjectsTool = new DynamicStructuredTool({
  name: "get_projects",
  description: "Récupérer la liste des projets de l'utilisateur",
  schema: z.object({
    limit: z.number().optional().default(10).describe("Nombre maximum de projets à retourner"),
    status: z.string().optional().describe("Filtrer par statut (IN_PROGRESS, COMPLETED, etc.)"),
  }),
  func: async ({ limit, status }, runManager, userId) => {
    try {
      const where: any = { userId: userId as string }
      if (status) where.status = status

      const projects = await prisma.project.findMany({
        where,
        take: limit,
        include: {
          client: { select: { name: true } },
          _count: { select: { tasks: true } }
        },
        orderBy: { updatedAt: 'desc' }
      })

      return JSON.stringify(projects.map(p => ({
        id: p.id,
        name: p.name,
        status: p.status,
        amount: p.amount,
        client: p.client?.name,
        tasksCount: p._count.tasks,
        updatedAt: p.updatedAt
      })))
    } catch (error) {
      return `❌ Erreur lors de la récupération des projets: ${error}`
    }
  },
})

const getStatsTool = new DynamicStructuredTool({
  name: "get_dashboard_stats",
  description: "Récupérer les statistiques du dashboard",
  schema: z.object({}),
  func: async ({}, runManager, userId) => {
    try {
      // Statistiques générales
      const [clients, projects, tasks, invoices, expenses] = await Promise.all([
        prisma.client.count({ where: { userId: userId as string } }),
        prisma.project.findMany({
          where: { userId: userId as string },
          select: { status: true, amount: true }
        }),
        prisma.task.findMany({
          where: { userId: userId as string },
          select: { status: true, priority: true, dueDate: true }
        }),
        prisma.invoice.findMany({
          where: { userId: userId as string },
          select: { status: true, amount: true, type: true }
        }),
        prisma.expense.aggregate({
          where: { userId: userId as string },
          _sum: { amount: true }
        })
      ])

      const stats = {
        clients: clients,
        projects: {
          total: projects.length,
          active: projects.filter(p => p.status === 'IN_PROGRESS').length,
          completed: projects.filter(p => p.status === 'COMPLETED').length,
          totalValue: projects.reduce((sum, p) => sum + p.amount, 0)
        },
        tasks: {
          total: tasks.length,
          todo: tasks.filter(t => t.status === 'TODO').length,
          inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
          done: tasks.filter(t => t.status === 'DONE').length,
          overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE').length
        },
        financial: {
          totalRevenue: invoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + i.amount, 0),
          pendingRevenue: invoices.filter(i => i.status === 'PENDING').reduce((sum, i) => sum + i.amount, 0),
          totalExpenses: expenses._sum.amount || 0
        }
      }

      return JSON.stringify(stats)
    } catch (error) {
      return `❌ Erreur lors de la récupération des statistiques: ${error}`
    }
  },
})

const createProjectTool = new DynamicStructuredTool({
  name: "create_project",
  description: "Créer un nouveau projet",
  schema: z.object({
    name: z.string().describe("Nom du projet"),
    description: z.string().optional().describe("Description du projet"),
    amount: z.number().describe("Montant du projet"),
    clientId: z.string().optional().describe("ID du client"),
    type: z.enum(["CLIENT", "PERSONAL", "DEVELOPMENT", "MAINTENANCE", "CONSULTING"]).default("CLIENT"),
    startDate: z.string().optional().describe("Date de début (YYYY-MM-DD)"),
    endDate: z.string().optional().describe("Date de fin (YYYY-MM-DD)"),
  }),
  func: async ({ name, description, amount, clientId, type, startDate, endDate }, runManager, userId) => {
    try {
      const projectData: any = {
        name,
        description,
        amount,
        type,
        userId: userId as string,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      }

      if (clientId) {
        projectData.clientId = clientId
      }

      const project = await prisma.project.create({
        data: projectData,
        include: {
          client: { select: { name: true } }
        }
      })

      return `🚀 Projet créé avec succès: "${name}" (Montant: ${amount} XOF)`
    } catch (error) {
      return `❌ Erreur lors de la création du projet: ${error}`
    }
  },
})

const analyzeWorkloadTool = new DynamicStructuredTool({
  name: "analyze_workload",
  description: "Analyser la charge de travail et suggérer des optimisations",
  schema: z.object({}),
  func: async ({}, runManager, userId) => {
    try {
      const [tasks, projects] = await Promise.all([
        prisma.task.findMany({
          where: { userId: userId as string },
          include: { project: { select: { name: true } } },
          orderBy: { dueDate: 'asc' }
        }),
        prisma.project.findMany({
          where: { userId: userId as string, status: 'IN_PROGRESS' },
          include: { _count: { select: { tasks: true } } }
        })
      ])

      const overdueTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE')
      const urgentTasks = tasks.filter(t => t.priority === 'URGENT' && t.status !== 'DONE')
      const todayTasks = tasks.filter(t => {
        if (!t.dueDate) return false
        const today = new Date()
        const taskDate = new Date(t.dueDate)
        return taskDate.toDateString() === today.toDateString() && t.status !== 'DONE'
      })

      const analysis = {
        overdueTasks: overdueTasks.length,
        urgentTasks: urgentTasks.length,
        todayTasks: todayTasks.length,
        activeProjects: projects.length,
        recommendations: [] as string[]
      }

      // Génération de recommandations
      if (overdueTasks.length > 0) {
        analysis.recommendations.push(`⚠️  Vous avez ${overdueTasks.length} tâche(s) en retard à traiter en priorité`)
      }
      
      if (urgentTasks.length > 3) {
        analysis.recommendations.push(`🔥 Trop de tâches urgentes (${urgentTasks.length}). Considérez déléguer ou reprogrammer`)
      }

      if (projects.length > 5) {
        analysis.recommendations.push(`📊 Vous gérez ${projects.length} projets actifs. Considérez finaliser certains projets`)
      }

      return JSON.stringify(analysis)
    } catch (error) {
      return `❌ Erreur lors de l'analyse: ${error}`
    }
  },
})

// Configuration du prompt système
const systemPrompt = `Tu es REV AI, l'assistant intelligent de l'application de gestion freelance REV en Côte d'Ivoire.

Tu es un expert en gestion de projets, productivité et business freelance. Tu peux :

🎯 **Gestion des tâches**
- Créer, organiser et prioriser les tâches
- Analyser la charge de travail
- Suggérer des optimisations

📊 **Analyse business** 
- Fournir des statistiques détaillées
- Analyser les performances
- Identifier les opportunités

🚀 **Automation**
- Générer automatiquement des tâches basées sur les projets
- Suggérer des actions proactives
- Optimiser les flux de travail

💡 **Conseils strategiques**
- Améliorer la productivité
- Optimiser la rentabilité
- Développer l'activité freelance

Contexte local : Tu connais le marché ivoirien, utilises la devise XOF (Franc CFA), et comprends les défis du freelancing en Afrique de l'Ouest.

Ton style : Professionnel mais accessible, avec des emojis pour rendre les interactions plus engageantes. Tu utilises le français de Côte d'Ivoire.

Utilise tes outils disponibles pour obtenir des données en temps réel et effectuer des actions concrètes.`

const prompt = ChatPromptTemplate.fromMessages([
  ["system", systemPrompt],
  ["placeholder", "{chat_history}"],
  ["human", "{input}"],
  ["placeholder", "{agent_scratchpad}"],
])

// Liste des outils disponibles
const tools = [
  createTaskTool,
  getProjectsTool, 
  getStatsTool,
  createProjectTool,
  analyzeWorkloadTool
]

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Non autorisé" },
        { status: 401 }
      )
    }

    const { message, history = [] } = await request.json()

    if (!message) {
      return NextResponse.json(
        { message: "Message requis" },
        { status: 400 }
      )
    }

    // Convertir l'historique en format LangChain
    const chatHistory = history.map((msg: any) => 
      msg.role === 'user' 
        ? new HumanMessage(msg.content)
        : new AIMessage(msg.content)
    )

    // Créer l'agent avec les outils personnalisés qui ont accès à l'ID utilisateur
    const toolsWithUserId = tools.map(tool => {
      return new DynamicStructuredTool({
        name: tool.name,
        description: tool.description,
        schema: tool.schema,
        func: async (input, runManager) => {
          return (tool.func as any)(input, runManager, session.user.id)
        }
      })
    })

    // Créer l'agent avec les outils personnalisés
    const agent = await createOpenAIFunctionsAgent({
      llm,
      tools: toolsWithUserId,
      prompt,
    })

    const agentExecutor = new AgentExecutor({
      agent,
      tools: toolsWithUserId,
      verbose: true,
    })

    // Exécuter l'agent
    const result = await agentExecutor.invoke({
      input: message,
      chat_history: chatHistory,
    })

    return NextResponse.json({
      message: result.output,
      success: true
    })

  } catch (error) {
    console.error("Erreur IA:", error)
    return NextResponse.json(
      { 
        message: "Je rencontre une difficulté technique. Veuillez réessayer dans quelques instants.",
        error: error instanceof Error ? error.message : "Erreur inconnue" 
      },
      { status: 500 }
    )
  }
} 