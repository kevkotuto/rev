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

    const body = await request.json()
    const { title, description, priority, date } = body
    const eventId = params.id

    // Analyser l'ID de l'événement pour déterminer le type
    const [type, actualId] = eventId.includes('-') 
      ? eventId.split('-').slice(0, 2) 
      : ['unknown', eventId]

    let result

    switch (type) {
      case 'task':
        result = await prisma.task.update({
          where: { 
            id: actualId,
            userId: session.user.id 
          },
          data: {
            title: title || undefined,
            description: description || undefined,
            priority: priority || undefined,
            dueDate: date ? new Date(date) : undefined
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
          description: result.description,
          project: result.project
        })

      default:
        return NextResponse.json({ error: 'Modification non supportée pour ce type d\'événement' }, { status: 400 })
    }

  } catch (error) {
    console.error('Erreur lors de la modification:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la modification de l\'événement' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const eventId = params.id

    // Analyser l'ID de l'événement pour déterminer le type
    const [type, actualId] = eventId.includes('-') 
      ? eventId.split('-').slice(0, 2) 
      : ['unknown', eventId]

    switch (type) {
      case 'task':
        await prisma.task.delete({
          where: { 
            id: actualId,
            userId: session.user.id 
          }
        })
        
        return NextResponse.json({ success: true })

      default:
        return NextResponse.json({ error: 'Suppression non supportée pour ce type d\'événement' }, { status: 400 })
    }

  } catch (error) {
    console.error('Erreur lors de la suppression:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'événement' },
      { status: 500 }
    )
  }
} 