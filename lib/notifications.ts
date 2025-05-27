import { prisma } from "@/lib/prisma"

export interface CreateNotificationParams {
  userId: string
  title: string
  message: string
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS' | 'WAVE_PAYMENT_RECEIVED' | 'WAVE_PAYMENT_FAILED' | 'WAVE_CHECKOUT_COMPLETED' | 'WAVE_CHECKOUT_FAILED' | 'INVOICE_PAID' | 'INVOICE_OVERDUE' | 'PROJECT_DEADLINE' | 'TASK_DUE' | 'SUBSCRIPTION_REMINDER' | 'PROVIDER_PAYMENT_COMPLETED' | 'PROVIDER_PAYMENT_FAILED'
  relatedType?: string
  relatedId?: string
  actionUrl?: string
  metadata?: any
  sendEmail?: boolean
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: {
        title: params.title,
        message: params.message,
        type: params.type,
        userId: params.userId,
        relatedType: params.relatedType,
        relatedId: params.relatedId,
        actionUrl: params.actionUrl,
        metadata: params.metadata
      }
    })

    // Envoyer email si demandé
    if (params.sendEmail !== false) {
      await sendNotificationEmail(params.userId, notification)
    }

    return notification
  } catch (error) {
    console.error("Erreur lors de la création de notification:", error)
    return null
  }
}

export async function sendNotificationEmail(userId: string, notification: any) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        emailNotifications: true,
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        smtpPassword: true,
        smtpFrom: true
      }
    })

    if (!user?.emailNotifications || !user.smtpHost || !user.smtpUser) {
      return // Pas d'envoi d'email si non configuré
    }

    // Appeler l'API d'envoi d'email
    const emailResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/emails/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: user.email,
        subject: `REV - ${notification.title}`,
        content: generateEmailContent(notification),
        type: 'notification',
        userId: userId
      })
    })

    if (emailResponse.ok) {
      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          emailSent: true,
          emailSentAt: new Date()
        }
      })
    }
  } catch (error) {
    console.error("Erreur lors de l'envoi d'email de notification:", error)
  }
}

function generateEmailContent(notification: any): string {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>REV - ${notification.title}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
        .notification-type { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 15px; }
        .type-success { background: #dcfce7; color: #166534; }
        .type-error { background: #fef2f2; color: #dc2626; }
        .type-warning { background: #fef3c7; color: #d97706; }
        .type-info { background: #dbeafe; color: #2563eb; }
        .action-button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 15px 0; }
        .metadata { background: #e5e7eb; padding: 10px; border-radius: 4px; margin: 10px 0; font-size: 14px; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 24px;">REV - Gestion Freelance</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">Nouvelle notification</p>
        </div>
        
        <div class="content">
          <div class="notification-type type-${getEmailTypeClass(notification.type)}">
            ${getTypeLabel(notification.type)}
          </div>
          
          <h2 style="color: #1f2937; margin-bottom: 10px;">${notification.title}</h2>
          <p style="margin-bottom: 20px;">${notification.message}</p>
          
          ${notification.metadata ? `
            <div class="metadata">
              <strong>Détails :</strong><br>
              ${formatMetadata(notification.metadata)}
            </div>
          ` : ''}
          
          ${notification.actionUrl ? `
            <a href="${baseUrl}${notification.actionUrl}" class="action-button">
              Voir les détails
            </a>
          ` : ''}
          
          <div class="footer">
            <p>Cette notification a été générée automatiquement par votre système REV.</p>
            <p>Pour modifier vos préférences de notification, rendez-vous dans vos <a href="${baseUrl}/settings">paramètres</a>.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}

function getEmailTypeClass(type: string): string {
  if (type.includes('SUCCESS') || type.includes('COMPLETED') || type.includes('PAID')) return 'success'
  if (type.includes('ERROR') || type.includes('FAILED')) return 'error'
  if (type.includes('WARNING') || type.includes('OVERDUE')) return 'warning'
  return 'info'
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'WAVE_PAYMENT_RECEIVED': 'Paiement Wave reçu',
    'WAVE_PAYMENT_FAILED': 'Paiement Wave échoué',
    'WAVE_CHECKOUT_COMPLETED': 'Checkout Wave complété',
    'WAVE_CHECKOUT_FAILED': 'Checkout Wave échoué',
    'INVOICE_PAID': 'Facture payée',
    'INVOICE_OVERDUE': 'Facture en retard',
    'PROJECT_DEADLINE': 'Échéance projet',
    'TASK_DUE': 'Tâche due',
    'SUBSCRIPTION_REMINDER': 'Rappel abonnement',
    'PROVIDER_PAYMENT_COMPLETED': 'Paiement prestataire complété',
    'PROVIDER_PAYMENT_FAILED': 'Paiement prestataire échoué',
    'SUCCESS': 'Succès',
    'ERROR': 'Erreur',
    'WARNING': 'Avertissement',
    'INFO': 'Information'
  }
  return labels[type] || type
}

function formatMetadata(metadata: any): string {
  if (!metadata || typeof metadata !== 'object') return ''
  
  const formatted = []
  
  if (metadata.amount && metadata.currency) {
    formatted.push(`Montant: ${metadata.amount} ${metadata.currency}`)
  }
  
  if (metadata.transactionId) {
    formatted.push(`Transaction: ${metadata.transactionId}`)
  }
  
  if (metadata.clientReference) {
    formatted.push(`Référence: ${metadata.clientReference}`)
  }
  
  if (metadata.senderMobile) {
    formatted.push(`Téléphone: ${metadata.senderMobile}`)
  }
  
  if (metadata.error && metadata.error.message) {
    formatted.push(`Erreur: ${metadata.error.message}`)
  }
  
  return formatted.join('<br>')
}

// Fonctions utilitaires pour créer des notifications spécifiques
export async function notifyWavePaymentReceived(
  userId: string, 
  amount: string, 
  currency: string, 
  transactionId: string,
  senderMobile?: string
) {
  return createNotification({
    userId,
    title: "Paiement Wave reçu !",
    message: `Nouveau paiement de ${amount} ${currency} reçu${senderMobile ? ` de ${senderMobile}` : ''}.`,
    type: "WAVE_PAYMENT_RECEIVED",
    relatedType: "wave_transaction",
    relatedId: transactionId,
    actionUrl: "/wave-transactions",
    metadata: {
      amount,
      currency,
      transactionId,
      senderMobile
    }
  })
}

export async function notifyInvoicePaid(
  userId: string,
  invoiceNumber: string,
  amount: number,
  currency: string,
  invoiceId: string
) {
  return createNotification({
    userId,
    title: "Facture payée !",
    message: `La facture ${invoiceNumber} de ${amount} ${currency} a été payée avec succès.`,
    type: "INVOICE_PAID",
    relatedType: "invoice",
    relatedId: invoiceId,
    actionUrl: `/invoices/${invoiceId}`,
    metadata: {
      amount,
      currency,
      invoiceNumber
    }
  })
}

export async function notifyProviderPaymentCompleted(
  userId: string,
  providerName: string,
  amount: number,
  currency: string,
  providerId: string
) {
  return createNotification({
    userId,
    title: "Paiement prestataire effectué",
    message: `Paiement de ${amount} ${currency} envoyé à ${providerName} avec succès.`,
    type: "PROVIDER_PAYMENT_COMPLETED",
    relatedType: "provider",
    relatedId: providerId,
    actionUrl: `/providers/${providerId}`,
    metadata: {
      amount,
      currency,
      providerName
    }
  })
}

export async function notifyProjectDeadline(
  userId: string,
  projectName: string,
  dueDate: Date,
  projectId: string
) {
  const daysUntilDue = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  
  return createNotification({
    userId,
    title: "Échéance projet approche",
    message: `Le projet "${projectName}" arrive à échéance dans ${daysUntilDue} jour${daysUntilDue > 1 ? 's' : ''}.`,
    type: "PROJECT_DEADLINE",
    relatedType: "project",
    relatedId: projectId,
    actionUrl: `/projects/${projectId}`,
    metadata: {
      projectName,
      dueDate: dueDate.toISOString(),
      daysUntilDue
    }
  })
} 