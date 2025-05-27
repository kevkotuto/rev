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
    const waveSignature = request.headers.get('wave-signature')
    
    // Parse du payload pour obtenir des informations de base
    const payload: WaveWebhookPayload = JSON.parse(body)
    
    // Récupérer la facture pour identifier l'utilisateur
    const invoice = await prisma.invoice.findFirst({
      where: {
        OR: [
          { id: payload.data.reference },
          { invoiceNumber: payload.data.reference },
          { waveCheckoutId: payload.data.id }
        ]
      },
      include: {
        project: true
      }
    })

    if (!invoice) {
      console.error('Facture non trouvée pour la référence:', payload.data.reference)
      return NextResponse.json(
        { message: "Facture non trouvée" },
        { status: 404 }
      )
    }

    // Récupérer la configuration Wave de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: invoice.userId },
      select: {
        waveWebhookSecret: true
      }
    })

    // Vérification de la signature Wave selon leur documentation
    if (user?.waveWebhookSecret && waveSignature) {
      const elements = waveSignature.split(',')
      const timestamp = elements.find(el => el.startsWith('t='))?.replace('t=', '')
      const signature = elements.find(el => el.startsWith('v1='))?.replace('v1=', '')
      
      if (timestamp && signature) {
        const signedPayload = `${timestamp}.${body}`
        const expectedSignature = crypto
          .createHmac('sha256', user.waveWebhookSecret)
          .update(signedPayload)
          .digest('hex')
        
        if (expectedSignature !== signature) {
          console.error('Signature webhook Wave invalide')
          return NextResponse.json(
            { message: "Signature invalide" },
            { status: 401 }
          )
        }
        
        console.log('✅ Signature webhook Wave vérifiée avec succès')
      }
    } else if (!user?.waveWebhookSecret) {
      console.warn('⚠️ Secret webhook Wave non configuré pour cet utilisateur')
    }
    
    console.log('Webhook Wave traité pour la facture:', invoice.id)

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