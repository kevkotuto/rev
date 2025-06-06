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
    const startParam = searchParams.get('start')
    const endParam = searchParams.get('end')

    if (!startParam || !endParam) {
      return NextResponse.json({ error: 'Les paramètres start et end sont requis' }, { status: 400 })
    }

    const startDate = new Date(startParam)
    const endDate = new Date(endParam)

    // Récupérer les tâches avec échéances
    const tasks = await prisma.task.findMany({
      where: {
        userId: session.user.id,
        dueDate: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        project: {
          select: {
            name: true
          }
        }
      }
    })

    // Récupérer les projets avec dates de début/fin
    const projects = await prisma.project.findMany({
      where: {
        userId: session.user.id,
        OR: [
          {
            startDate: {
              gte: startDate,
              lte: endDate
            }
          },
          {
            endDate: {
              gte: startDate,
              lte: endDate
            }
          }
        ]
      }
    })

    // Récupérer les factures avec échéances
    const invoices = await prisma.invoice.findMany({
      where: {
        userId: session.user.id,
        dueDate: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        project: {
          select: {
            name: true
          }
        }
      }
    })

    // Formater les événements pour le calendrier
    const events: any[] = []

    // Ajouter les tâches
    tasks.forEach(task => {
      if (task.dueDate) {
        events.push({
          id: `task-${task.id}`,
          title: task.title,
          type: 'task',
          date: task.dueDate.toISOString(),
          status: task.status,
          priority: task.priority,
          project: task.project
        })
      }
    })

    // Ajouter les projets (dates de début)
    projects.forEach(project => {
      if (project.startDate) {
        events.push({
          id: `project-start-${project.id}`,
          title: `Début: ${project.name}`,
          type: 'project',
          date: project.startDate.toISOString(),
          status: project.status,
          project: {
            name: project.name
          }
        })
      }
      
      if (project.endDate) {
        events.push({
          id: `project-end-${project.id}`,
          title: `Fin: ${project.name}`,
          type: 'project',
          date: project.endDate.toISOString(),
          status: project.status,
          project: {
            name: project.name
          }
        })
      }
    })

    // Ajouter les factures
    invoices.forEach(invoice => {
      if (invoice.dueDate) {
        events.push({
          id: `invoice-${invoice.id}`,
          title: `Échéance: ${invoice.invoiceNumber}`,
          type: 'invoice',
          date: invoice.dueDate.toISOString(),
          status: invoice.status,
          project: invoice.project
        })
      }
    })

    // Trier les événements par date
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return NextResponse.json(events)
  } catch (error) {
    console.error('Erreur lors du chargement du calendrier:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement du calendrier' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { title, type, date, description, priority, projectId, reminder, reminderTime } = body

    if (!title || !type || !date) {
      return NextResponse.json({ error: 'Titre, type et date sont requis' }, { status: 400 })
    }

    let result

    switch (type) {
      case 'task':
        // Créer une nouvelle tâche
        result = await prisma.task.create({
          data: {
            title,
            description,
            status: 'TODO',
            priority: priority || 'MEDIUM',
            dueDate: new Date(date),
            projectId: projectId || null,
            userId: session.user.id
          },
          include: {
            project: {
              select: { name: true }
            }
          }
        })

        return NextResponse.json({
          id: `task-${result.id}`,
          title: result.title,
          type: 'task',
          date: result.dueDate?.toISOString(),
          status: result.status,
          priority: result.priority,
          description: result.description,
          project: result.project
        })

      case 'reminder':
        // Créer un rappel comme tâche avec priorité spéciale
        result = await prisma.task.create({
          data: {
            title,
            description,
            status: 'TODO',
            priority: 'HIGH',
            dueDate: new Date(date),
            projectId: projectId || null,
            userId: session.user.id
          },
          include: {
            project: {
              select: { name: true }
            }
          }
        })

        return NextResponse.json({
          id: `task-${result.id}`,
          title: result.title,
          type: 'task',
          date: result.dueDate?.toISOString(),
          status: result.status,
          priority: result.priority,
          description: result.description,
          reminder: true,
          reminderTime,
          project: result.project
        })

      default:
        return NextResponse.json({ error: 'Type d\'événement non supporté pour la création' }, { status: 400 })
    }

  } catch (error) {
    console.error('Erreur lors de la création de l\'événement:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'événement' },
      { status: 500 }
    )
  }
} 