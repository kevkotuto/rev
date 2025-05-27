import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Non autorisé" },
        { status: 401 }
      )
    }

    const { id: payoutId } = await params

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

    // Appeler l'API Wave pour récupérer les détails du paiement
    const waveResponse = await fetch(`https://api.wave.com/v1/payout/${payoutId}`, {
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
        { message: "Erreur lors de la récupération du paiement Wave", error: errorData },
        { status: waveResponse.status }
      )
    }

    const waveData = await waveResponse.json()

    // Rechercher la dépense locale correspondante
    let localExpense = null
    try {
      localExpense = await prisma.expense.findFirst({
        where: {
          userId: session.user.id,
          category: 'PROVIDER_PAYMENT',
          notes: {
            contains: payoutId
          }
        },
        include: {
          project: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })
    } catch (error) {
      // Si on ne trouve pas la dépense locale, ce n'est pas grave
      console.log('Dépense locale non trouvée pour le paiement:', payoutId)
    }

    // Retourner les données Wave enrichies avec les informations locales
    const enrichedData = {
      wave: waveData,
      local: localExpense ? {
        id: localExpense.id,
        description: localExpense.description,
        date: localExpense.date,
        notes: localExpense.notes,
        project: localExpense.project
      } : null
    }

    return NextResponse.json(enrichedData)

  } catch (error) {
    console.error("Erreur lors de la récupération du paiement Wave:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 