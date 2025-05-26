import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const templates = await prisma.emailTemplate.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Erreur lors du chargement des templates:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement des templates' },
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

    const data = await request.json()

    // Validation des champs requis
    if (!data.name || !data.subject || !data.content) {
      return NextResponse.json(
        { error: 'Les champs nom, sujet et contenu sont requis' },
        { status: 400 }
      )
    }

    const template = await prisma.emailTemplate.create({
      data: {
        userId: session.user.id,
        name: data.name,
        subject: data.subject,
        content: data.content,
        type: data.type || 'custom'
      }
    })

    return NextResponse.json(template)
  } catch (error) {
    console.error('Erreur lors de la création du template:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du template' },
      { status: 500 }
    )
  }
} 