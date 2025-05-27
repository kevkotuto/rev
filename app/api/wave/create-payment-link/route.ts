import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Non autorisé" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { 
      amount, 
      currency = "XOF", 
      description, 
      client_reference,
      recipient_name,
      recipient_phone
    } = body

    // Validation des données
    if (!amount || !description) {
      return NextResponse.json(
        { message: "Montant et description requis" },
        { status: 400 }
      )
    }

    // Validation du montant selon Wave (chaîne, positif, sans décimales pour XOF)
    const numericAmount = parseFloat(amount)
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        { message: "Le montant doit être un nombre positif" },
        { status: 400 }
      )
    }

    // Formatage du montant pour XOF (sans décimales)
    const formattedAmount = Math.round(numericAmount).toString()

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

    // Préparer les données pour l'API Wave
    const wavePayload: any = {
      amount: formattedAmount,
      currency: currency,
      success_url: `${process.env.NODE_ENV === 'production' ? process.env.NEXTAUTH_URL : 'https://rev-freelance.vercel.app'}/payment/success?type=payment_link&amount=${formattedAmount}&currency=${currency}`,
      error_url: `${process.env.NODE_ENV === 'production' ? process.env.NEXTAUTH_URL : 'https://rev-freelance.vercel.app'}/payment/error?type=payment_link&amount=${formattedAmount}&currency=${currency}`,
    }

    // Ajouter la référence client si fournie
    if (client_reference) {
      wavePayload.client_reference = client_reference.substring(0, 255) // Limite Wave
    }

    // Ajouter la restriction de payeur si un numéro est fourni
    if (recipient_phone) {
      // Formater le numéro au format E.164 si nécessaire
      let formattedPhone = recipient_phone.trim()
      if (!formattedPhone.startsWith('+')) {
        // Ajouter +225 pour la Côte d'Ivoire par défaut
        formattedPhone = '+225' + formattedPhone.replace(/^0+/, '')
      }
      wavePayload.restrict_payer_mobile = formattedPhone
    }

    // Appeler l'API Wave pour créer la session de paiement
    const waveResponse = await fetch('https://api.wave.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user.waveApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(wavePayload)
    })

    if (!waveResponse.ok) {
      const errorData = await waveResponse.json().catch(() => ({}))
      console.error('Erreur Wave API:', errorData)
      
      return NextResponse.json(
        { 
          message: "Erreur lors de la création du lien de paiement Wave", 
          error: errorData 
        },
        { status: waveResponse.status }
      )
    }

    const waveData = await waveResponse.json()

    // Créer une notification
    await createNotification({
      userId: session.user.id,
      title: "Lien de paiement créé",
      message: `Lien de paiement de ${formattedAmount} ${currency} créé${recipient_name ? ` pour ${recipient_name}` : ''}`,
      type: "SUCCESS",
      relatedType: "payment_link",
      relatedId: waveData.id,
      actionUrl: waveData.wave_launch_url,
      metadata: {
        amount: formattedAmount,
        currency: currency,
        recipient: recipient_name,
        sessionId: waveData.id,
        transactionId: waveData.transaction_id
      }
    })

    return NextResponse.json({
      success: true,
      waveData,
      wave_launch_url: waveData.wave_launch_url,
      transaction_id: waveData.transaction_id,
      message: "Lien de paiement créé avec succès"
    })

  } catch (error) {
    console.error("Erreur lors de la création du lien de paiement:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 