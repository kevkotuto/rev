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

    // Récupérer la configuration Wave de l'utilisateur
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

    // Appel à l'API Wave pour récupérer le solde
    const waveResponse = await fetch('https://api.wave.com/v1/balance', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${user.waveApiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!waveResponse.ok) {
      const error = await waveResponse.text()
      console.error('Erreur API Wave:', error)
      return NextResponse.json(
        { message: "Erreur lors de la récupération du solde Wave" },
        { status: 500 }
      )
    }

    const balanceData = await waveResponse.json()

    return NextResponse.json({
      balance: balanceData.available_balance,
      currency: balanceData.currency,
      lastUpdated: new Date().toISOString()
    })

  } catch (error) {
    console.error("Erreur lors de la récupération du solde Wave:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 