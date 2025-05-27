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

    // Générer le PDF avec le même design que les factures
    const pdf = generateModernProformaPDF(proforma, user, companySettings)

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

function generateModernProformaPDF(proforma: any, user: any, companySettings: any) {
  const doc = new jsPDF()
  
  // Configuration couleurs modernes (identique aux factures)
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

  // Calculer la date d'expiration basée sur la date d'échéance ou 30 jours par défaut
  const getValidityText = () => {
    if (proforma.dueDate) {
      return `Ce devis est valable jusqu'au ${formatDate(proforma.dueDate)}.`
    } else {
      const validityDate = new Date(proforma.createdAt)
      validityDate.setDate(validityDate.getDate() + 30)
      return `Ce devis est valable jusqu'au ${formatDate(validityDate)} (30 jours).`
    }
  }

  let yPos = 20
  const pageWidth = doc.internal.pageSize.width
  const margin = 20

  // En-tête moderne avec gradient effet
  doc.setFillColor(...colors.primary)
  doc.rect(0, 0, pageWidth, 40, 'F')
  
  // Titre du document - PROFORMA
  doc.setTextColor(...colors.white)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('DEVIS PROFORMA', margin, 25)
  
  // Numéro du document
  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.text(`N° ${proforma.invoiceNumber}`, pageWidth - margin - 50, 25)

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
  doc.text('CLIENT', clientX, clientStartY)
  
  let clientY = clientStartY + 10
  doc.setTextColor(...colors.text)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  
  const clientName = proforma.clientName || proforma.project?.client?.name || 'Client'
  const clientNameLines = doc.splitTextToSize(clientName, 75)
  doc.text(clientNameLines, clientX, clientY)
  clientY += clientNameLines.length * 5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...colors.muted)
  
  const clientDetails = []
  const clientEmail = proforma.clientEmail || proforma.project?.client?.email
  const clientAddress = proforma.clientAddress || proforma.project?.client?.address
  const clientPhone = proforma.clientPhone || proforma.project?.client?.phone
  
  if (clientEmail) clientDetails.push(clientEmail)
  if (clientAddress) clientDetails.push(clientAddress)
  if (clientPhone) clientDetails.push(`Tél: ${clientPhone}`)
  
  clientDetails.forEach(detail => {
    const lines = doc.splitTextToSize(detail, 75)
    doc.text(lines, clientX, clientY)
    clientY += lines.length * 4
  })

  yPos = Math.max(yPos, clientY) + 20

  // Informations du devis - table moderne
  const proformaInfoData = [
    ['Date de création', formatDate(proforma.createdAt)],
    ['Date d\'échéance', proforma.dueDate ? formatDate(proforma.dueDate) : 'Non définie'],
    ['Validité', getValidityText()],
    ...(proforma.project ? [['Projet', proforma.project.name]] : [])
  ]

  autoTable(doc, {
    startY: yPos,
    body: proformaInfoData,
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

  // Services/Prestations - Design moderne
  doc.setTextColor(...colors.text)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('DÉTAIL DES PRESTATIONS', margin, yPos)
  yPos += 10

  if (proforma.project?.services && proforma.project.services.length > 0) {
    const servicesData = proforma.project.services.map((service: any) => [
      service.name + (service.description ? `\n${service.description}` : ''),
      service.quantity?.toString() || '1',
      service.unit || 'forfait',
      formatCurrency(service.amount),
      formatCurrency((service.amount || 0) * (service.quantity || 1))
    ])

    autoTable(doc, {
      startY: yPos,
      head: [['Description', 'Qté', 'Unité', 'Prix unitaire', 'Total']],
      body: servicesData,
      headStyles: { 
        fillColor: colors.secondary,
        textColor: colors.white,
        fontSize: 10,
        fontStyle: 'bold',
        cellPadding: { top: 8, bottom: 8, left: 8, right: 8 }
      },
      bodyStyles: { 
        fontSize: 9,
        cellPadding: { top: 6, bottom: 6, left: 8, right: 8 }
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
      proforma.project ? `Projet: ${proforma.project.name}` : 'Prestation',
      '1',
      'forfait',
      formatCurrency(proforma.amount),
      formatCurrency(proforma.amount)
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
  doc.text(formatCurrency(proforma.amount), totalBoxX + 5, yPos + 20)

  yPos += 35

  // Notes si présentes
  if (proforma.notes) {
    doc.setTextColor(...colors.text)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('NOTES', margin, yPos)
    yPos += 8

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...colors.muted)
    const notesLines = doc.splitTextToSize(proforma.notes, pageWidth - 2 * margin)
    doc.text(notesLines, margin, yPos)
    yPos += notesLines.length * 5 + 10
  }

  // Encadré de validité - Badge moderne
  yPos += 10
  doc.setFillColor(240, 253, 244) // green-50
  doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 25, 'F')
  
  doc.setTextColor(...colors.accent)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('⏰ VALIDITÉ DU DEVIS', margin + 5, yPos + 5)
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...colors.muted)
  doc.text(getValidityText(), margin + 5, yPos + 15)
  
  yPos += 35

  // Conditions générales
  doc.setTextColor(...colors.text)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('CONDITIONS :', margin, yPos)
  yPos += 6

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...colors.muted)
  const conditions = [
    '• Ce devis devient un contrat dès acceptation et signature.',
    '• Les travaux débuteront après réception de l\'accord écrit.',
    '• Toute modification fera l\'objet d\'un avenant.',
    '• Paiement selon les conditions convenues.'
  ]
  
  conditions.forEach(condition => {
    doc.text(condition, margin, yPos)
    yPos += 5
  })

  // Pied de page moderne
  const pageHeight = doc.internal.pageSize.height
  doc.setDrawColor(...colors.light)
  doc.line(margin, pageHeight - 25, pageWidth - margin, pageHeight - 25)
  
  doc.setFontSize(8)
  doc.setTextColor(...colors.muted)
  doc.setFont('helvetica', 'normal')
  
  const footerText = `Devis généré le ${formatDate(new Date())} par REV - Gestion Freelance`
  doc.text(footerText, margin, pageHeight - 15)
  
  // Signature
  doc.setTextColor(...colors.text)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Bon pour accord :', pageWidth - margin - 60, pageHeight - 20)
  doc.text('Signature client :', pageWidth - margin - 60, pageHeight - 12)

  return doc.output('arraybuffer')
} 