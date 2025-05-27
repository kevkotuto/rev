import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { newDate } = await request.json()
    const eventId = params.id

    if (!newDate) {
      return NextResponse.json({ error: 'Nouvelle date requise' }, { status: 400 })
    }

    // Analyser l'ID de l'événement pour déterminer le type
    const [type, actualId] = eventId.includes('-') 
      ? eventId.split('-').slice(0, 2) 
      : ['unknown', eventId]

    const newDateTime = new Date(newDate)

    let result

    switch (type) {
      case 'task':
        // Déplacer une tâche (changer sa date d'échéance)
        result = await prisma.task.update({
          where: { 
            id: actualId,
            userId: session.user.id 
          },
          data: { 
            dueDate: newDateTime 
          },
          include: {
            project: {
              select: { name: true }
            }
          }
        })
        
        return NextResponse.json({
          id: eventId,
          title: result.title,
          type: 'task',
          date: result.dueDate?.toISOString(),
          status: result.status,
          priority: result.priority,
          project: result.project
        })

      case 'project':
        // Déplacer un projet (début ou fin)
        const [, , projectType] = eventId.split('-')
        const updateField = projectType === 'start' ? 'startDate' : 'endDate'
        
        result = await prisma.project.update({
          where: { 
            id: actualId,
            userId: session.user.id 
          },
          data: { 
            [updateField]: newDateTime 
          }
        })
        
        return NextResponse.json({
          id: eventId,
          title: projectType === 'start' ? `Début: ${result.name}` : `Fin: ${result.name}`,
          type: 'project',
          date: newDateTime.toISOString(),
          status: result.status,
          project: {
            name: result.name
          }
        })

      case 'invoice':
        // Déplacer une facture (changer sa date d'échéance)
        result = await prisma.invoice.update({
          where: { 
            id: actualId,
            userId: session.user.id 
          },
          data: { 
            dueDate: newDateTime 
          },
          include: {
            project: {
              select: { name: true }
            }
          }
        })
        
        return NextResponse.json({
          id: eventId,
          title: `Échéance: ${result.invoiceNumber}`,
          type: 'invoice',
          date: result.dueDate?.toISOString(),
          status: result.status,
          project: result.project
        })

      default:
        return NextResponse.json({ error: 'Type d\'événement non reconnu' }, { status: 400 })
    }

  } catch (error) {
    console.error('Erreur lors du déplacement:', error)
    return NextResponse.json(
      { error: 'Erreur lors du déplacement de l\'événement' },
      { status: 500 }
    )
  }
} 