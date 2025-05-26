import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-wave-signature')
    
    // Récupérer la clé secrète Wave depuis les variables d'environnement
    const waveSecret = process.env.WAVE_WEBHOOK_SECRET
    
    if (!waveSecret) {
      console.error('WAVE_WEBHOOK_SECRET non configuré')
      return NextResponse.json(
        { message: "Configuration webhook manquante" },
        { status: 500 }
      )
    }

    // Vérifier la signature du webhook (sécurité)
    if (signature) {
      const expectedSignature = crypto
        .createHmac('sha256', waveSecret)
        .update(body)
        .digest('hex')
      
      const receivedSignature = signature.replace('sha256=', '')
      
      if (expectedSignature !== receivedSignature) {
        console.error('Signature webhook invalide')
        return NextResponse.json(
          { message: "Signature invalide" },
          { status: 401 }
        )
      }
    }

    const payload: WaveWebhookPayload = JSON.parse(body)
    
    console.log('Webhook Wave reçu:', payload)

    // Traiter selon le type d'événement
    switch (payload.event) {
      case 'payment.completed':
      case 'payment.success':
        await handlePaymentSuccess(payload.data)
        break
        
      case 'payment.failed':
      case 'payment.cancelled':
        await handlePaymentFailure(payload.data)
        break
        
      default:
        console.log(`Événement webhook non géré: ${payload.event}`)
    }

    return NextResponse.json({ message: "Webhook traité avec succès" })
    
  } catch (error) {
    console.error('Erreur lors du traitement du webhook Wave:', error)
    return NextResponse.json(
      { message: "Erreur lors du traitement du webhook" },
      { status: 500 }
    )
  }
}

async function handlePaymentSuccess(paymentData: WaveWebhookPayload['data']) {
  try {
    // Chercher la facture correspondante par référence
    const invoice = await prisma.invoice.findFirst({
      where: {
        OR: [
          { id: paymentData.reference },
          { invoiceNumber: paymentData.reference },
          { waveCheckoutId: paymentData.id }
        ]
      },
      include: {
        project: true
      }
    })

    if (!invoice) {
      console.error(`Facture non trouvée pour la référence: ${paymentData.reference}`)
      return
    }

    // Mettre à jour le statut de la facture
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: "PAID",
        paidDate: new Date(paymentData.updated_at),
        waveCheckoutId: paymentData.id
      }
    })

    // Si c'est une facture de projet, créer une entrée de revenus
    if (invoice.projectId && invoice.type === "INVOICE") {
      await prisma.expense.create({
        data: {
          description: `Paiement reçu - Facture ${invoice.invoiceNumber}`,
          amount: paymentData.amount,
          category: "PAYMENT_RECEIVED",
          type: "PROJECT",
          projectId: invoice.projectId,
          userId: invoice.userId,
          date: new Date(paymentData.updated_at)
        }
      })
    }

    console.log(`Paiement confirmé pour la facture ${invoice.invoiceNumber}`)
    
  } catch (error) {
    console.error('Erreur lors du traitement du paiement réussi:', error)
  }
}

async function handlePaymentFailure(paymentData: WaveWebhookPayload['data']) {
  try {
    // Chercher la facture correspondante
    const invoice = await prisma.invoice.findFirst({
      where: {
        OR: [
          { id: paymentData.reference },
          { invoiceNumber: paymentData.reference },
          { waveCheckoutId: paymentData.id }
        ]
      }
    })

    if (!invoice) {
      console.error(`Facture non trouvée pour la référence: ${paymentData.reference}`)
      return
    }

    // Mettre à jour le statut selon le cas
    const newStatus = paymentData.status === 'cancelled' ? 'CANCELLED' : 'OVERDUE'
    
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: newStatus,
        waveCheckoutId: paymentData.id
      }
    })

    console.log(`Paiement échoué pour la facture ${invoice.invoiceNumber} - Statut: ${newStatus}`)
    
  } catch (error) {
    console.error('Erreur lors du traitement du paiement échoué:', error)
  }
}

// GET - Endpoint pour tester le webhook (optionnel)
export async function GET() {
  return NextResponse.json({
    message: "Endpoint webhook Wave CI actif",
    url: `${process.env.NEXTAUTH_URL}/api/webhooks/wave`,
    timestamp: new Date().toISOString()
  })
} 