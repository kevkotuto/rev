import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const emails = await prisma.email.findMany({
      where: { userId: session.user.id },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true
          }
        },
        project: {
          select: {
            id: true,
            name: true
          }
        },
        client: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(emails)
  } catch (error) {
    console.error('Erreur lors du chargement des emails:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement des emails' },
      { status: 500 }
    )
  }
} 