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
    // Formatage manuel pour éviter les problèmes avec Intl
    const formatted = amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    return formatted + ' FCFA'
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
          width: 210mm; /* A4 width */
          min-height: 297mm; /* A4 height */
          margin: 0 auto;
          background: white;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          position: relative;
          overflow: hidden;
        }
        
        @media screen and (max-width: 220mm) {
          .preview-container {
            width: 100%;
            min-height: auto;
            margin: 0;
          }
          
          body {
            padding: 10px;
          }
        }
        
        .preview-header {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          padding: 20px 0;
          text-align: center;
          height: 30mm;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
        }
        
        .preview-header h1 {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 4px;
        }
        
        .preview-header p {
          opacity: 0.9;
          font-size: 12px;
        }
        
        .document-container {
          padding: 15mm;
          min-height: calc(297mm - 30mm - 15mm); /* A4 height - header - bottom padding */
        }
        
        .header {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 20px;
          margin-bottom: 30px;
          padding-bottom: 15px;
          border-bottom: 3px solid #3b82f6;
        }
        
        .company-info h2 {
          color: #3b82f6;
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 10px;
        }
        
        .company-info p {
          margin: 6px 0;
          color: #64748b;
          font-size: 13px;
        }
        
        .company-details {
          margin-top: 12px;
          font-size: 11px;
          color: #64748b;
        }
        
        .company-details p {
          margin: 3px 0;
        }
        
        .proforma-info {
          background: #f1f5f9;
          padding: 15px;
          border-radius: 8px;
          border-left: 4px solid #3b82f6;
          min-width: 200px;
        }
        
        .proforma-info h3 {
          color: #3b82f6;
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 10px;
        }
        
        .proforma-info p {
          margin: 6px 0;
          font-size: 13px;
        }
        
        .client-section {
          margin: 30px 0;
        }
        
        .client-section h4 {
          color: #3b82f6;
          margin-bottom: 15px;
          font-size: 16px;
          font-weight: 600;
        }
        
        .client-info {
          background: #f8fafc;
          padding: 15px;
          border-radius: 8px;
          border-left: 4px solid #3b82f6;
        }
        
        .client-info p {
          margin: 6px 0;
          font-size: 13px;
        }
        
        .details-section {
          margin: 30px 0;
        }
        
        .section-title {
          color: #0f172a;
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 15px;
          padding-bottom: 6px;
          border-bottom: 2px solid #e2e8f0;
        }
        
        .details-table {
          width: 100%;
          border-collapse: collapse;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          font-size: 13px;
        }
        
        .details-table th {
          background: linear-gradient(135deg, #475569 0%, #334155 100%);
          color: white;
          padding: 12px 10px;
          text-align: left;
          font-weight: 600;
          font-size: 12px;
        }
        
        .details-table td {
          padding: 12px 10px;
          border-bottom: 1px solid #e2e8f0;
          font-size: 12px;
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
          font-size: 13px;
        }
        
        .service-details {
          color: #64748b;
          font-size: 11px;
          margin-top: 3px;
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
          margin: 30px 0;
          display: flex;
          justify-content: flex-end;
        }
        
        .total-box {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          padding: 20px;
          border-radius: 12px;
          min-width: 200px;
          text-align: center;
          box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);
        }
        
        .total-box h4 {
          font-size: 14px;
          margin-bottom: 8px;
          opacity: 0.9;
          font-weight: 600;
        }
        
        .total-box .amount {
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.02em;
        }
        
        .notes-section {
          margin: 30px 0;
          padding: 15px;
          background: #f0fdf4;
          border-radius: 8px;
          border-left: 4px solid #22c55e;
        }
        
        .notes-section h4 {
          color: #15803d;
          margin-bottom: 10px;
          font-size: 14px;
          font-weight: 600;
        }
        
        .notes-section p {
          color: #166534;
          font-size: 13px;
          line-height: 1.6;
        }
        
        .validity-section {
          margin: 30px 0;
          padding: 15px;
          background: #f0fdf4;
          border-radius: 8px;
          border-left: 4px solid #22c55e;
          text-align: center;
        }
        
        .validity-section h4 {
          color: #15803d;
          margin-bottom: 8px;
          font-size: 14px;
          font-weight: 600;
        }
        
        .validity-section p {
          color: #166534;
          font-size: 13px;
          font-weight: 500;
        }
        
        .footer {
          margin-top: 40px;
          padding: 20px 15px;
          background: #f8fafc;
          border-radius: 8px;
          border-top: 3px solid #3b82f6;
          text-align: center;
        }
        
        .footer p {
          color: #64748b;
          font-size: 13px;
          margin: 6px 0;
        }
        
        .company-footer {
          margin-top: 15px;
          padding-top: 15px;
          border-top: 1px solid #e2e8f0;
        }
        
        .company-footer p {
          font-size: 11px;
          margin: 3px 0;
        }
        
        .signature-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          margin-top: 40px;
          padding: 20px;
          border: 2px dashed #cbd5e1;
          border-radius: 12px;
        }
        
        .signature-box {
          text-align: center;
          padding: 20px;
        }
        
        .signature-box h5 {
          color: #475569;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 30px;
        }
        
        .signature-line {
          border-bottom: 2px solid #cbd5e1;
          width: 150px;
          margin: 0 auto;
          height: 40px;
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
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 12px;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
          transition: all 0.2s ease;
        }
        
        .action-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        }
        
        .action-btn.secondary {
          background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
          box-shadow: 0 2px 8px rgba(107, 114, 128, 0.3);
        }
        
        .action-btn.secondary:hover {
          box-shadow: 0 4px 12px rgba(107, 114, 128, 0.4);
        }
        
        @media (max-width: 768px) {
          .document-container {
            padding: 15px;
          }
          
          .header {
            grid-template-columns: 1fr;
            gap: 15px;
          }
          
          .signature-section {
            grid-template-columns: 1fr;
            gap: 24px;
          }
          
          .actions-bar {
            position: static;
            justify-content: center;
            margin-top: 20px;
          }
        }
        
        @media print {
          body {
            background: white;
            padding: 0;
          }
          
          .preview-container {
            box-shadow: none;
            width: 100%;
            min-height: auto;
          }
          
          .preview-header {
            break-inside: avoid;
          }
          
          .actions-bar {
            display: none;
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
            <h4 class="section-title">Détail des prestations</h4>
            <table class="details-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th class="text-center" style="width: 100px;">Qté</th>
                  <th class="text-center" style="width: 120px;">Unité</th>
                  <th class="text-right" style="width: 120px;">Prix unitaire</th>
                  <th class="text-right" style="width: 150px;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${proforma.items && proforma.items.length > 0 ? 
                  proforma.items.map((item: any) => `
                    <tr>
                      <td>
                        <div class="service-description">${item.name}</div>
                        ${item.description ? `<div class="service-details">${item.description}</div>` : ''}
                      </td>
                      <td class="text-center">${item.quantity}</td>
                      <td class="text-center">${item.unit || 'unité'}</td>
                      <td class="text-right">${formatCurrency(item.unitPrice)}</td>
                      <td class="text-right font-bold">${formatCurrency(item.totalPrice)}</td>
                    </tr>
                  `).join('') : 
                  proforma.project?.services && proforma.project.services.length > 0 ? 
                  proforma.project.services.map((service: any) => `
                    <tr>
                      <td>
                        <div class="service-description">${service.name}</div>
                        ${service.description ? `<div class="service-details">${service.description}</div>` : ''}
                      </td>
                      <td class="text-center">${service.quantity || 1}</td>
                      <td class="text-center">${service.unit || 'forfait'}</td>
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
                      <td class="text-center">forfait</td>
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
          
          <!-- Notes -->
          ${proforma.notes ? `
            <div class="notes-section">
              <h4>📝 NOTES</h4>
              <p>${proforma.notes}</p>
            </div>
          ` : ''}
          
          <!-- Validité du devis (spécifique aux proformas) -->
          <div class="validity-section">
            <h4>⏰ VALIDITÉ DU DEVIS</h4>
            <p>${getValidityText()}</p>
          </div>
          
          <!-- Signature -->
          <div class="signature-section">
            <div class="signature-box">
              <h5>Bon pour accord - Signature client</h5>
              <div class="signature-line"></div>
              <div style="margin-top: 15px; font-size: 12px; color: #64748b;">
                <p>Date : ____/____/____</p>
                <p>Nom : ${proforma.clientName || proforma.project?.client?.name || 'Client'}</p>
              </div>
            </div>
            <div class="signature-box">
              <h5>Le prestataire</h5>
              ${user?.signature ? `
                <div style="display: flex; justify-content: center; margin: 20px 0;">
                  <img src="${user.signature}" alt="Signature" style="max-width: 150px; max-height: 60px; border: 1px solid #e2e8f0; border-radius: 4px;" />
                </div>
              ` : `
                <div class="signature-line"></div>
              `}
              <div style="margin-top: 15px; font-size: 12px; color: #64748b;">
                <p>${companyName}</p>
              </div>
            </div>
          </div>
          
          <!-- Pied de page -->
          <div class="footer">
            <p>Merci de votre confiance ! 🙏</p>
            
            <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center;">
              <p>Document généré le ${formatDate(new Date())} par REV - Gestion Freelance</p>
            </div>
            
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