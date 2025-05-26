import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Non autorisé" },
        { status: 401 }
      )
    }

    // Récupérer le proforma avec les informations complètes
    const proforma = await prisma.invoice.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
        type: "PROFORMA"
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

    if (!proforma) {
      return NextResponse.json(
        { message: "Proforma non trouvé" },
        { status: 404 }
      )
    }

    // Récupérer les informations de l'entreprise et de l'utilisateur
    const [user, companySettings] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id }
      }),
      prisma.companySettings.findUnique({
        where: { userId: session.user.id }
      })
    ])

    // Générer le HTML du proforma
    const html = generateProformaPreviewHTML(proforma, user, companySettings)

    // Retourner le HTML
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      }
    })

  } catch (error) {
    console.error("Erreur lors de la génération de la prévisualisation:", error)
    return NextResponse.json(
      { message: "Erreur lors de la génération de la prévisualisation" },
      { status: 500 }
    )
  }
}

function generateProformaPreviewHTML(proforma: any, user: any, companySettings: any) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('fr-FR')
  }

  // Calculer la date d'expiration basée sur la date d'échéance ou 30 jours par défaut
  const getValidityText = () => {
    if (proforma.dueDate) {
      return `Ce devis est valable jusqu'au ${formatDate(proforma.dueDate)}.`
    } else {
      const validityDate = new Date(proforma.createdAt)
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

  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Prévisualisation - Proforma ${proforma.invoiceNumber}</title>
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
          background: #f8fafc;
          padding: 20px;
        }
        
        .preview-container {
          max-width: 900px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        
        .preview-header {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
          padding: 20px;
          text-align: center;
        }
        
        .preview-header h1 {
          font-size: 24px;
          margin-bottom: 5px;
        }
        
        .preview-header p {
          opacity: 0.9;
        }
        
        .document-container {
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
        
        .proforma-info {
          text-align: right;
          flex-shrink: 0;
        }
        
        .proforma-info h3 {
          color: #3b82f6;
          font-size: 24px;
          margin-bottom: 10px;
        }
        
        .proforma-info p {
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
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
          padding: 25px;
          border-radius: 12px;
          min-width: 280px;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
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
        
        .actions-bar {
          position: fixed;
          bottom: 20px;
          right: 20px;
          display: flex;
          gap: 10px;
          z-index: 1000;
        }
        
        .action-btn {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
          transition: all 0.2s;
        }
        
        .action-btn:hover {
          background: #1d4ed8;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
        }
        
        .action-btn.secondary {
          background: #6b7280;
        }
        
        .action-btn.secondary:hover {
          background: #4b5563;
        }
        
        @media (max-width: 768px) {
          .header {
            flex-direction: column;
            gap: 20px;
          }
          
          .proforma-info {
            text-align: left;
          }
          
          .actions-bar {
            position: static;
            justify-content: center;
            margin-top: 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="preview-container">
        <div class="preview-header">
          <h1>Prévisualisation du Proforma</h1>
          <p>Document généré le ${formatDate(new Date())}</p>
        </div>
        
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
            <div class="proforma-info">
              <h3>PROFORMA</h3>
              <p><strong>N°:</strong> ${proforma.invoiceNumber}</p>
              <p><strong>Date:</strong> ${formatDate(proforma.createdAt)}</p>
              ${proforma.dueDate ? `<p><strong>Échéance:</strong> ${formatDate(proforma.dueDate)}</p>` : ''}
            </div>
          </div>
          
          <!-- Informations client -->
          <div class="client-section">
            <h4>Facturé à :</h4>
            <div class="client-info">
              ${proforma.clientName ? `<p><strong>${proforma.clientName}</strong></p>` : ''}
              ${proforma.project?.client?.name && !proforma.clientName ? `<p><strong>${proforma.project.client.name}</strong></p>` : ''}
              ${proforma.clientAddress ? `<p>📍 ${proforma.clientAddress}</p>` : ''}
              ${proforma.project?.client?.address && !proforma.clientAddress ? `<p>📍 ${proforma.project.client.address}</p>` : ''}
              ${proforma.clientEmail ? `<p>📧 ${proforma.clientEmail}</p>` : ''}
              ${proforma.project?.client?.email && !proforma.clientEmail ? `<p>📧 ${proforma.project.client.email}</p>` : ''}
              ${proforma.clientPhone ? `<p>📞 ${proforma.clientPhone}</p>` : ''}
              ${proforma.project?.client?.phone && !proforma.clientPhone ? `<p>📞 ${proforma.project.client.phone}</p>` : ''}
            </div>
          </div>
          
          <!-- Détails du devis -->
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
                ${proforma.project?.services && proforma.project.services.length > 0 ? 
                  proforma.project.services.map((service: any) => `
                    <tr class="service-row">
                      <td>
                        <strong>${service.name}</strong>
                        ${service.description ? `<br><small style="color: #666;">${service.description}</small>` : ''}
                        ${service.unit ? `<br><small style="color: #888;">Unité: ${service.unit}</small>` : ''}
                      </td>
                      <td style="text-align: center;">${service.quantity}</td>
                      <td style="text-align: right;">${formatCurrency(service.amount)}</td>
                      <td style="text-align: right; font-weight: 600;">${formatCurrency(service.amount * service.quantity)}</td>
                    </tr>
                  `).join('') : `
                    <tr>
                      <td>
                        ${proforma.project ? `<strong>Projet:</strong> ${proforma.project.name}` : 'Prestation'}
                        ${proforma.project?.description ? `<br><small style="color: #666;">${proforma.project.description}</small>` : ''}
                      </td>
                      <td style="text-align: center;">1</td>
                      <td style="text-align: right;">${formatCurrency(proforma.amount)}</td>
                      <td style="text-align: right; font-weight: 600;">${formatCurrency(proforma.amount)}</td>
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
              <div class="amount">${formatCurrency(proforma.amount)}</div>
            </div>
          </div>
          
          <!-- Notes -->
          ${proforma.notes ? `
            <div class="notes-section">
              <h4>📝 Notes</h4>
              <p>${proforma.notes}</p>
            </div>
          ` : ''}
          
          <!-- Pied de page -->
          <div class="footer">
            <div class="validity">${getValidityText()}</div>
            <p>Merci de votre confiance ! 🙏</p>
            
            ${companySettings ? `
              <div class="company-footer">
                ${companySettings.bankName ? `<p><strong>Banque:</strong> ${companySettings.bankName}</p>` : ''}
                ${companySettings.bankAccount ? `<p><strong>Compte:</strong> ${companySettings.bankAccount}</p>` : ''}
                ${companySettings.legalForm ? `<p><strong>Forme juridique:</strong> ${companySettings.legalForm}</p>` : ''}
              </div>
            ` : ''}
          </div>
        </div>
      </div>
      
      <!-- Barre d'actions -->
      <div class="actions-bar">
        <a href="/api/proformas/${proforma.id}/pdf" class="action-btn" target="_blank">
          📄 Télécharger PDF
        </a>
        <button onclick="window.close()" class="action-btn secondary">
          ✕ Fermer
        </button>
      </div>
    </body>
    </html>
  `
} 