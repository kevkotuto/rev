import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Non autorisé" },
        { status: 401 }
      )
    }

    const { id } = await params

    // Récupérer les données de la facture
    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        userId: session.user.id
      },
      include: {
        project: {
          include: {
            client: true
          }
        },
        items: true
      }
    })

    if (!invoice) {
      return NextResponse.json(
        { message: "Facture non trouvée" },
        { status: 404 }
      )
    }

    // Récupérer les informations utilisateur et entreprise
    const [user, companySettings] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { 
          name: true, 
          email: true,
          companyName: true,
          address: true,
          phone: true
        }
      }),
      prisma.companySettings.findUnique({
        where: { userId: session.user.id }
      })
    ])

    // Générer le PDF
    const pdf = generateModernInvoicePDF(invoice, user, companySettings)

    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoice.type.toLowerCase()}-${invoice.invoiceNumber}.pdf"`
      }
    })

  } catch (error) {
    console.error("Erreur génération PDF facture:", error)
    return NextResponse.json(
      { 
        message: "Erreur lors de la génération du PDF",
        error: error instanceof Error ? error.message : "Erreur inconnue" 
      },
      { status: 500 }
    )
  }
}

function generateModernInvoicePDF(invoice: any, user: any, companySettings: any) {
  const doc = new jsPDF()
  
  // Configuration couleurs modernes
  const colors = {
    primary: [59, 130, 246] as [number, number, number], // blue-500
    secondary: [71, 85, 105] as [number, number, number], // slate-600
    accent: [34, 197, 94] as [number, number, number], // green-500
    text: [15, 23, 42] as [number, number, number], // slate-900
    muted: [100, 116, 139] as [number, number, number], // slate-500
    light: [248, 250, 252] as [number, number, number], // slate-50
    white: [255, 255, 255] as [number, number, number]
  }

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

  let yPos = 20
  const pageWidth = doc.internal.pageSize.width
  const margin = 20

  // En-tête moderne avec gradient effet
  doc.setFillColor(...colors.primary)
  doc.rect(0, 0, pageWidth, 40, 'F')
  
  // Titre du document
  doc.setTextColor(...colors.white)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  const documentTitle = invoice.type === 'PROFORMA' ? 'PROFORMA' : 'FACTURE'
  doc.text(documentTitle, margin, 25)
  
  // Numéro du document
  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.text(`N° ${invoice.invoiceNumber}`, pageWidth - margin - 50, 25)

  yPos = 55

  // Informations entreprise (gauche)
  doc.setTextColor(...colors.text)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  const companyName = companySettings?.name || user?.companyName || user?.name || 'Mon Entreprise'
  doc.text(companyName, margin, yPos)
  
  yPos += 10
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...colors.muted)
  
  const companyInfo = []
  const address = companySettings?.address || user?.address
  const phone = companySettings?.phone || user?.phone
  const email = companySettings?.email || user?.email
  
  if (address) companyInfo.push(address)
  if (phone) companyInfo.push(`Tél: ${phone}`)
  if (email) companyInfo.push(`Email: ${email}`)
  
  companyInfo.forEach(info => {
    doc.text(info, margin, yPos)
    yPos += 5
  })

  // Informations légales si disponibles
  if (companySettings) {
    yPos += 3
    doc.setFontSize(8)
    if (companySettings.rccm) {
      doc.text(`RCCM: ${companySettings.rccm}`, margin, yPos)
      yPos += 4
    }
    if (companySettings.nif) {
      doc.text(`NIF: ${companySettings.nif}`, margin, yPos)
      yPos += 4
    }
  }

  // Informations client (droite)
  const clientStartY = 55
  const clientX = pageWidth - margin - 80
  
  doc.setFillColor(...colors.light)
  doc.rect(clientX - 10, clientStartY - 5, 90, 45, 'F')
  
  doc.setTextColor(...colors.primary)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('FACTURÉ À', clientX, clientStartY)
  
  let clientY = clientStartY + 10
  doc.setTextColor(...colors.text)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  
  const clientName = invoice.clientName || invoice.project?.client?.name || 'Client'
  const clientNameLines = doc.splitTextToSize(clientName, 75)
  doc.text(clientNameLines, clientX, clientY)
  clientY += clientNameLines.length * 5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...colors.muted)
  
  const clientDetails = []
  const clientEmail = invoice.clientEmail || invoice.project?.client?.email
  const clientAddress = invoice.clientAddress || invoice.project?.client?.address
  const clientPhone = invoice.clientPhone || invoice.project?.client?.phone
  
  if (clientEmail) clientDetails.push(clientEmail)
  if (clientAddress) clientDetails.push(clientAddress)
  if (clientPhone) clientDetails.push(`Tél: ${clientPhone}`)
  
  clientDetails.forEach(detail => {
    const lines = doc.splitTextToSize(detail, 75)
    doc.text(lines, clientX, clientY)
    clientY += lines.length * 4
  })

  yPos = Math.max(yPos, clientY) + 20

  // Informations de facturation - table moderne
  const invoiceInfoData = [
    ['Date de création', formatDate(invoice.createdAt)],
    ['Date d\'échéance', invoice.dueDate ? formatDate(invoice.dueDate) : 'Non définie'],
    ['Statut', getStatusLabel(invoice.status)],
    ...(invoice.project ? [['Projet', invoice.project.name]] : []),
    ...(invoice.paidDate ? [['Date de paiement', formatDate(invoice.paidDate)]] : [])
  ]

  autoTable(doc, {
    startY: yPos,
    body: invoiceInfoData,
    headStyles: { 
      fillColor: colors.primary,
      textColor: colors.white,
      fontSize: 10,
      fontStyle: 'bold'
    },
    bodyStyles: { 
      fontSize: 9,
      cellPadding: { top: 4, bottom: 4, left: 8, right: 8 }
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50, fillColor: colors.light },
      1: { cellWidth: 60 }
    },
    margin: { left: margin, right: pageWidth - margin - 110 },
    tableWidth: 110
  })

  yPos = (doc as any).lastAutoTable.finalY + 20

  // Services/Items - Design moderne
  doc.setTextColor(...colors.text)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('DÉTAIL DES PRESTATIONS', margin, yPos)
  yPos += 10

  if (invoice.items && invoice.items.length > 0) {
    const itemsData = invoice.items.map((item: any) => [
      {
        content: item.name + (item.description ? `\n${item.description}` : ''),
        styles: { cellPadding: { top: 6, bottom: 6, left: 8, right: 8 } }
      },
      {
        content: item.quantity.toString(),
        styles: { halign: 'center' }
      },
      {
        content: item.unit || 'unité',
        styles: { halign: 'center', fontSize: 8 }
      },
      {
        content: formatCurrency(item.unitPrice),
        styles: { halign: 'right' }
      },
      {
        content: formatCurrency(item.totalPrice),
        styles: { halign: 'right', fontStyle: 'bold' }
      }
    ])

    autoTable(doc, {
      startY: yPos,
      head: [['Description', 'Qté', 'Unité', 'Prix unitaire', 'Total']],
      body: itemsData,
      headStyles: { 
        fillColor: colors.secondary,
        textColor: colors.white,
        fontSize: 10,
        fontStyle: 'bold',
        cellPadding: { top: 8, bottom: 8, left: 8, right: 8 }
      },
      bodyStyles: { 
        fontSize: 9,
        cellPadding: { top: 6, bottom: 6, left: 8, right: 8 },
        alternateRowStyles: { fillColor: [249, 250, 251] }
      },
      columnStyles: {
        0: { cellWidth: 85 },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 35, halign: 'right' },
        4: { cellWidth: 35, halign: 'right', fontStyle: 'bold', fillColor: colors.light }
      },
      margin: { left: margin, right: margin }
    })
  } else {
    // Projet simple
    const projectData = [[
      {
        content: invoice.project ? `Projet: ${invoice.project.name}` : 'Prestation',
        styles: { cellPadding: { top: 8, bottom: 8, left: 8, right: 8 } }
      },
      { content: '1', styles: { halign: 'center' } },
      { content: 'forfait', styles: { halign: 'center' } },
      { content: formatCurrency(invoice.amount), styles: { halign: 'right' } },
      { content: formatCurrency(invoice.amount), styles: { halign: 'right', fontStyle: 'bold' } }
    ]]

    autoTable(doc, {
      startY: yPos,
      head: [['Description', 'Qté', 'Unité', 'Prix unitaire', 'Total']],
      body: projectData,
      headStyles: { 
        fillColor: colors.secondary,
        textColor: colors.white,
        fontSize: 10,
        fontStyle: 'bold',
        cellPadding: { top: 8, bottom: 8, left: 8, right: 8 }
      },
      bodyStyles: { 
        fontSize: 10,
        cellPadding: { top: 8, bottom: 8, left: 8, right: 8 }
      },
      columnStyles: {
        0: { cellWidth: 85 },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 35, halign: 'right' },
        4: { cellWidth: 35, halign: 'right', fontStyle: 'bold', fillColor: colors.light }
      },
      margin: { left: margin, right: margin }
    })
  }

  yPos = (doc as any).lastAutoTable.finalY + 15

  // Total moderne avec design élégant
  const totalBoxWidth = 80
  const totalBoxX = pageWidth - margin - totalBoxWidth
  
  // Fond du total
  doc.setFillColor(...colors.primary)
  doc.roundedRect(totalBoxX, yPos, totalBoxWidth, 25, 3, 3, 'F')
  
  // Texte total
  doc.setTextColor(...colors.white)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL TTC', totalBoxX + 5, yPos + 10)
  
  doc.setFontSize(16)
  doc.text(formatCurrency(invoice.amount), totalBoxX + 5, yPos + 20)

  yPos += 35

  // Notes si présentes
  if (invoice.notes) {
    doc.setTextColor(...colors.text)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('NOTES', margin, yPos)
    yPos += 8

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...colors.muted)
    const notesLines = doc.splitTextToSize(invoice.notes, pageWidth - 2 * margin)
    doc.text(notesLines, margin, yPos)
    yPos += notesLines.length * 5 + 10
  }

  // Informations de paiement Wave
  if (invoice.paymentLink && invoice.status !== 'PAID') {
    yPos += 10
    
    // Encadré pour le paiement en ligne
    doc.setFillColor(240, 253, 244) // green-50
    doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 25, 'F')
    
    doc.setTextColor(...colors.accent)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('💳 PAIEMENT EN LIGNE DISPONIBLE', margin + 5, yPos + 5)
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...colors.muted)
    doc.text('Payez facilement via Wave CI en scannant le QR code ou en cliquant sur le lien dans votre email.', margin + 5, yPos + 12)
    
    yPos += 30
  }

  // Statut de paiement - Badge moderne
  if (invoice.status === 'PAID') {
    doc.setFillColor(...colors.accent)
    doc.roundedRect(margin, yPos, 60, 15, 3, 3, 'F')
    
    doc.setTextColor(...colors.white)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('✓ PAYÉE', margin + 5, yPos + 10)
    
    if (invoice.paidDate) {
      doc.setTextColor(...colors.muted)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.text(`le ${formatDate(invoice.paidDate)}`, margin + 70, yPos + 10)
    }
  } else if (invoice.status === 'OVERDUE') {
    doc.setFillColor(239, 68, 68) // red-500
    doc.roundedRect(margin, yPos, 80, 15, 3, 3, 'F')
    
    doc.setTextColor(...colors.white)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('⚠ EN RETARD', margin + 5, yPos + 10)
  } else if (invoice.status === 'PENDING') {
    doc.setFillColor(245, 158, 11) // amber-500
    doc.roundedRect(margin, yPos, 80, 15, 3, 3, 'F')
    
    doc.setTextColor(...colors.white)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('⏳ EN ATTENTE', margin + 5, yPos + 10)
  }

  // Pied de page moderne
  const pageHeight = doc.internal.pageSize.height
  doc.setDrawColor(...colors.light)
  doc.line(margin, pageHeight - 25, pageWidth - margin, pageHeight - 25)
  
  doc.setFontSize(8)
  doc.setTextColor(...colors.muted)
  doc.setFont('helvetica', 'normal')
  
  const footerText = `Document généré le ${formatDate(new Date())} par REV - Gestion Freelance`
  doc.text(footerText, margin, pageHeight - 15)
  
  // Informations bancaires si disponibles
  if (companySettings?.bankName || companySettings?.bankAccount) {
    doc.text('Informations bancaires:', pageWidth - margin - 60, pageHeight - 20)
    if (companySettings.bankName) {
      doc.text(`Banque: ${companySettings.bankName}`, pageWidth - margin - 60, pageHeight - 16)
    }
    if (companySettings.bankAccount) {
      doc.text(`Compte: ${companySettings.bankAccount}`, pageWidth - margin - 60, pageHeight - 12)
    }
  }

  return doc.output('arraybuffer')
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'PAID': return 'Payée'
    case 'PENDING': return 'En attente'
    case 'OVERDUE': return 'En retard'
    case 'CANCELLED': return 'Annulée'
    default: return status
  }
} 