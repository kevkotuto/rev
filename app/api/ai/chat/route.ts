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
  description: "Récupérer la liste des projets de l'utilisateur avec possibilité de recherche par nom",
  schema: z.object({
    limit: z.number().optional().default(10).describe("Nombre maximum de projets à retourner"),
    status: z.string().optional().describe("Filtrer par statut (IN_PROGRESS, COMPLETED, etc.)"),
    searchName: z.string().optional().describe("Rechercher un projet par nom (recherche insensible à la casse)"),
  }),
  func: async ({ limit, status, searchName }, runManager, userId) => {
    try {
      const where: any = { userId: userId as string }
      if (status) where.status = status
      if (searchName) {
        where.name = {
          contains: searchName,
          mode: 'insensitive'
        }
      }

      const projects = await prisma.project.findMany({
        where,
        take: limit,
        include: {
          client: { select: { name: true } },
          _count: { select: { tasks: true } }
        },
        orderBy: { updatedAt: 'desc' }
      })

      if (projects.length === 0) {
        if (searchName) {
          // Si aucun projet trouvé avec le nom recherché, chercher tous les projets
          const allProjects = await prisma.project.findMany({
            where: { userId: userId as string },
            take: 5,
            include: {
              client: { select: { name: true } },
              _count: { select: { tasks: true } }
            },
            orderBy: { updatedAt: 'desc' }
          })
          
          if (allProjects.length === 0) {
            return `❌ Aucun projet trouvé avec le nom "${searchName}" et vous n'avez aucun projet existant. Voulez-vous que je crée le projet "${searchName}" pour vous ?`
          }
          
          const projectNames = allProjects.map(p => `- ${p.name}`).join('\n')
          return `❌ Aucun projet trouvé avec le nom "${searchName}". Voici vos projets existants :\n\n${projectNames}\n\nVoulez-vous que je crée le projet "${searchName}" ou souhaitez-vous travailler avec un projet existant ?`
        }
        return "❌ Aucun projet trouvé. Vous pouvez créer un nouveau projet si vous le souhaitez."
      }

      const projectList = projects.map(p => ({
        id: p.id,
        name: p.name,
        status: p.status,
        amount: p.amount,
        client: p.client?.name,
        tasksCount: p._count.tasks,
        updatedAt: p.updatedAt
      }))

      const projectsText = projectList.map(p => 
        `📁 **${p.name}** (ID: ${p.id})\n   - Statut: ${p.status}\n   - Montant: ${p.amount} XOF\n   - Client: ${p.client || 'Aucun'}\n   - Tâches: ${p.tasksCount}`
      ).join('\n\n')

      return `✅ **${projects.length} projet(s) trouvé(s)** :\n\n${projectsText}`
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

const createProjectTasksTool = new DynamicStructuredTool({
  name: "create_project_tasks",
  description: "Créer plusieurs tâches pour un projet spécifique basées sur le type de projet",
  schema: z.object({
    projectId: z.string().describe("ID du projet"),
    taskTemplates: z.array(z.object({
      title: z.string(),
      description: z.string().optional(),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
      estimatedDays: z.number().optional()
    })).describe("Liste des tâches à créer")
  }),
  func: async ({ projectId, taskTemplates }, runManager, userId) => {
    try {
      // Vérifier que le projet appartient à l'utilisateur
      const project = await prisma.project.findFirst({
        where: { id: projectId, userId: userId as string },
        include: { client: { select: { name: true } } }
      })

      if (!project) {
        return `❌ Projet non trouvé ou vous n'y avez pas accès.`
      }

      const createdTasks = []
      const baseDate = new Date()

      for (let i = 0; i < taskTemplates.length; i++) {
        const template = taskTemplates[i]
        const dueDate = new Date(baseDate)
        if (template.estimatedDays) {
          dueDate.setDate(baseDate.getDate() + template.estimatedDays + (i * 2)) // Espacement entre les tâches
        }

        const task = await prisma.task.create({
          data: {
            title: template.title,
            description: template.description,
            priority: template.priority,
            projectId: projectId,
            userId: userId as string,
            status: "TODO",
            dueDate: template.estimatedDays ? dueDate : null
          }
        })

        createdTasks.push({
          title: task.title,
          priority: task.priority,
          dueDate: task.dueDate
        })
      }

      return `✅ ${createdTasks.length} tâches créées avec succès pour le projet "${project.name}" !\n\n` +
             createdTasks.map((task, index) => 
               `${index + 1}. ${task.title} (${task.priority}${task.dueDate ? ` - Échéance: ${task.dueDate.toLocaleDateString('fr-FR')}` : ''})`
             ).join('\n')

    } catch (error) {
      return `❌ Erreur lors de la création des tâches: ${error}`
    }
  },
})

const createWebProjectTasksTool = new DynamicStructuredTool({
  name: "create_web_project_tasks",
  description: "Créer automatiquement des tâches pour un projet web (Next.js, React, etc.) avec des tâches prédéfinies",
  schema: z.object({
    projectName: z.string().describe("Nom du projet web"),
    projectType: z.enum(["nextjs", "react", "vue", "web"]).default("nextjs").describe("Type de projet web"),
    includeDeployment: z.boolean().default(true).describe("Inclure les tâches de déploiement"),
    hostingProvider: z.string().optional().describe("Fournisseur d'hébergement (ex: o2switch, vercel, netlify)")
  }),
  func: async ({ projectName, projectType, includeDeployment, hostingProvider }, runManager, userId) => {
    try {
      // Chercher le projet par nom
      const project = await prisma.project.findFirst({
        where: { 
          name: { contains: projectName, mode: 'insensitive' },
          userId: userId as string 
        }
      })

      if (!project) {
        return `❌ Projet "${projectName}" non trouvé. Voulez-vous que je le crée d'abord ?`
      }

      // Templates de tâches pour projet web Next.js
      const webTaskTemplates = [
        {
          title: "🚀 Installation et configuration Next.js",
          description: "Initialiser le projet Next.js avec les dépendances de base",
          priority: "HIGH" as const,
          estimatedDays: 1
        },
        {
          title: "⚙️ Configuration de l'environnement de développement",
          description: "Configurer ESLint, Prettier, TypeScript et les variables d'environnement",
          priority: "MEDIUM" as const,
          estimatedDays: 1
        },
        {
          title: "🎨 Création de la structure des pages",
          description: "Créer les pages principales (accueil, à propos, contact, etc.)",
          priority: "HIGH" as const,
          estimatedDays: 3
        },
        {
          title: "🧩 Développement des composants UI",
          description: "Créer les composants réutilisables (header, footer, navigation, etc.)",
          priority: "MEDIUM" as const,
          estimatedDays: 2
        },
        {
          title: "🔌 Intégration des APIs",
          description: "Connecter les APIs externes et créer les endpoints nécessaires",
          priority: "HIGH" as const,
          estimatedDays: 2
        },
        {
          title: "📱 Responsive Design",
          description: "Optimiser l'affichage pour mobile et tablette",
          priority: "MEDIUM" as const,
          estimatedDays: 2
        },
        {
          title: "🧪 Tests et débogage",
          description: "Tester les fonctionnalités et corriger les bugs",
          priority: "MEDIUM" as const,
          estimatedDays: 1
        }
      ]

      if (includeDeployment) {
        const deploymentProvider = hostingProvider || "o2switch"
        webTaskTemplates.push({
          title: `🌐 Déploiement sur ${deploymentProvider}`,
          description: `Configurer et déployer l'application sur ${deploymentProvider}`,
          priority: "HIGH" as const,
          estimatedDays: 1
        })
      }

      const createdTasks = []
      const baseDate = new Date()

      for (let i = 0; i < webTaskTemplates.length; i++) {
        const template = webTaskTemplates[i]
        const dueDate = new Date(baseDate)
        if (template.estimatedDays) {
          dueDate.setDate(baseDate.getDate() + template.estimatedDays + (i * 1)) // Espacement d'1 jour entre les tâches
        }

        const task = await prisma.task.create({
          data: {
            title: template.title,
            description: template.description,
            priority: template.priority,
            projectId: project.id,
            userId: userId as string,
            status: "TODO",
            dueDate: template.estimatedDays ? dueDate : null
          }
        })

        createdTasks.push({
          title: task.title,
          priority: task.priority,
          dueDate: task.dueDate
        })
      }

      return `🎉 **${createdTasks.length} tâches créées avec succès pour le projet "${project.name}"** !\n\n` +
             `📋 **Planning des tâches :**\n\n` +
             createdTasks.map((task, index) => 
               `${index + 1}. ${task.title}\n   📅 Échéance: ${task.dueDate ? task.dueDate.toLocaleDateString('fr-FR') : 'Non définie'}\n   ⚡ Priorité: ${task.priority}\n`
             ).join('\n') +
             `\n💡 **Conseil :** Commencez par les tâches de priorité HIGH pour établir les fondations du projet !`

    } catch (error) {
      return `❌ Erreur lors de la création des tâches: ${error}`
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
- Créer automatiquement des tâches pour des projets spécifiques

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

**Instructions CRITIQUES :**
1. TOUJOURS répondre à l'utilisateur avec une réponse complète et utile
2. JAMAIS de réponse vide - toujours donner une réponse constructive
3. Si l'utilisateur demande de créer des tâches pour un projet :
   - D'abord utilise get_projects avec searchName pour chercher le projet
   - Si le projet existe, utilise create_web_project_tasks pour les projets web ou create_project_tasks pour les autres
   - Si le projet n'existe pas, propose de le créer avec create_project
4. Pour les projets web (Next.js, React, etc.), utilise TOUJOURS create_web_project_tasks
5. Réponds TOUJOURS en français avec des emojis appropriés
6. Sois proactif et propose des solutions concrètes

**Exemples de réponses attendues :**
- Si on demande des tâches pour "beautelic" : cherche le projet, puis crée les tâches web appropriées
- Si on demande des statistiques : utilise get_dashboard_stats et présente les résultats de façon claire
- Si on demande d'analyser la charge : utilise analyze_workload et donne des recommandations

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
  createProjectTasksTool,
  createWebProjectTasksTool,
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
      maxIterations: 5,
      returnIntermediateSteps: true,
    })

    // Exécuter l'agent
    console.log("🤖 Exécution de l'agent avec le message:", message)
    
    const result = await agentExecutor.invoke({
      input: message,
      chat_history: chatHistory,
    })

    console.log("🤖 Résultat de l'agent:", result)

    // Vérifier si l'agent a fourni une réponse
    let responseMessage = result.output

    // Si pas de réponse de l'agent, fournir une réponse par défaut intelligente
    if (!responseMessage || responseMessage.trim() === "") {
      console.log("⚠️ Réponse vide de l'agent, génération d'une réponse par défaut")
      
      // Analyser le message pour donner une réponse contextuelle
      const lowerMessage = message.toLowerCase()
      
      if (lowerMessage.includes('beautelic')) {
        responseMessage = `🚀 Je vais vous aider avec le projet Beautelic ! Laissez-moi d'abord vérifier si ce projet existe dans votre système, puis je créerai les tâches appropriées pour un projet web Next.js avec déploiement sur o2switch.`
      } else if (lowerMessage.includes('tâche') || lowerMessage.includes('task')) {
        responseMessage = `🎯 Je peux vous aider à créer des tâches ! Voulez-vous que je crée une tâche spécifique ou que j'analyse vos tâches existantes ? Donnez-moi plus de détails sur ce que vous souhaitez faire.`
      } else if (lowerMessage.includes('projet') || lowerMessage.includes('project')) {
        responseMessage = `🚀 Parlons de vos projets ! Je peux vous aider à créer un nouveau projet, analyser vos projets existants, ou créer des tâches pour un projet spécifique. Que souhaitez-vous faire ?`
      } else if (lowerMessage.includes('statistique') || lowerMessage.includes('stat') || lowerMessage.includes('performance')) {
        responseMessage = `📊 Je peux analyser vos performances ! Voulez-vous voir vos statistiques générales, analyser votre charge de travail, ou obtenir des insights sur votre activité freelance ?`
      } else {
        responseMessage = `👋 Bonjour ! Je suis REV AI, votre assistant freelance. Je peux vous aider avec :
        
🎯 **Gestion des tâches** - Créer, organiser, prioriser
📊 **Analyse de performance** - Statistiques et insights
🚀 **Gestion de projets** - Création et suivi
💡 **Conseils business** - Optimisation et stratégie

Comment puis-je vous assister aujourd'hui ?`
      }
    }

    console.log("✅ Réponse finale:", responseMessage)

    return NextResponse.json({
      message: responseMessage,
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