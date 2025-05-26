import nodemailer from 'nodemailer'
import { prisma } from './prisma'
import puppeteer from 'puppeteer'

interface EmailOptions {
  to: string
  subject: string
  html: string
  attachments?: Array<{
    filename: string
    path?: string
    content?: Buffer
    contentType?: string
  }>
}

// Fonction pour générer le HTML du PDF
function generateInvoicePDFHTML(invoice: any, user: any, companySettings: any) {
  const formatCurrency = (amount: number) => {
    // Mapper FCFA vers XOF pour Intl.NumberFormat
    const currencyCode = user?.currency === 'FCFA' ? 'XOF' : (user?.currency || 'XOF')
    
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('fr-FR')
  }

  // Calculer la date d'expiration basée sur la date d'échéance ou 30 jours par défaut
  const getValidityText = () => {
    if (invoice.dueDate) {
      return `Ce devis est valable jusqu'au ${formatDate(invoice.dueDate)}.`
    } else {
      const validityDate = new Date(invoice.createdAt)
      validityDate.setDate(validityDate.getDate() + 30)
      return `Ce devis est valable jusqu'au ${formatDate(validityDate)} (30 jours à compter de la date d'émission).`
    }
  }

  // Informations de l'entreprise (priorité aux paramètres d'entreprise)
  const companyName = companySettings?.name || user?.companyName || user?.name || 'Mon Entreprise'
  const companyAddress = companySettings?.address || user?.address
  const companyPhone = companySettings?.phone || user?.phone
  const companyEmail = companySettings?.email || user?.email
  const companyLogo = companySettings?.logo || user?.companyLogo

  const docType = invoice.type === 'PROFORMA' ? 'PROFORMA' : 'FACTURE'

  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${docType} ${invoice.invoiceNumber}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          background: white;
        }
        
        .document-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 40px;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
          border-bottom: 3px solid #3b82f6;
          padding-bottom: 20px;
        }
        
        .company-info {
          flex: 1;
        }
        
        .company-logo {
          max-width: 150px;
          max-height: 80px;
          margin-bottom: 15px;
        }
        
        .company-info h2 {
          color: #3b82f6;
          font-size: 28px;
          margin-bottom: 10px;
        }
        
        .company-info p {
          margin: 5px 0;
          color: #666;
        }
        
        .company-details {
          margin-top: 10px;
          font-size: 14px;
        }
        
        .invoice-info {
          text-align: right;
          flex-shrink: 0;
        }
        
        .invoice-info h3 {
          color: #3b82f6;
          font-size: 24px;
          margin-bottom: 10px;
        }
        
        .invoice-info p {
          margin: 5px 0;
        }
        
        .client-section {
          margin: 40px 0;
        }
        
        .client-section h4 {
          color: #3b82f6;
          margin-bottom: 15px;
          font-size: 18px;
        }
        
        .client-info {
          background: #f8fafc;
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid #3b82f6;
        }
        
        .details-section {
          margin: 40px 0;
        }
        
        .details-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .details-table th,
        .details-table td {
          padding: 15px;
          text-align: left;
        }
        
        .details-table th {
          background: #3b82f6;
          color: white;
          font-weight: 600;
        }
        
        .details-table td {
          background: white;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .details-table tr:last-child td {
          border-bottom: none;
        }
        
        .service-row {
          border-bottom: 1px solid #f1f5f9;
        }
        
        .service-row:last-child {
          border-bottom: 2px solid #3b82f6;
        }
        
        .total-section {
          margin: 40px 0;
          text-align: right;
        }
        
        .total-box {
          display: inline-block;
          background: #3b82f6;
          color: white;
          padding: 25px;
          border-radius: 12px;
          min-width: 280px;
        }
        
        .total-box h4 {
          font-size: 18px;
          margin-bottom: 10px;
          opacity: 0.9;
        }
        
        .total-box .amount {
          font-size: 32px;
          font-weight: bold;
        }
        
        .notes-section {
          margin: 40px 0;
          padding: 20px;
          background: #f8fafc;
          border-radius: 8px;
          border-left: 4px solid #10b981;
        }
        
        .notes-section h4 {
          color: #10b981;
          margin-bottom: 15px;
        }
        
        .footer {
          margin-top: 60px;
          padding: 20px;
          background: #f8fafc;
          border-radius: 8px;
          border-top: 3px solid #3b82f6;
          text-align: center;
          color: #666;
          font-size: 14px;
        }
        
        .footer .validity {
          font-weight: 600;
          color: #3b82f6;
          margin-bottom: 10px;
        }
        
        .footer .company-footer {
          margin-top: 15px;
          padding-top: 15px;
          border-top: 1px solid #e2e8f0;
          font-size: 12px;
        }
        
        @media print {
          .document-container {
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="document-container">
        <!-- En-tête -->
        <div class="header">
          <div class="company-info">
            ${companyLogo ? `<img src="${companyLogo}" alt="Logo" class="company-logo">` : ''}
            <h2>${companyName}</h2>
            ${companyAddress ? `<p>📍 ${companyAddress}</p>` : ''}
            ${companyPhone ? `<p>📞 ${companyPhone}</p>` : ''}
            ${companyEmail ? `<p>📧 ${companyEmail}</p>` : ''}
            
            ${companySettings ? `
              <div class="company-details">
                ${companySettings.rccm ? `<p><strong>RCCM:</strong> ${companySettings.rccm}</p>` : ''}
                ${companySettings.nif ? `<p><strong>NIF:</strong> ${companySettings.nif}</p>` : ''}
                ${companySettings.website ? `<p><strong>Site web:</strong> ${companySettings.website}</p>` : ''}
              </div>
            ` : ''}
          </div>
          <div class="invoice-info">
            <h3>${docType}</h3>
            <p><strong>N°:</strong> ${invoice.invoiceNumber}</p>
            <p><strong>Date:</strong> ${formatDate(invoice.createdAt)}</p>
            ${invoice.dueDate ? `<p><strong>Échéance:</strong> ${formatDate(invoice.dueDate)}</p>` : ''}
          </div>
        </div>
        
        <!-- Informations client -->
        <div class="client-section">
          <h4>Facturé à :</h4>
          <div class="client-info">
            ${invoice.clientName ? `<p><strong>${invoice.clientName}</strong></p>` : ''}
            ${invoice.project?.client?.name && !invoice.clientName ? `<p><strong>${invoice.project.client.name}</strong></p>` : ''}
            ${invoice.clientAddress ? `<p>📍 ${invoice.clientAddress}</p>` : ''}
            ${invoice.project?.client?.address && !invoice.clientAddress ? `<p>📍 ${invoice.project.client.address}</p>` : ''}
            ${invoice.clientEmail ? `<p>📧 ${invoice.clientEmail}</p>` : ''}
            ${invoice.project?.client?.email && !invoice.clientEmail ? `<p>📧 ${invoice.project.client.email}</p>` : ''}
            ${invoice.clientPhone ? `<p>📞 ${invoice.clientPhone}</p>` : ''}
            ${invoice.project?.client?.phone && !invoice.clientPhone ? `<p>📞 ${invoice.project.client.phone}</p>` : ''}
          </div>
        </div>
        
        <!-- Détails du document -->
        <div class="details-section">
          <table class="details-table">
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align: center; width: 100px;">Qté</th>
                <th style="text-align: right; width: 120px;">Prix unitaire</th>
                <th style="text-align: right; width: 150px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.project?.services && invoice.project.services.length > 0 ? 
                invoice.project.services.map((service: any) => `
                  <tr class="service-row">
                    <td>
                      <strong>${service.name}</strong>
                      ${service.description ? `<br><small style="color: #666;">${service.description}</small>` : ''}
                      ${service.unit ? `<br><small style="color: #888;">Unité: ${service.unit}</small>` : ''}
                    </td>
                    <td style="text-align: center;">${service.quantity || 1}</td>
                    <td style="text-align: right;">${formatCurrency(service.amount)}</td>
                    <td style="text-align: right; font-weight: 600;">${formatCurrency(service.amount * (service.quantity || 1))}</td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td>
                      ${invoice.project ? `<strong>Projet:</strong> ${invoice.project.name}` : 'Prestation'}
                      ${invoice.project?.description ? `<br><small style="color: #666;">${invoice.project.description}</small>` : ''}
                    </td>
                    <td style="text-align: center;">1</td>
                    <td style="text-align: right;">${formatCurrency(invoice.amount)}</td>
                    <td style="text-align: right; font-weight: 600;">${formatCurrency(invoice.amount)}</td>
                  </tr>
                `
              }
            </tbody>
          </table>
        </div>
        
        <!-- Total -->
        <div class="total-section">
          <div class="total-box">
            <h4>Total TTC</h4>
            <div class="amount">${formatCurrency(invoice.amount)}</div>
          </div>
        </div>
        
        <!-- Notes -->
        ${invoice.notes ? `
          <div class="notes-section">
            <h4>📝 Notes</h4>
            <p>${invoice.notes}</p>
          </div>
        ` : ''}
        
        <!-- Pied de page -->
        <div class="footer">
          ${invoice.type === 'PROFORMA' ? `<div class="validity">${getValidityText()}</div>` : ''}
          <p>Merci pour votre confiance ! 🙏</p>
          
          ${companySettings ? `
            <div class="company-footer">
              ${companySettings.bankName ? `<p><strong>Banque:</strong> ${companySettings.bankName}</p>` : ''}
              ${companySettings.bankAccount ? `<p><strong>Compte:</strong> ${companySettings.bankAccount}</p>` : ''}
              ${companySettings.legalForm ? `<p><strong>Forme juridique:</strong> ${companySettings.legalForm}</p>` : ''}
            </div>
          ` : ''}
        </div>
      </div>
    </body>
    </html>
  `
}

// Fonction pour générer le PDF d'une proforma/facture
export async function generateInvoicePDF(invoiceId: string, userId: string): Promise<Buffer> {
  try {
    // Récupérer la proforma/facture avec les informations complètes
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        userId: userId
      },
      include: {
        project: {
          include: {
            client: true,
            services: true
          }
        }
      }
    })

    if (!invoice) {
      throw new Error('Proforma/Facture non trouvée')
    }

    // Récupérer les informations de l'entreprise et de l'utilisateur
    const [user, companySettings] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId }
      }),
      prisma.companySettings.findUnique({
        where: { userId: userId }
      })
    ])

    // Générer le HTML du document
    const html = generateInvoicePDFHTML(invoice, user, companySettings)

    // Générer le PDF avec Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    })
    
    await browser.close()

    return Buffer.from(pdfBuffer)
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error)
    throw error
  }
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
    const transporter = nodemailer.createTransport({
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

// Template d'email simplifié pour accompagner le PDF en pièce jointe
function generateSimpleEmailTemplate(invoice: any, user: any, customMessage: string, clientName: string, formatCurrency: (amount: number) => string) {
  const docType = invoice.type === 'PROFORMA' ? 'Proforma' : 'Facture'
  const docTypeTitle = invoice.type === 'PROFORMA' ? 'Devis' : 'Facture'

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${docType} ${invoice.invoiceNumber}</title>
      <style>
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          margin: 0; 
          padding: 0; 
          background-color: #f8fafc;
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background: white; 
          border-radius: 12px; 
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .header { 
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white; 
          text-align: center; 
          padding: 30px 20px;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .header p {
          margin: 10px 0 0 0;
          opacity: 0.9;
          font-size: 16px;
        }
        .content {
          padding: 40px 30px;
        }
        .message-box {
          background: #f0f9ff;
          padding: 25px;
          border-radius: 12px;
          margin: 25px 0;
          border-left: 4px solid #3b82f6;
        }
        .document-info { 
          background: #f8fafc; 
          padding: 25px; 
          border-radius: 12px; 
          margin: 25px 0;
          border-left: 4px solid #10b981;
        }
        .document-info h3 {
          margin: 0 0 15px 0;
          color: #10b981;
          font-size: 20px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          margin: 10px 0;
          padding: 8px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .info-row:last-child {
          border-bottom: none;
          font-weight: 600;
          font-size: 16px;
          color: #1f2937;
        }
        .info-label {
          color: #6b7280;
          font-weight: 500;
        }
        .info-value {
          font-weight: 600;
          color: #1f2937;
        }
        .attachment-notice {
          background: #fef3c7;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #f59e0b;
          text-align: center;
        }
        .attachment-notice h4 {
          margin: 0 0 10px 0;
          color: #d97706;
        }
        .footer { 
          background: #f9fafb;
          padding: 30px; 
          border-top: 1px solid #e5e7eb; 
          font-size: 14px; 
          color: #6b7280;
          text-align: center;
        }
        .footer .company-info {
          margin-bottom: 15px;
        }
        .footer .company-info h4 {
          margin: 0 0 10px 0;
          color: #374151;
          font-size: 16px;
        }
        .footer p {
          margin: 5px 0;
        }
        @media (max-width: 600px) {
          .container {
            margin: 10px;
            border-radius: 8px;
          }
          .content {
            padding: 20px 15px;
          }
          .header {
            padding: 20px 15px;
          }
          .info-row {
            flex-direction: column;
            gap: 5px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          ${user.companyLogo ? `<img src="${user.companyLogo}" alt="${user.companyName || user.name}" style="max-width: 120px; height: auto; margin-bottom: 15px; border-radius: 8px;">` : ''}
          <h1>${user.companyName || user.name}</h1>
          <p>📧 ${docTypeTitle} par email</p>
        </div>
        
        <div class="content">
          <div style="font-size: 18px; margin-bottom: 25px; color: #374151;">
            Bonjour ${clientName},
          </div>
          
          <div class="message-box">
            <div style="white-space: pre-line; font-size: 16px; line-height: 1.6;">
              ${customMessage}
            </div>
          </div>

          <div class="document-info">
            <h3>📋 Détails du ${docType.toLowerCase()}</h3>
            <div class="info-row">
              <span class="info-label">Numéro :</span>
              <span class="info-value">${invoice.invoiceNumber}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Date d'émission :</span>
              <span class="info-value">${new Date(invoice.createdAt).toLocaleDateString('fr-FR')}</span>
            </div>
            ${invoice.dueDate ? `
              <div class="info-row">
                <span class="info-label">${invoice.type === 'PROFORMA' ? 'Validité jusqu\'au' : 'Date d\'échéance'} :</span>
                <span class="info-value">${new Date(invoice.dueDate).toLocaleDateString('fr-FR')}</span>
              </div>
            ` : ''}
            <div class="info-row">
              <span class="info-label">Montant total :</span>
              <span class="info-value" style="font-size: 18px; color: #059669;">${formatCurrency(invoice.amount)}</span>
            </div>
          </div>

          <div class="attachment-notice">
            <h4>📎 Document en pièce jointe</h4>
            <p>Vous trouverez le ${docType.toLowerCase()} détaillé en pièce jointe de cet email au format PDF.</p>
          </div>

          ${invoice.paymentLink ? `
            <div style="text-align: center; margin: 30px 0; padding: 25px; background: linear-gradient(135deg, #f0f9ff, #e0f2fe); border-radius: 12px; border: 1px solid #bae6fd;">
              <h3 style="margin: 0 0 15px 0; color: #1f2937;">💳 Paiement en ligne</h3>
              <p style="margin: 0 0 20px 0; color: #6b7280;">
                Vous pouvez régler cette ${invoice.type === 'PROFORMA' ? 'proforma' : 'facture'} directement en ligne de manière sécurisée.
              </p>
              <a href="${invoice.paymentLink}" style="display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #059669, #047857); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                🔒 Payer maintenant - ${formatCurrency(invoice.amount)}
              </a>
            </div>
          ` : ''}

          <div style="margin: 30px 0; padding: 20px; background: #f0fdf4; border-radius: 8px; border-left: 4px solid #22c55e;">
            <p style="margin: 0; color: #15803d;">
              <strong>💬 Questions ?</strong> N'hésitez pas à me contacter si vous avez besoin de clarifications ou d'informations supplémentaires.
            </p>
          </div>

          <p style="margin: 25px 0; color: #6b7280;">
            Merci pour votre confiance ! 🙏
          </p>
        </div>
        
        <div class="footer">
          <div class="company-info">
            <h4>${user.companyName || user.name}</h4>
            ${user.address ? `<p>📍 ${user.address}</p>` : ''}
            ${user.phone ? `<p>📞 ${user.phone}</p>` : ''}
            <p>📧 ${user.email}</p>
            ${user.website ? `<p>🌐 ${user.website}</p>` : ''}
          </div>
          
          <p style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb; font-size: 12px;">
            ${invoice.type === 'PROFORMA' 
              ? 'Ce devis est envoyé avec le document PDF en pièce jointe.'
              : 'Cette facture est envoyée avec le document PDF en pièce jointe.'
            }
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

export function generateInvoiceEmailTemplate(invoice: any, user: any, customMessage?: string) {
  // Fonction pour formater la devise
  const formatCurrency = (amount: number) => {
    // Mapper FCFA vers XOF pour Intl.NumberFormat
    const currencyCode = user.currency === 'FCFA' ? 'XOF' : (user.currency || 'XOF')
    
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // Fonction pour formater les dates
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('fr-FR')
  }

  // Déterminer le type de document
  const docType = invoice.type === 'PROFORMA' ? 'Proforma' : 'Facture'
  const docTypeTitle = invoice.type === 'PROFORMA' ? 'Devis' : 'Facture'

  // Informations client
  const clientName = invoice.clientName || invoice.project?.client?.name || 'Client'
  const clientEmail = invoice.clientEmail || invoice.project?.client?.email || ''

  // Si un message personnalisé est fourni, utiliser un template simplifié
  if (customMessage) {
    return generateSimpleEmailTemplate(invoice, user, customMessage, clientName, formatCurrency)
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${docType} ${invoice.invoiceNumber}</title>
      <style>
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          margin: 0; 
          padding: 0; 
          background-color: #f8fafc;
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background: white; 
          border-radius: 12px; 
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .header { 
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white; 
          text-align: center; 
          padding: 30px 20px;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .header p {
          margin: 10px 0 0 0;
          opacity: 0.9;
          font-size: 16px;
        }
        .logo { 
          max-width: 120px; 
          height: auto; 
          margin-bottom: 15px;
          border-radius: 8px;
        }
        .content {
          padding: 40px 30px;
        }
        .greeting {
          font-size: 18px;
          margin-bottom: 25px;
          color: #374151;
        }
        .invoice-details { 
          background: #f8fafc; 
          padding: 25px; 
          border-radius: 12px; 
          margin: 25px 0;
          border-left: 4px solid #3b82f6;
        }
        .invoice-details h3 {
          margin: 0 0 15px 0;
          color: #3b82f6;
          font-size: 20px;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          margin: 10px 0;
          padding: 8px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .detail-row:last-child {
          border-bottom: none;
          font-weight: 600;
          font-size: 16px;
          color: #1f2937;
        }
        .detail-label {
          color: #6b7280;
          font-weight: 500;
        }
        .detail-value {
          font-weight: 600;
          color: #1f2937;
        }
        .amount { 
          font-size: 28px; 
          font-weight: bold; 
          color: #059669;
          text-align: center;
          margin: 20px 0;
        }
        .button { 
          display: inline-block; 
          padding: 15px 30px; 
          background: linear-gradient(135deg, #059669, #047857);
          color: white; 
          text-decoration: none; 
          border-radius: 8px; 
          margin: 25px 0;
          font-weight: 600;
          text-align: center;
          transition: all 0.3s ease;
        }
        .button:hover {
          background: linear-gradient(135deg, #047857, #065f46);
          transform: translateY(-2px);
        }
        .project-info {
          background: #eff6ff;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #3b82f6;
        }
        .project-info h4 {
          margin: 0 0 10px 0;
          color: #1e40af;
        }
        .notes {
          background: #fef3c7;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #f59e0b;
        }
        .notes h4 {
          margin: 0 0 10px 0;
          color: #d97706;
        }
        .footer { 
          background: #f9fafb;
          padding: 30px; 
          border-top: 1px solid #e5e7eb; 
          font-size: 14px; 
          color: #6b7280;
          text-align: center;
        }
        .footer .company-info {
          margin-bottom: 15px;
        }
        .footer .company-info h4 {
          margin: 0 0 10px 0;
          color: #374151;
          font-size: 16px;
        }
        .footer p {
          margin: 5px 0;
        }
        .cta-section {
          text-align: center;
          margin: 30px 0;
          padding: 25px;
          background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
          border-radius: 12px;
          border: 1px solid #bae6fd;
        }
        .status-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .status-pending {
          background: #fef3c7;
          color: #92400e;
        }
        .status-paid {
          background: #d1fae5;
          color: #065f46;
        }
        @media (max-width: 600px) {
          .container {
            margin: 10px;
            border-radius: 8px;
          }
          .content {
            padding: 20px 15px;
          }
          .header {
            padding: 20px 15px;
          }
          .detail-row {
            flex-direction: column;
            gap: 5px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          ${user.companyLogo ? `<img src="${user.companyLogo}" alt="${user.companyName || user.name}" class="logo">` : ''}
          <h1>${user.companyName || user.name}</h1>
          <p>${docTypeTitle} électronique</p>
        </div>
        
        <div class="content">
          <div class="greeting">
            Bonjour ${clientName},
          </div>
          
          <p>
            ${invoice.type === 'PROFORMA' 
              ? `Veuillez trouver ci-joint votre devis n°<strong>${invoice.invoiceNumber}</strong>.`
              : `Veuillez trouver ci-joint votre facture n°<strong>${invoice.invoiceNumber}</strong>.`
            }
          </p>
          
          <div class="invoice-details">
            <h3>📋 Détails du ${docType.toLowerCase()}</h3>
            <div class="detail-row">
              <span class="detail-label">Numéro :</span>
              <span class="detail-value">${invoice.invoiceNumber}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Date d'émission :</span>
              <span class="detail-value">${formatDate(invoice.createdAt)}</span>
            </div>
            ${invoice.dueDate ? `
              <div class="detail-row">
                <span class="detail-label">${invoice.type === 'PROFORMA' ? 'Validité jusqu\'au' : 'Date d\'échéance'} :</span>
                <span class="detail-value">${formatDate(invoice.dueDate)}</span>
              </div>
            ` : ''}
            <div class="detail-row">
              <span class="detail-label">Statut :</span>
              <span class="detail-value">
                <span class="status-badge ${invoice.status === 'PAID' ? 'status-paid' : 'status-pending'}">
                  ${invoice.status === 'PAID' ? '✅ Payé' : '⏳ En attente'}
                </span>
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Montant total :</span>
              <span class="detail-value amount">${formatCurrency(invoice.amount)}</span>
            </div>
          </div>

          ${invoice.project ? `
            <div class="project-info">
              <h4>🎯 Projet concerné</h4>
              <p><strong>${invoice.project.name}</strong></p>
              ${invoice.project.description ? `<p>${invoice.project.description}</p>` : ''}
            </div>
          ` : ''}

          ${invoice.notes ? `
            <div class="notes">
              <h4>📝 Notes importantes</h4>
              <p>${invoice.notes}</p>
            </div>
          ` : ''}

          ${invoice.paymentLink ? `
            <div class="cta-section">
              <h3 style="margin: 0 0 15px 0; color: #1f2937;">💳 Paiement en ligne</h3>
              <p style="margin: 0 0 20px 0; color: #6b7280;">
                Vous pouvez régler cette ${invoice.type === 'PROFORMA' ? 'proforma' : 'facture'} directement en ligne de manière sécurisée.
              </p>
              <a href="${invoice.paymentLink}" class="button">
                🔒 Payer maintenant - ${formatCurrency(invoice.amount)}
              </a>
            </div>
          ` : ''}

          <div style="margin: 30px 0; padding: 20px; background: #f0fdf4; border-radius: 8px; border-left: 4px solid #22c55e;">
            <p style="margin: 0; color: #15803d;">
              <strong>💬 Questions ?</strong> N'hésitez pas à me contacter si vous avez besoin de clarifications ou d'informations supplémentaires.
            </p>
          </div>

          <p style="margin: 25px 0; color: #6b7280;">
            Merci pour votre confiance ! 🙏
          </p>
        </div>
        
        <div class="footer">
          <div class="company-info">
            <h4>${user.companyName || user.name}</h4>
            ${user.address ? `<p>📍 ${user.address}</p>` : ''}
            ${user.phone ? `<p>📞 ${user.phone}</p>` : ''}
            <p>📧 ${user.email}</p>
            ${user.website ? `<p>🌐 ${user.website}</p>` : ''}
          </div>
          
          <p style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb; font-size: 12px;">
            ${invoice.type === 'PROFORMA' 
              ? 'Ce devis est généré automatiquement par notre système de gestion.'
              : 'Cette facture est générée automatiquement par notre système de facturation.'
            }
          </p>
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