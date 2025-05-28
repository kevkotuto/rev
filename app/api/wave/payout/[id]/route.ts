import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const WAVE_API_URL = "https://api.wave.com/v1"

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

    // Récupérer le token Wave API de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { waveApiKey: true }
    })

    if (!user?.waveApiKey) {
      return NextResponse.json(
        { message: "Token Wave API manquant. Veuillez configurer votre clé API Wave dans les paramètres." },
        { status: 400 }
      )
    }

    const { id } = await params

    const response = await fetch(`${WAVE_API_URL}/payout/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${user.waveApiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      const payout = await response.json()
      return NextResponse.json(payout)
    } else {
      const error = await response.json()
      return NextResponse.json(
        { message: error.error_message || "Erreur lors de la récupération du paiement" },
        { status: response.status }
      )
    }

  } catch (error) {
    console.error("Erreur lors de la récupération du paiement:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 