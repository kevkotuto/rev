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

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
    const first = parseInt(searchParams.get('first') || '50')
    const after = searchParams.get('after')

    // Récupérer la clé API Wave de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        waveApiKey: true
      }
    })

    if (!user?.waveApiKey) {
      return NextResponse.json(
        { message: "Clé API Wave non configurée" },
        { status: 400 }
      )
    }

    // Construire l'URL de l'API Wave
    const waveUrl = new URL('https://api.wave.com/v1/transactions')
    waveUrl.searchParams.append('date', date)
    waveUrl.searchParams.append('first', first.toString())
    if (after) {
      waveUrl.searchParams.append('after', after)
    }

    // Appeler l'API Wave
    const waveResponse = await fetch(waveUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${user.waveApiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!waveResponse.ok) {
      const errorData = await waveResponse.json().catch(() => ({}))
      console.error('Erreur Wave API:', errorData)
      
      return NextResponse.json(
        { message: "Erreur lors de la récupération des transactions Wave", error: errorData },
        { status: waveResponse.status }
      )
    }

    const waveData = await waveResponse.json()

    // Stocker l'userId pour éviter les problèmes de contexte
    const userId = session.user.id

    // Enrichir les transactions avec les données locales
    const enrichedTransactions = []
    
    for (const transaction of waveData.items) {
      try {
        // Rechercher si cette transaction est déjà assignée localement
        const localAssignment = await prisma.waveTransactionAssignment.findUnique({
          where: {
            userId_transactionId: {
              userId: userId,
              transactionId: transaction.transaction_id
            }
          },
          include: {
            project: {
              select: { id: true, name: true }
            },
            client: {
              select: { id: true, name: true }
            },
            provider: {
              select: { id: true, name: true }
            }
          }
        })

        enrichedTransactions.push({
          ...transaction,
          localAssignment: localAssignment ? {
            id: localAssignment.id,
            type: localAssignment.type,
            description: localAssignment.description,
            notes: localAssignment.notes,
            project: localAssignment.project,
            client: localAssignment.client,
            provider: localAssignment.provider,
            assignedAt: localAssignment.createdAt
          } : null
        })
      } catch (error) {
        console.error(`Erreur lors de l'enrichissement de la transaction ${transaction.transaction_id}:`, error)
        // Ajouter la transaction sans assignation en cas d'erreur
        enrichedTransactions.push({
          ...transaction,
          localAssignment: null
        })
      }
    }

    return NextResponse.json({
      page_info: waveData.page_info,
      date: date,
      items: enrichedTransactions
    })

  } catch (error) {
    console.error("Erreur lors de la récupération des transactions Wave:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 