import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"
import crypto from "crypto"

// Interface pour les données du webhook Wave
interface WaveWebhookPayload {
  event: string
  data: {
    id: string
    amount: number
    currency: string
    status: string
    reference: string
    customer: {
      name: string
      email: string
      phone: string
    }
    payment_method: string
    created_at: string
    updated_at: string
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
    }
  } catch (error) {
    console.error(`Erreur lors du traitement de l'événement ${eventType}:`, error)
  }
}

// Gestionnaires d'événements spécifiques
async function handleCheckoutCompleted(data: any) {
  // Trouver la facture correspondante
  const invoice = await prisma.invoice.findFirst({
    where: {
      waveCheckoutId: data.id
    },
    include: {
      user: true,
      project: true
    }
  })

  if (invoice) {
    // Mettre à jour le statut de la facture
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: 'PAID',
        paidDate: new Date(data.when_completed)
      }
    })

    // Créer une notification
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
        clientReference: data.client_reference
      }
    })
  }
}

async function handleCheckoutFailed(data: any) {
  const invoice = await prisma.invoice.findFirst({
    where: {
      waveCheckoutId: data.id
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
        error: data.last_payment_error
      }
    })
  }
}

async function handleMerchantPaymentReceived(data: any) {
  // Trouver l'utilisateur par merchant_id ou autre critère
  // Pour l'instant, on notifie tous les utilisateurs avec Wave configuré
  const users = await prisma.user.findMany({
    where: {
      waveApiKey: { not: null }
    }
  })

  for (const user of users) {
    await createNotification({
      userId: user.id,
      title: "Paiement marchand reçu",
      message: `Nouveau paiement reçu de ${data.sender_mobile}: ${data.amount} ${data.currency}`,
      type: "WAVE_PAYMENT_RECEIVED",
      relatedType: "wave_transaction",
      relatedId: data.id,
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
  const users = await prisma.user.findMany({
    where: {
      waveApiKey: { not: null }
    }
  })

  for (const user of users) {
    await createNotification({
      userId: user.id,
      title: "Paiement B2B reçu",
      message: `Paiement B2B reçu: ${data.amount} ${data.currency}`,
      type: "WAVE_PAYMENT_RECEIVED",
      relatedType: "wave_transaction",
      relatedId: data.id,
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
  // Répondre immédiatement avec un code de succès (comme recommandé par Wave)
  const response = NextResponse.json({ received: true }, { status: 200 })

  // Traitement asynchrone de l'événement
  setImmediate(async () => {
    try {
      const waveSignature = request.headers.get('wave-signature')
      const webhookBody = await request.text()

      if (!waveSignature) {
        console.error("Signature Wave manquante")
        return
      }

      // Parser le JSON
      let eventData
      try {
        eventData = JSON.parse(webhookBody)
      } catch (error) {
        console.error("Corps du webhook invalide:", error)
        return
      }

      // Trouver l'utilisateur avec le secret webhook correspondant
      // Pour simplifier, on utilise le premier utilisateur avec un secret configuré
      // En production, vous devriez avoir une logique plus sophistiquée
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
        return
      }

      console.log(`Événement Wave reçu: ${eventData.type}`, eventData)

      // Traiter l'événement
      await processWaveEvent(eventData.type, eventData.data)

    } catch (error) {
      console.error("Erreur lors du traitement du webhook Wave:", error)
    }
  })

  return response
}

// GET - Endpoint pour tester le webhook (optionnel)
export async function GET() {
  return NextResponse.json({
    message: "Endpoint webhook Wave CI actif",
    url: `${process.env.NEXTAUTH_URL}/api/webhooks/wave`,
    timestamp: new Date().toISOString()
  })
} 