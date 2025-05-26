import nodemailer from 'nodemailer'
import { prisma } from './prisma'

interface EmailOptions {
  to: string
  subject: string
  html: string
  attachments?: Array<{
    filename: string
    path?: string
    content?: Buffer
  }>
}

export async function sendEmail(userId: string, options: EmailOptions) {
  try {
    // Récupérer la configuration SMTP de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        smtpPassword: true,
        smtpFrom: true,
        email: true
      }
    })

    if (!user || !user.smtpHost || !user.smtpUser || !user.smtpPassword) {
      throw new Error('Configuration SMTP manquante')
    }

    // Créer le transporteur
    const transporter = nodemailer.createTransporter({
      host: user.smtpHost,
      port: user.smtpPort || 587,
      secure: user.smtpPort === 465,
      auth: {
        user: user.smtpUser,
        pass: user.smtpPassword
      }
    })

    // Envoyer l'email
    const result = await transporter.sendMail({
      from: user.smtpFrom || user.email,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments
    })

    return result
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error)
    throw error
  }
}

export function generateInvoiceEmailTemplate(invoice: any, user: any) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Facture ${invoice.invoiceNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { max-width: 150px; height: auto; }
        .invoice-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .amount { font-size: 24px; font-weight: bold; color: #007bff; }
        .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          ${user.companyLogo ? `<img src="${user.companyLogo}" alt="${user.companyName}" class="logo">` : ''}
          <h1>${user.companyName || user.name}</h1>
        </div>
        
        <h2>Facture ${invoice.invoiceNumber}</h2>
        
        <div class="invoice-details">
          <p><strong>Type:</strong> ${invoice.type === 'PROFORMA' ? 'Proforma' : 'Facture'}</p>
          <p><strong>Montant:</strong> <span class="amount">${invoice.amount} ${user.currency}</span></p>
          ${invoice.dueDate ? `<p><strong>Date d'échéance:</strong> ${new Date(invoice.dueDate).toLocaleDateString('fr-FR')}</p>` : ''}
          ${invoice.notes ? `<p><strong>Notes:</strong> ${invoice.notes}</p>` : ''}
        </div>
        
        ${invoice.paymentLink ? `
          <div style="text-align: center;">
            <a href="${invoice.paymentLink}" class="button">Payer maintenant</a>
          </div>
        ` : ''}
        
        <div class="footer">
          <p>${user.companyName || user.name}</p>
          ${user.address ? `<p>${user.address}</p>` : ''}
          ${user.phone ? `<p>Tél: ${user.phone}</p>` : ''}
          <p>Email: ${user.email}</p>
        </div>
      </div>
    </body>
    </html>
  `
}

export function generateProjectUpdateEmailTemplate(project: any, user: any, message: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Mise à jour du projet ${project.name}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .project-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .status { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        .status.in-progress { background: #ffc107; color: #000; }
        .status.completed { background: #28a745; color: white; }
        .status.on-hold { background: #6c757d; color: white; }
        .status.cancelled { background: #dc3545; color: white; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          ${user.companyLogo ? `<img src="${user.companyLogo}" alt="${user.companyName}" style="max-width: 150px;">` : ''}
          <h1>${user.companyName || user.name}</h1>
        </div>
        
        <h2>Mise à jour du projet: ${project.name}</h2>
        
        <div class="project-details">
          <p><strong>Statut:</strong> <span class="status ${project.status.toLowerCase().replace('_', '-')}">${project.status}</span></p>
          <p><strong>Description:</strong> ${project.description || 'Aucune description'}</p>
          <p><strong>Montant:</strong> ${project.amount} ${user.currency}</p>
        </div>
        
        <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Message:</h3>
          <p>${message}</p>
        </div>
        
        <div class="footer">
          <p>${user.companyName || user.name}</p>
          ${user.address ? `<p>${user.address}</p>` : ''}
          ${user.phone ? `<p>Tél: ${user.phone}</p>` : ''}
          <p>Email: ${user.email}</p>
        </div>
      </div>
    </body>
    </html>
  `
} 