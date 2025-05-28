import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

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
        },
        items: true
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

    // Générer le PDF avec le même design que les factures
    const pdf = generateCleanProformaPDF(proforma, user, companySettings)

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

function generateCleanProformaPDF(proforma: any, user: any, companySettings: any): ArrayBuffer {
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
  const accentColor = [34, 197, 94] as [number, number, number]

  const formatCurrency = (amount: number) => {
    // Formatage manuel pour éviter les problèmes avec Intl
    const formatted = amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    return formatted + ' FCFA'
  }

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('fr-FR')
  }

  const getValidityText = (proforma: any) => {
    if (proforma.dueDate) {
      return `Ce devis est valable jusqu'au ${formatDate(proforma.dueDate)}.`
    } else {
      const validityDate = new Date(proforma.createdAt)
      validityDate.setDate(validityDate.getDate() + 30)
      return `Ce devis est valable jusqu'au ${formatDate(validityDate)} (30 jours).`
    }
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
  doc.text('DEVIS PROFORMA', margin, 20)
  
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  const numberText = `N° ${proforma.invoiceNumber}`
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
  doc.text('CLIENT', rightColumnX, clientStartY)

  let clientY = clientStartY + 8
  doc.setTextColor(textColor[0], textColor[1], textColor[2])
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')

  const clientName = proforma.clientName || proforma.project?.client?.name || 'Client'
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
  const clientEmail = proforma.clientEmail || proforma.project?.client?.email
  const clientAddress = proforma.clientAddress || proforma.project?.client?.address
  const clientPhone = proforma.clientPhone || proforma.project?.client?.phone

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

  // Informations du proforma
  checkPageBreak(30)
  
  const proformaInfoData = [
    ['Date de création', formatDate(proforma.createdAt)],
    ['Date d\'échéance', proforma.dueDate ? formatDate(proforma.dueDate) : 'Non définie'],
    ['Validité', getValidityText(proforma)]
  ]

  if (proforma.project) {
    proformaInfoData.push(['Projet', proforma.project.name])
  }

  autoTable(doc, {
    startY: currentY,
    body: proformaInfoData,
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

  if (proforma.items && proforma.items.length > 0) {
    tableData = proforma.items.map((item: any) => [
      item.name + (item.description ? `\n${item.description}` : ''),
      item.quantity.toString(),
      item.unit || 'unité',
      formatCurrency(item.unitPrice),
      formatCurrency(item.totalPrice)
    ])
  } else if (proforma.project?.services && proforma.project.services.length > 0) {
    tableData = proforma.project.services.map((service: any) => [
      service.name + (service.description ? `\n${service.description}` : ''),
      (service.quantity || 1).toString(),
      service.unit || 'forfait',
      formatCurrency(service.amount),
      formatCurrency((service.amount || 0) * (service.quantity || 1))
    ])
  } else {
    tableData = [[
      proforma.project ? `Projet: ${proforma.project.name}` : 'Prestation',
      '1',
      'forfait',
      formatCurrency(proforma.amount),
      formatCurrency(proforma.amount)
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
  doc.text(formatCurrency(proforma.amount), totalBoxX + 5, currentY + 16)

  currentY += 30

  // Notes
  if (proforma.notes) {
    checkPageBreak(20)
    
    doc.setTextColor(textColor[0], textColor[1], textColor[2])
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('NOTES', margin, currentY)
    currentY += 6

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2])
    const notesLines = doc.splitTextToSize(proforma.notes, pageWidth - 2 * margin)
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

  // Informations de validité
  checkPageBreak(20)
  
  doc.setFillColor(240, 253, 244)
  doc.rect(margin, currentY - 3, pageWidth - 2 * margin, 18, 'F')
  
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2])
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('⏰ VALIDITÉ DU DEVIS', margin + 3, currentY + 4)
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2])
  doc.text(getValidityText(proforma), margin + 3, currentY + 10)
  
  currentY += 22

  // Conditions
  checkPageBreak(30)
  
  doc.setTextColor(textColor[0], textColor[1], textColor[2])
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('CONDITIONS :', margin, currentY)
  currentY += 6
  
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2])
  const conditions = [
    '• Ce devis devient un contrat dès acceptation et signature.',
    '• Les travaux débuteront après réception de l\'accord écrit.',
    '• Toute modification fera l\'objet d\'un avenant.',
    '• Paiement selon les conditions convenues.'
  ]
  
  conditions.forEach(condition => {
    doc.text(condition, margin, currentY)
    currentY += 4
  })
  
  currentY += 10

  // Section signatures
  checkPageBreak(40)
  
  doc.setTextColor(textColor[0], textColor[1], textColor[2])
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('SIGNATURES :', margin, currentY)
  currentY += 8
  
  // Signature client
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Bon pour accord - Signature client :', margin, currentY)
  
  // Ligne pour signature client
  doc.setDrawColor(lightColor[0], lightColor[1], lightColor[2])
  doc.line(margin, currentY + 15, margin + 80, currentY + 15)
  
  // Signature prestataire
  const prestataireX = pageWidth - margin - 80
  doc.text('Le prestataire :', prestataireX, currentY)
  
  if (user.signature) {
    try {
      // Ajouter la signature numérique
      doc.addImage(user.signature, 'PNG', prestataireX, currentY + 3, 60, 15)
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la signature:', error)
      // Fallback: ligne pour signature manuelle
      doc.line(prestataireX, currentY + 15, prestataireX + 80, currentY + 15)
    }
  } else {
    // Ligne pour signature manuelle si pas de signature numérique
    doc.line(prestataireX, currentY + 15, prestataireX + 80, currentY + 15)
  }
  
  currentY += 25

  // Pied de page
  const footerY = pageHeight - 15
  
  doc.setDrawColor(lightColor[0], lightColor[1], lightColor[2])
  doc.line(margin, footerY, pageWidth - margin, footerY)
  
  doc.setFontSize(8)
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2])
  doc.setFont('helvetica', 'normal')
  
  const footerText = `Devis généré le ${formatDate(new Date())} par REV - Gestion Freelance`
  doc.text(footerText, margin, footerY + 8)

  return doc.output('arraybuffer')
} 