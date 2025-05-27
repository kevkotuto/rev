import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"
import crypto from "crypto"

// Interface pour les données du webhook Wave
interface WaveWebhookPayload {
  type: string
  data: {
    id: string
    amount: string
    currency: string
    status: string
    client_reference?: string
    when_completed?: string
    when_created?: string
    transaction_id?: string
    last_payment_error?: any
    sender_mobile?: string
    merchant_id?: string
    custom_fields?: any
    sender_id?: string
    restrict_payer_mobile?: string
  }
}

// Fonction pour vérifier la signature Wave
function verifyWaveSignature(
  waveWebhookSecret: string,
  waveSignature: string,
  webhookBody: string
): boolean {
  try {
    const parts = waveSignature.split(",")
    const timestamp = parts[0].split("=")[1]
    
    const signatures = parts.slice(1).map(part => part.split("=")[1])
    
    const payload = timestamp + webhookBody
    const computedHmac = crypto
      .createHmac("sha256", waveWebhookSecret)
      .update(payload)
      .digest("hex")
    
    return signatures.includes(computedHmac)
  } catch (error) {
    console.error("Erreur lors de la vérification de signature:", error)
    return false
  }
}

// Fonction pour traiter les événements Wave
async function processWaveEvent(eventType: string, eventData: any) {
  try {
    console.log(`Traitement de l'événement Wave: ${eventType}`, eventData)
    
    switch (eventType) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(eventData)
        break
      
      case 'checkout.session.payment_failed':
        await handleCheckoutFailed(eventData)
        break
      
      case 'merchant.payment_received':
        await handleMerchantPaymentReceived(eventData)
        break
      
      case 'b2b.payment_received':
        await handleB2BPaymentReceived(eventData)
        break
      
      case 'b2b.payment_failed':
        await handleB2BPaymentFailed(eventData)
        break
      
      default:
        console.log(`Type d'événement Wave non géré: ${eventType}`)
        // Créer une notification générique pour les événements non gérés
        await handleGenericWaveEvent(eventType, eventData)
    }
  } catch (error) {
    console.error(`Erreur lors du traitement de l'événement ${eventType}:`, error)
  }
}

// Gestionnaire générique pour les événements non spécifiquement gérés
async function handleGenericWaveEvent(eventType: string, data: any) {
  const users = await prisma.user.findMany({
    where: {
      waveApiKey: { not: null }
    }
  })

  for (const user of users) {
    await createNotification({
      userId: user.id,
      title: `Événement Wave: ${eventType}`,
      message: `Nouvel événement Wave reçu: ${eventType}`,
      type: "INFO",
      relatedType: "wave_transaction",
      relatedId: data.id,
      actionUrl: "/wave-transactions",
      metadata: {
        eventType,
        data
      }
    })
  }
}

// Gestionnaires d'événements spécifiques
async function handleCheckoutCompleted(data: any) {
  console.log('Traitement checkout.session.completed:', data)
  
  // 1. Chercher une facture liée par waveCheckoutId
  let invoice = await prisma.invoice.findFirst({
    where: {
      waveCheckoutId: data.id
    },
    include: {
      user: true,
      project: true
    }
  })

  // 2. Si pas de facture trouvée, chercher par client_reference
  if (!invoice && data.client_reference) {
    invoice = await prisma.invoice.findFirst({
      where: {
        id: data.client_reference
      },
      include: {
        user: true,
        project: true
      }
    })
  }

  // 3. Si toujours pas de facture, créer une transaction Wave générique
  if (!invoice) {
    console.log('Aucune facture trouvée, création d\'une transaction Wave générique')
    await handleGenericPaymentReceived(data)
    return
  }

  // 4. Mettre à jour la facture
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status: 'PAID',
      paidDate: data.when_completed ? new Date(data.when_completed) : new Date()
    }
  })

  // 5. Créer une notification
  await createNotification({
    userId: invoice.userId,
    title: "Paiement reçu !",
    message: `La facture ${invoice.invoiceNumber} de ${data.amount} ${data.currency} a été payée avec succès.`,
    type: "WAVE_CHECKOUT_COMPLETED",
    relatedType: "invoice",
    relatedId: invoice.id,
    actionUrl: `/invoices/${invoice.id}`,
    metadata: {
      amount: data.amount,
      currency: data.currency,
      transactionId: data.transaction_id,
      clientReference: data.client_reference,
      waveCheckoutId: data.id
    }
  })

  console.log(`Facture ${invoice.invoiceNumber} marquée comme payée`)
}

async function handleGenericPaymentReceived(data: any) {
  console.log('Traitement paiement générique:', data)
  
  // Trouver tous les utilisateurs avec Wave configuré
  const users = await prisma.user.findMany({
    where: {
      waveApiKey: { not: null }
    }
  })

  for (const user of users) {
    // Créer une assignation Wave pour tracking
    const assignment = await prisma.waveTransactionAssignment.create({
      data: {
        transactionId: data.transaction_id || data.id,
        type: 'revenue',
        description: `Paiement Wave reçu - ${data.id}`,
        amount: parseFloat(data.amount),
        currency: data.currency,
        timestamp: data.when_completed ? new Date(data.when_completed) : new Date(),
        counterpartyMobile: data.restrict_payer_mobile,
        userId: user.id,
        waveData: data
      }
    })

    // Créer une notification
    await createNotification({
      userId: user.id,
      title: "Nouveau paiement Wave",
      message: `Paiement de ${data.amount} ${data.currency} reçu via lien de paiement`,
      type: "WAVE_PAYMENT_RECEIVED",
      relatedType: "wave_transaction",
      relatedId: assignment.id,
      actionUrl: "/wave-transactions",
      metadata: {
        amount: data.amount,
        currency: data.currency,
        transactionId: data.transaction_id || data.id,
        waveCheckoutId: data.id,
        clientReference: data.client_reference
      }
    })
  }
}

async function handleCheckoutFailed(data: any) {
  console.log('Traitement checkout.session.payment_failed:', data)
  
  const invoice = await prisma.invoice.findFirst({
    where: {
      OR: [
        { waveCheckoutId: data.id },
        { id: data.client_reference || '' }
      ]
    },
    include: {
      user: true
    }
  })

  if (invoice) {
    await createNotification({
      userId: invoice.userId,
      title: "Échec de paiement",
      message: `Le paiement de la facture ${invoice.invoiceNumber} a échoué. Montant: ${data.amount} ${data.currency}`,
      type: "WAVE_CHECKOUT_FAILED",
      relatedType: "invoice",
      relatedId: invoice.id,
      actionUrl: `/invoices/${invoice.id}`,
      metadata: {
        amount: data.amount,
        currency: data.currency,
        error: data.last_payment_error,
        waveCheckoutId: data.id
      }
    })
  } else {
    // Notifier tous les utilisateurs Wave
    const users = await prisma.user.findMany({
      where: { waveApiKey: { not: null } }
    })

    for (const user of users) {
      await createNotification({
        userId: user.id,
        title: "Échec de paiement Wave",
        message: `Paiement échoué: ${data.amount} ${data.currency}`,
        type: "WAVE_PAYMENT_FAILED",
        relatedType: "wave_transaction",
        relatedId: data.id,
        actionUrl: "/wave-transactions",
        metadata: {
          amount: data.amount,
          currency: data.currency,
          error: data.last_payment_error,
          waveCheckoutId: data.id
        }
      })
    }
  }
}

async function handleMerchantPaymentReceived(data: any) {
  console.log('Traitement merchant.payment_received:', data)
  
  const users = await prisma.user.findMany({
    where: {
      waveApiKey: { not: null }
    }
  })

  for (const user of users) {
    // Créer une assignation Wave
    const assignment = await prisma.waveTransactionAssignment.create({
      data: {
        transactionId: data.id,
        type: 'revenue',
        description: `Paiement marchand reçu de ${data.sender_mobile}`,
        amount: parseFloat(data.amount),
        currency: data.currency,
        timestamp: new Date(),
        counterpartyMobile: data.sender_mobile,
        userId: user.id,
        waveData: data
      }
    })

    await createNotification({
      userId: user.id,
      title: "Paiement marchand reçu",
      message: `Nouveau paiement reçu de ${data.sender_mobile}: ${data.amount} ${data.currency}`,
      type: "WAVE_PAYMENT_RECEIVED",
      relatedType: "wave_transaction",
      relatedId: assignment.id,
      actionUrl: "/wave-transactions",
      metadata: {
        amount: data.amount,
        currency: data.currency,
        senderMobile: data.sender_mobile,
        merchantId: data.merchant_id,
        customFields: data.custom_fields
      }
    })
  }
}

async function handleB2BPaymentReceived(data: any) {
  console.log('Traitement b2b.payment_received:', data)
  
  const users = await prisma.user.findMany({
    where: {
      waveApiKey: { not: null }
    }
  })

  for (const user of users) {
    // Créer une assignation Wave
    const assignment = await prisma.waveTransactionAssignment.create({
      data: {
        transactionId: data.id,
        type: 'revenue',
        description: `Paiement B2B reçu`,
        amount: parseFloat(data.amount),
        currency: data.currency,
        timestamp: new Date(),
        userId: user.id,
        waveData: data
      }
    })

    await createNotification({
      userId: user.id,
      title: "Paiement B2B reçu",
      message: `Paiement B2B reçu: ${data.amount} ${data.currency}`,
      type: "WAVE_PAYMENT_RECEIVED",
      relatedType: "wave_transaction",
      relatedId: assignment.id,
      actionUrl: "/wave-transactions",
      metadata: {
        amount: data.amount,
        currency: data.currency,
        senderId: data.sender_id,
        clientReference: data.client_reference
      }
    })
  }
}

async function handleB2BPaymentFailed(data: any) {
  console.log('Traitement b2b.payment_failed:', data)
  
  const users = await prisma.user.findMany({
    where: {
      waveApiKey: { not: null }
    }
  })

  for (const user of users) {
    await createNotification({
      userId: user.id,
      title: "Échec de paiement B2B",
      message: `Paiement B2B échoué: ${data.amount} ${data.currency}. Raison: ${data.last_payment_error?.message || 'Erreur inconnue'}`,
      type: "WAVE_PAYMENT_FAILED",
      relatedType: "wave_transaction",
      relatedId: data.id,
      actionUrl: "/wave-transactions",
      metadata: {
        amount: data.amount,
        currency: data.currency,
        senderId: data.sender_id,
        clientReference: data.client_reference,
        error: data.last_payment_error
      }
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Webhook Wave reçu')
    
    // Lire le corps de la requête
    const webhookBody = await request.text()
    const waveSignature = request.headers.get('wave-signature')

    console.log('Signature Wave:', waveSignature)
    console.log('Corps du webhook:', webhookBody.substring(0, 200) + '...')

    if (!waveSignature) {
      console.error("Signature Wave manquante")
      return NextResponse.json({ error: "Signature manquante" }, { status: 400 })
    }

    // Parser le JSON
    let eventData: WaveWebhookPayload
    try {
      eventData = JSON.parse(webhookBody)
    } catch (error) {
      console.error("Corps du webhook invalide:", error)
      return NextResponse.json({ error: "JSON invalide" }, { status: 400 })
    }

    console.log('Événement Wave parsé:', eventData.type, eventData.data)

    // Trouver l'utilisateur avec le secret webhook correspondant
    const users = await prisma.user.findMany({
      where: {
        waveWebhookSecret: { not: null }
      }
    })

    let validSignature = false
    let targetUser = null

    for (const user of users) {
      if (user.waveWebhookSecret && verifyWaveSignature(user.waveWebhookSecret, waveSignature, webhookBody)) {
        validSignature = true
        targetUser = user
        break
      }
    }

    if (!validSignature) {
      console.error("Signature Wave invalide")
      return NextResponse.json({ error: "Signature invalide" }, { status: 401 })
    }

    console.log(`Signature valide pour l'utilisateur: ${targetUser?.email}`)

    // Traiter l'événement de manière asynchrone
    setImmediate(async () => {
      try {
        await processWaveEvent(eventData.type, eventData.data)
        console.log(`Événement ${eventData.type} traité avec succès`)
      } catch (error) {
        console.error("Erreur lors du traitement du webhook Wave:", error)
      }
    })

    // Répondre immédiatement avec un code de succès (comme recommandé par Wave)
    return NextResponse.json({ received: true }, { status: 200 })

  } catch (error) {
    console.error("Erreur critique dans le webhook Wave:", error)
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 })
  }
}

// GET - Endpoint pour tester le webhook (optionnel)
export async function GET() {
  return NextResponse.json({
    message: "Endpoint webhook Wave CI actif",
    url: `${process.env.NEXTAUTH_URL}/api/webhooks/wave`,
    timestamp: new Date().toISOString(),
    status: "OK"
  })
} 