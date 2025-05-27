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

    // Essayer d'abord l'API /v1/me pour plus d'informations
    let waveResponse = await fetch('https://api.wave.com/v1/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${user.waveApiKey}`,
        'Content-Type': 'application/json'
      }
    })

    let waveData
    let account_name = null
    let account_mobile = null

    if (waveResponse.ok) {
      // API /v1/me réussie - récupérer les infos du compte
      waveData = await waveResponse.json()
      account_name = waveData.name || waveData.account_name || null
      account_mobile = waveData.mobile || waveData.phone || null
      
      // Si pas de balance dans /v1/me, essayer /v1/balance
      if (!waveData.balance && !waveData.amount) {
        const balanceResponse = await fetch('https://api.wave.com/v1/balance', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${user.waveApiKey}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (balanceResponse.ok) {
          const balanceData = await balanceResponse.json()
          waveData.amount = balanceData.amount
          waveData.currency = balanceData.currency
        }
      }
    } else {
      // Fallback vers /v1/balance
      waveResponse = await fetch('https://api.wave.com/v1/balance', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.waveApiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!waveResponse.ok) {
        const errorData = await waveResponse.json().catch(() => ({}))
        console.error('Erreur Wave API Balance:', {
          status: waveResponse.status,
          statusText: waveResponse.statusText,
          error: errorData
        })
        
        return NextResponse.json(
          { 
            message: "Erreur lors de la récupération du solde Wave", 
            error: errorData,
            status: waveResponse.status 
          },
          { status: waveResponse.status }
        )
      }

      waveData = await waveResponse.json()
    }

    return NextResponse.json({
      balance: waveData.balance || waveData.amount,
      currency: waveData.currency,
      account_name,
      account_mobile
    })

  } catch (error) {
    console.error("Erreur lors de la récupération du solde Wave:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 