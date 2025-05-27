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
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #0f172a;
          background: #f8fafc;
          padding: 20px;
        }
        
        .preview-container {
          max-width: 900px;
          margin: 0 auto;
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          overflow: hidden;
        }
        
        .preview-header {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          padding: 24px;
          text-align: center;
        }
        
        .preview-header h1 {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 8px;
        }
        
        .preview-header p {
          opacity: 0.9;
          font-size: 16px;
        }
        
        .document-container {
          padding: 48px;
        }
        
        .header {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 40px;
          margin-bottom: 48px;
          padding-bottom: 24px;
          border-bottom: 3px solid #3b82f6;
        }
        
        .company-info h2 {
          color: #3b82f6;
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 16px;
        }
        
        .company-info p {
          margin: 8px 0;
          color: #64748b;
          font-size: 15px;
        }
        
        .company-details {
          margin-top: 16px;
          font-size: 13px;
          color: #64748b;
        }
        
        .company-details p {
          margin: 4px 0;
        }
        
        .proforma-info {
          background: #f1f5f9;
          padding: 24px;
          border-radius: 12px;
          border-left: 4px solid #3b82f6;
          min-width: 280px;
        }
        
        .proforma-info h3 {
          color: #3b82f6;
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 16px;
        }
        
        .proforma-info p {
          margin: 8px 0;
          font-size: 15px;
        }
        
        .client-section {
          margin: 48px 0;
        }
        
        .client-section h4 {
          color: #3b82f6;
          margin-bottom: 20px;
          font-size: 20px;
          font-weight: 600;
        }
        
        .client-info {
          background: #f8fafc;
          padding: 24px;
          border-radius: 12px;
          border-left: 4px solid #3b82f6;
        }
        
        .client-info p {
          margin: 8px 0;
          font-size: 15px;
        }
        
        .details-section {
          margin: 48px 0;
        }
        
        .section-title {
          color: #0f172a;
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 24px;
          padding-bottom: 8px;
          border-bottom: 2px solid #e2e8f0;
        }
        
        .details-table {
          width: 100%;
          border-collapse: collapse;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        .details-table th {
          background: linear-gradient(135deg, #475569 0%, #334155 100%);
          color: white;
          padding: 20px 16px;
          text-align: left;
          font-weight: 600;
          font-size: 14px;
        }
        
        .details-table td {
          padding: 20px 16px;
          border-bottom: 1px solid #e2e8f0;
          font-size: 15px;
        }
        
        .details-table tr:nth-child(even) {
          background: #f9fafb;
        }
        
        .details-table tr:last-child td {
          border-bottom: none;
        }
        
        .service-description {
          font-weight: 600;
          color: #0f172a;
        }
        
        .service-details {
          color: #64748b;
          font-size: 14px;
          margin-top: 4px;
        }
        
        .text-center {
          text-align: center;
        }
        
        .text-right {
          text-align: right;
        }
        
        .font-bold {
          font-weight: 600;
        }
        
        .total-section {
          margin: 48px 0;
          display: flex;
          justify-content: flex-end;
        }
        
        .total-box {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          padding: 32px;
          border-radius: 16px;
          min-width: 300px;
          text-align: center;
          box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.3);
        }
        
        .total-box h4 {
          font-size: 18px;
          margin-bottom: 12px;
          opacity: 0.9;
          font-weight: 600;
        }
        
        .total-box .amount {
          font-size: 36px;
          font-weight: 700;
          letter-spacing: -0.02em;
        }
        
        .notes-section {
          margin: 48px 0;
          padding: 24px;
          background: #f0fdf4;
          border-radius: 12px;
          border-left: 4px solid #22c55e;
        }
        
        .notes-section h4 {
          color: #15803d;
          margin-bottom: 16px;
          font-size: 18px;
          font-weight: 600;
        }
        
        .notes-section p {
          color: #166534;
          font-size: 15px;
          line-height: 1.7;
        }
        
        .validity-section {
          margin: 48px 0;
          padding: 24px;
          background: #fef3c7;
          border-radius: 12px;
          border-left: 4px solid #f59e0b;
          text-align: center;
        }
        
        .validity-section h4 {
          color: #d97706;
          margin-bottom: 12px;
          font-size: 18px;
          font-weight: 600;
        }
        
        .validity-section p {
          color: #92400e;
          font-size: 16px;
          font-weight: 500;
        }
        
        .conditions-section {
          margin: 48px 0;
          padding: 24px;
          background: #f1f5f9;
          border-radius: 12px;
        }
        
        .conditions-section h4 {
          color: #475569;
          margin-bottom: 16px;
          font-size: 18px;
          font-weight: 600;
        }
        
        .conditions-list {
          color: #64748b;
          font-size: 14px;
          line-height: 1.7;
        }
        
        .conditions-list li {
          margin: 8px 0;
        }
        
        .footer {
          margin-top: 64px;
          padding: 32px 24px;
          background: #f8fafc;
          border-radius: 12px;
          border-top: 3px solid #3b82f6;
          text-align: center;
        }
        
        .footer p {
          color: #64748b;
          font-size: 15px;
          margin: 8px 0;
        }
        
        .company-footer {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
        }
        
        .company-footer p {
          font-size: 13px;
          margin: 4px 0;
        }
        
        .signature-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 48px;
          margin-top: 48px;
          padding: 24px;
          border: 2px dashed #cbd5e1;
          border-radius: 12px;
        }
        
        .signature-box {
          text-align: center;
          padding: 24px;
        }
        
        .signature-box h5 {
          color: #475569;
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 40px;
        }
        
        .signature-line {
          border-bottom: 2px solid #cbd5e1;
          width: 200px;
          margin: 0 auto;
          height: 40px;
        }
        
        .actions-bar {
          position: fixed;
          bottom: 24px;
          right: 24px;
          display: flex;
          gap: 12px;
          z-index: 1000;
        }
        
        .action-btn {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          border: none;
          padding: 16px 24px;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
          transition: all 0.2s ease;
        }
        
        .action-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
        }
        
        .action-btn.secondary {
          background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
          box-shadow: 0 4px 12px rgba(107, 114, 128, 0.3);
        }
        
        .action-btn.secondary:hover {
          box-shadow: 0 8px 20px rgba(107, 114, 128, 0.4);
        }
        
        @media (max-width: 768px) {
          .document-container {
            padding: 24px;
          }
          
          .header {
            grid-template-columns: 1fr;
            gap: 24px;
          }
          
          .signature-section {
            grid-template-columns: 1fr;
            gap: 24px;
          }
          
          .actions-bar {
            position: static;
            justify-content: center;
            margin-top: 24px;
          }
        }
      </style>
    </head>
    <body>
      <div class="preview-container">
        <div class="preview-header">
          <h1>Prévisualisation du Devis</h1>
          <p>Document généré le ${formatDate(new Date())}</p>
        </div>
        
        <div class="document-container">
          <!-- En-tête -->
          <div class="header">
            <div class="company-info">
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
              <h3>DEVIS PROFORMA</h3>
              <p><strong>N°:</strong> ${proforma.invoiceNumber}</p>
              <p><strong>Date:</strong> ${formatDate(proforma.createdAt)}</p>
              ${proforma.dueDate ? `<p><strong>Échéance:</strong> ${formatDate(proforma.dueDate)}</p>` : ''}
            </div>
          </div>
          
          <!-- Informations client -->
          <div class="client-section">
            <h4>Client :</h4>
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
            <h4 class="section-title">Détail des prestations</h4>
            <table class="details-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th class="text-center" style="width: 100px;">Qté</th>
                  <th class="text-right" style="width: 120px;">Prix unitaire</th>
                  <th class="text-right" style="width: 150px;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${proforma.project?.services && proforma.project.services.length > 0 ? 
                  proforma.project.services.map((service: any) => `
                    <tr>
                      <td>
                        <div class="service-description">${service.name}</div>
                        ${service.description ? `<div class="service-details">${service.description}</div>` : ''}
                        ${service.unit ? `<div class="service-details">Unité: ${service.unit}</div>` : ''}
                      </td>
                      <td class="text-center">${service.quantity || 1}</td>
                      <td class="text-right">${formatCurrency(service.amount)}</td>
                      <td class="text-right font-bold">${formatCurrency((service.amount || 0) * (service.quantity || 1))}</td>
                    </tr>
                  `).join('') : `
                    <tr>
                      <td>
                        <div class="service-description">
                          ${proforma.project ? `Projet: ${proforma.project.name}` : 'Prestation'}
                        </div>
                        ${proforma.project?.description ? `<div class="service-details">${proforma.project.description}</div>` : ''}
                      </td>
                      <td class="text-center">1</td>
                      <td class="text-right">${formatCurrency(proforma.amount)}</td>
                      <td class="text-right font-bold">${formatCurrency(proforma.amount)}</td>
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
          
          <!-- Validité du devis -->
          <div class="validity-section">
            <h4>⏰ Validité du devis</h4>
            <p>${getValidityText()}</p>
          </div>
          
          <!-- Notes -->
          ${proforma.notes ? `
            <div class="notes-section">
              <h4>📝 Notes</h4>
              <p>${proforma.notes}</p>
            </div>
          ` : ''}
          
          <!-- Conditions -->
          <div class="conditions-section">
            <h4>📋 Conditions générales</h4>
            <ul class="conditions-list">
              <li>• Ce devis devient un contrat dès acceptation et signature.</li>
              <li>• Les travaux débuteront après réception de l'accord écrit du client.</li>
              <li>• Toute modification du cahier des charges fera l'objet d'un avenant.</li>
              <li>• Paiement selon les modalités convenues entre les parties.</li>
            </ul>
          </div>
          
          <!-- Signature -->
          <div class="signature-section">
            <div class="signature-box">
              <h5>Bon pour accord</h5>
              <div class="signature-line"></div>
              <p style="margin-top: 12px; color: #64748b; font-size: 14px;">Signature du client</p>
            </div>
            <div class="signature-box">
              <h5>Le prestataire</h5>
              <div class="signature-line"></div>
              <p style="margin-top: 12px; color: #64748b; font-size: 14px;">${companyName}</p>
            </div>
          </div>
          
          <!-- Pied de page -->
          <div class="footer">
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