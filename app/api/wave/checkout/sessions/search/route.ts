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
    const clientReference = searchParams.get('client_reference')

    if (!clientReference) {
      return NextResponse.json(
        { message: "Référence client requise pour la recherche" },
        { status: 400 }
      )
    }

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

    // Appeler l'API Wave pour rechercher les sessions checkout
    const waveResponse = await fetch(`https://api.wave.com/v1/checkout/sessions/search?client_reference=${encodeURIComponent(clientReference)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${user.waveApiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!waveResponse.ok) {
      const errorData = await waveResponse.json().catch(() => ({}))
      return NextResponse.json(
        { message: "Erreur lors de la recherche des sessions checkout", error: errorData },
        { status: waveResponse.status }
      )
    }

    const waveData = await waveResponse.json()

    // Récupérer les enregistrements locaux associés
    const localCheckouts = await prisma.waveTransactionAssignment.findMany({
      where: {
        userId: session.user.id,
        type: "checkout",
        transactionId: {
          in: waveData.result?.map((checkout: any) => checkout.id) || []
        }
      },
      include: {
        project: true,
        client: true
      }
    })

    // Enrichir les données Wave avec les informations locales
    const enrichedResults = waveData.result?.map((checkout: any) => {
      const localRecord = localCheckouts.find(assignment => assignment.transactionId === checkout.id)
      return {
        ...checkout,
        localRecord
      }
    }) || []

    return NextResponse.json({
      success: true,
      result: enrichedResults,
      total: enrichedResults.length
    })

  } catch (error) {
    console.error("Erreur lors de la recherche des sessions checkout:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 