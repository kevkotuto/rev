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
    const pdf = generateCleanInvoicePDF(invoice, user, companySettings)

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

function generateCleanInvoicePDF(invoice: any, user: any, companySettings: any): ArrayBuffer {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  let currentY = margin

  // Couleurs
  const primaryColor = [59, 130, 246] as [number, number, number]
  const textColor = [15, 23, 42] as [number, number, number]
  const mutedColor = [100, 116, 139] as [number, number, number]
  const lightColor = [248, 250, 252] as [number, number, number]
  const whiteColor = [255, 255, 255] as [number, number, number]

  const formatCurrency = (amount: number) => {
    // Formatage manuel pour éviter les problèmes avec Intl
    const formatted = amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    return formatted + ' FCFA'
  }

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('fr-FR')
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'PAID': 'Payée',
      'PENDING': 'En attente',
      'OVERDUE': 'En retard',
      'CANCELLED': 'Annulée'
    }
    return labels[status] || status
  }

  const checkPageBreak = (requiredHeight: number) => {
    if (currentY + requiredHeight > pageHeight - margin) {
      doc.addPage()
      currentY = margin
    }
  }

  // En-tête
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.rect(0, 0, pageWidth, 30, 'F')
  
  doc.setTextColor(whiteColor[0], whiteColor[1], whiteColor[2])
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  const documentTitle = invoice.type === 'PROFORMA' ? 'DEVIS PROFORMA' : 'FACTURE'
  doc.text(documentTitle, margin, 20)
  
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  const numberText = `N° ${invoice.invoiceNumber}`
  const numberWidth = doc.getTextWidth(numberText)
  doc.text(numberText, pageWidth - margin - numberWidth, 20)

  currentY = 40

  // Informations entreprise et client
  const companyName = companySettings?.name || user?.companyName || user?.name || 'Mon Entreprise'
  const leftColumnWidth = (pageWidth - 3 * margin) / 2
  const rightColumnX = margin + leftColumnWidth + margin

  // Entreprise (gauche)
  doc.setTextColor(textColor[0], textColor[1], textColor[2])
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(companyName, margin, currentY)
  currentY += 8

  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2])
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')

  const companyInfo = []
  const address = companySettings?.address || user?.address
  const phone = companySettings?.phone || user?.phone
  const email = companySettings?.email || user?.email

  if (address) companyInfo.push(address)
  if (phone) companyInfo.push(`Tél: ${phone}`)
  if (email) companyInfo.push(`Email: ${email}`)

  companyInfo.forEach(info => {
    const lines = doc.splitTextToSize(info, leftColumnWidth)
    if (Array.isArray(lines)) {
      lines.forEach((line: string) => {
        doc.text(line, margin, currentY)
        currentY += 4
      })
    } else {
      doc.text(lines, margin, currentY)
      currentY += 4
    }
  })

  // Informations légales
  if (companySettings) {
    currentY += 2
    doc.setFontSize(8)
    if (companySettings.rccm) {
      doc.text(`RCCM: ${companySettings.rccm}`, margin, currentY)
      currentY += 3
    }
    if (companySettings.nif) {
      doc.text(`NIF: ${companySettings.nif}`, margin, currentY)
      currentY += 3
    }
  }

  // Client (droite)
  const clientStartY = 40
  doc.setFillColor(lightColor[0], lightColor[1], lightColor[2])
  doc.rect(rightColumnX - 5, clientStartY - 5, leftColumnWidth + 10, 40, 'F')

  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('FACTURÉ À', rightColumnX, clientStartY)

  let clientY = clientStartY + 8
  doc.setTextColor(textColor[0], textColor[1], textColor[2])
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')

  const clientName = invoice.clientName || invoice.project?.client?.name || 'Client'
  const clientNameLines = doc.splitTextToSize(clientName, leftColumnWidth - 10)
  if (Array.isArray(clientNameLines)) {
    clientNameLines.forEach((line: string) => {
      doc.text(line, rightColumnX, clientY)
      clientY += 5
    })
  } else {
    doc.text(clientNameLines, rightColumnX, clientY)
    clientY += 5
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2])

  const clientDetails = []
  const clientEmail = invoice.clientEmail || invoice.project?.client?.email
  const clientAddress = invoice.clientAddress || invoice.project?.client?.address
  const clientPhone = invoice.clientPhone || invoice.project?.client?.phone

  if (clientEmail) clientDetails.push(clientEmail)
  if (clientAddress) clientDetails.push(clientAddress)
  if (clientPhone) clientDetails.push(`Tél: ${clientPhone}`)

  clientDetails.forEach(detail => {
    const lines = doc.splitTextToSize(detail, leftColumnWidth - 10)
    if (Array.isArray(lines)) {
      lines.forEach((line: string) => {
        doc.text(line, rightColumnX, clientY)
        clientY += 4
      })
    } else {
      doc.text(lines, rightColumnX, clientY)
      clientY += 4
    }
  })

  currentY = Math.max(currentY, clientY) + 15

  // Informations de facturation
  checkPageBreak(30)
  
  const invoiceInfoData = [
    ['Date de création', formatDate(invoice.createdAt)],
    ['Date d\'échéance', invoice.dueDate ? formatDate(invoice.dueDate) : 'Non définie'],
    ['Statut', getStatusLabel(invoice.status)]
  ]

  if (invoice.project) {
    invoiceInfoData.push(['Projet', invoice.project.name])
  }

  if (invoice.paidDate) {
    invoiceInfoData.push(['Date de paiement', formatDate(invoice.paidDate)])
  }

  autoTable(doc, {
    startY: currentY,
    body: invoiceInfoData,
    bodyStyles: { 
      fontSize: 9,
      cellPadding: { top: 3, bottom: 3, left: 6, right: 6 }
    },
    columnStyles: {
      0: { 
        fontStyle: 'bold', 
        cellWidth: 45, 
        fillColor: lightColor 
      },
      1: { cellWidth: 55 }
    },
    margin: { left: margin, right: pageWidth - margin - 100 },
    tableWidth: 100,
    theme: 'grid'
  })

  currentY = (doc as any).lastAutoTable.finalY + 15

  // Services/Items
  checkPageBreak(50)
  
  doc.setTextColor(textColor[0], textColor[1], textColor[2])
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('DÉTAIL DES PRESTATIONS', margin, currentY)
  currentY += 8

  let tableData: any[] = []

  if (invoice.items && invoice.items.length > 0) {
    tableData = invoice.items.map((item: any) => [
      item.name + (item.description ? `\n${item.description}` : ''),
      item.quantity.toString(),
      item.unit || 'unité',
      formatCurrency(item.unitPrice),
      formatCurrency(item.totalPrice)
    ])
  } else {
    tableData = [[
      invoice.project ? `Projet: ${invoice.project.name}` : 'Prestation',
      '1',
      'forfait',
      formatCurrency(invoice.amount),
      formatCurrency(invoice.amount)
    ]]
  }

  autoTable(doc, {
    startY: currentY,
    head: [['Description', 'Qté', 'Unité', 'Prix unitaire', 'Total']],
    body: tableData,
    headStyles: { 
      fillColor: [71, 85, 105],
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
      cellPadding: { top: 6, bottom: 6, left: 4, right: 4 }
    },
    bodyStyles: { 
      fontSize: 9,
      cellPadding: { top: 5, bottom: 5, left: 4, right: 4 }
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 15, halign: 'center' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 40, halign: 'right' },
      4: { cellWidth: 40, halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: margin, right: margin },
    theme: 'grid'
  })

  currentY = (doc as any).lastAutoTable.finalY + 15

  // Total
  checkPageBreak(25)
  
  const totalBoxWidth = 70
  const totalBoxX = pageWidth - margin - totalBoxWidth

  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.roundedRect(totalBoxX, currentY, totalBoxWidth, 20, 2, 2, 'F')

  doc.setTextColor(whiteColor[0], whiteColor[1], whiteColor[2])
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL TTC', totalBoxX + 5, currentY + 8)

  doc.setFontSize(14)
  doc.text(formatCurrency(invoice.amount), totalBoxX + 5, currentY + 16)

  currentY += 30

  // Notes
  if (invoice.notes) {
    checkPageBreak(20)
    
    doc.setTextColor(textColor[0], textColor[1], textColor[2])
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('NOTES', margin, currentY)
    currentY += 6

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2])
    const notesLines = doc.splitTextToSize(invoice.notes, pageWidth - 2 * margin)
    if (Array.isArray(notesLines)) {
      notesLines.forEach((line: string) => {
        doc.text(line, margin, currentY)
        currentY += 4
      })
    } else {
      doc.text(notesLines, margin, currentY)
      currentY += 4
    }
    currentY += 8
  }

  // Informations de paiement
  if (invoice.paymentLink && invoice.status !== 'PAID') {
    checkPageBreak(20)
    
    doc.setFillColor(240, 253, 244)
    doc.rect(margin, currentY - 3, pageWidth - 2 * margin, 18, 'F')
    
    doc.setTextColor(34, 197, 94)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('💳 PAIEMENT EN LIGNE DISPONIBLE', margin + 3, currentY + 4)
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2])
    doc.text('Payez facilement via Wave CI en scannant le QR code ou en cliquant sur le lien.', 
      margin + 3, currentY + 10)
    
    currentY += 22
  }

  // Badge de statut
  checkPageBreak(15)
  
  if (invoice.status === 'PAID') {
    doc.setFillColor(34, 197, 94)
    doc.roundedRect(margin, currentY, 50, 12, 2, 2, 'F')
    
    doc.setTextColor(whiteColor[0], whiteColor[1], whiteColor[2])
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('✓ PAYÉE', margin + 3, currentY + 8)
    
    if (invoice.paidDate) {
      doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2])
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.text(`le ${formatDate(invoice.paidDate)}`, margin + 55, currentY + 8)
    }
  } else if (invoice.status === 'OVERDUE') {
    doc.setFillColor(239, 68, 68)
    doc.roundedRect(margin, currentY, 60, 12, 2, 2, 'F')
    
    doc.setTextColor(whiteColor[0], whiteColor[1], whiteColor[2])
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('⚠ EN RETARD', margin + 3, currentY + 8)
  } else if (invoice.status === 'PENDING') {
    doc.setFillColor(245, 158, 11)
    doc.roundedRect(margin, currentY, 70, 12, 2, 2, 'F')
    
    doc.setTextColor(whiteColor[0], whiteColor[1], whiteColor[2])
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('⏳ EN ATTENTE', margin + 3, currentY + 8)
  }

  currentY += 20

  // Signature
  if (user.signature) {
    checkPageBreak(30)
    
    doc.setTextColor(textColor[0], textColor[1], textColor[2])
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('Signature:', pageWidth - margin - 60, currentY)
    
    try {
      // Ajouter la signature comme image
      doc.addImage(user.signature, 'PNG', pageWidth - margin - 60, currentY + 3, 50, 20)
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la signature:', error)
      // Fallback: afficher juste le texte
      doc.setFont('helvetica', 'normal')
      doc.text('(Signature numérique)', pageWidth - margin - 60, currentY + 10)
    }
    
    currentY += 25
  }

  // Pied de page
  const footerY = pageHeight - 20
  
  doc.setDrawColor(lightColor[0], lightColor[1], lightColor[2])
  doc.line(margin, footerY, pageWidth - margin, footerY)
  
  doc.setFontSize(8)
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2])
  doc.setFont('helvetica', 'normal')
  
  const footerText = `Document généré le ${formatDate(new Date())} par REV - Gestion Freelance`
  doc.text(footerText, margin, footerY + 8)
  
  // Informations bancaires
  if (companySettings?.bankName || companySettings?.bankAccount) {
    const bankInfoX = pageWidth - margin - 70
    doc.text('Informations bancaires:', bankInfoX, footerY + 4)
    
    if (companySettings.bankName) {
      doc.text(`Banque: ${companySettings.bankName}`, bankInfoX, footerY + 8)
    }
    if (companySettings.bankAccount) {
      doc.text(`Compte: ${companySettings.bankAccount}`, bankInfoX, footerY + 12)
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