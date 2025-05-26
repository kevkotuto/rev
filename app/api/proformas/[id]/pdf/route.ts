import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import puppeteer from "puppeteer"

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
            client: true
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

    // Récupérer les informations de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    // Générer le HTML du proforma
    const html = generateProformaHTML(proforma, user)

    // Générer le PDF avec Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    
    const pdf = await page.pdf({
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

    // Retourner le PDF
    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="proforma-${proforma.invoiceNumber}.pdf"`
      }
    })

  } catch (error) {
    console.error("Erreur lors de la génération du PDF:", error)
    return NextResponse.json(
      { message: "Erreur lors de la génération du PDF" },
      { status: 500 }
    )
  }
}

function generateProformaHTML(proforma: any, user: any) {
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

  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Proforma ${proforma.invoiceNumber}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.6;
          color: #333;
          background: white;
        }
        
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
          border-bottom: 3px solid #3b82f6;
          padding-bottom: 20px;
        }
        
        .company-info h1 {
          color: #3b82f6;
          font-size: 28px;
          margin-bottom: 10px;
        }
        
        .company-info p {
          margin: 5px 0;
          color: #666;
        }
        
        .proforma-info {
          text-align: right;
        }
        
        .proforma-info h2 {
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
        
        .client-section h3 {
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
        }
        
        .details-table th,
        .details-table td {
          padding: 15px;
          text-align: left;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .details-table th {
          background: #3b82f6;
          color: white;
          font-weight: 600;
        }
        
        .details-table tr:hover {
          background: #f8fafc;
        }
        
        .total-section {
          margin: 40px 0;
          text-align: right;
        }
        
        .total-box {
          display: inline-block;
          background: #3b82f6;
          color: white;
          padding: 20px;
          border-radius: 8px;
          min-width: 250px;
        }
        
        .total-box h3 {
          font-size: 24px;
          margin-bottom: 10px;
        }
        
        .notes-section {
          margin: 40px 0;
          padding: 20px;
          background: #f8fafc;
          border-radius: 8px;
        }
        
        .notes-section h3 {
          color: #3b82f6;
          margin-bottom: 15px;
        }
        
        .footer {
          margin-top: 60px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
          text-align: center;
          color: #666;
          font-size: 14px;
        }
        
        @media print {
          .container {
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- En-tête -->
        <div class="header">
          <div class="company-info">
            <h1>${user?.companyName || user?.name || 'Mon Entreprise'}</h1>
            ${user?.address ? `<p>${user.address}</p>` : ''}
            ${user?.phone ? `<p>Tél: ${user.phone}</p>` : ''}
            ${user?.email ? `<p>Email: ${user.email}</p>` : ''}
          </div>
          <div class="proforma-info">
            <h2>PROFORMA</h2>
            <p><strong>N°:</strong> ${proforma.invoiceNumber}</p>
            <p><strong>Date:</strong> ${formatDate(proforma.createdAt)}</p>
            ${proforma.dueDate ? `<p><strong>Échéance:</strong> ${formatDate(proforma.dueDate)}</p>` : ''}
          </div>
        </div>
        
        <!-- Informations client -->
        <div class="client-section">
          <h3>Facturé à :</h3>
          <div class="client-info">
            ${proforma.clientName ? `<p><strong>${proforma.clientName}</strong></p>` : ''}
            ${proforma.project?.client?.name && !proforma.clientName ? `<p><strong>${proforma.project.client.name}</strong></p>` : ''}
            ${proforma.clientAddress ? `<p>${proforma.clientAddress}</p>` : ''}
            ${proforma.project?.client?.address && !proforma.clientAddress ? `<p>${proforma.project.client.address}</p>` : ''}
            ${proforma.clientEmail ? `<p>Email: ${proforma.clientEmail}</p>` : ''}
            ${proforma.project?.client?.email && !proforma.clientEmail ? `<p>Email: ${proforma.project.client.email}</p>` : ''}
            ${proforma.clientPhone ? `<p>Tél: ${proforma.clientPhone}</p>` : ''}
            ${proforma.project?.client?.phone && !proforma.clientPhone ? `<p>Tél: ${proforma.project.client.phone}</p>` : ''}
          </div>
        </div>
        
        <!-- Détails du devis -->
        <div class="details-section">
          <table class="details-table">
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align: right;">Montant</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  ${proforma.project ? `<strong>Projet:</strong> ${proforma.project.name}` : 'Prestation'}
                  ${proforma.notes ? `<br><small>${proforma.notes}</small>` : ''}
                </td>
                <td style="text-align: right; font-weight: 600;">
                  ${formatCurrency(proforma.amount)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Total -->
        <div class="total-section">
          <div class="total-box">
            <h3>Total TTC</h3>
            <p style="font-size: 28px; font-weight: bold;">
              ${formatCurrency(proforma.amount)}
            </p>
          </div>
        </div>
        
        <!-- Notes -->
        ${proforma.notes ? `
          <div class="notes-section">
            <h3>Notes</h3>
            <p>${proforma.notes}</p>
          </div>
        ` : ''}
        
        <!-- Pied de page -->
        <div class="footer">
          <p>Ce devis est valable 30 jours à compter de la date d'émission.</p>
          <p>Merci de votre confiance !</p>
        </div>
      </div>
    </body>
    </html>
  `
} 