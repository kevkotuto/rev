import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { jsPDF } from "jspdf"
import "jspdf-autotable"

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

    // Récupérer les informations utilisateur
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { 
        name: true, 
        email: true,
        companyName: true,
        address: true,
        phone: true
      }
    })

    // Création du PDF
    const doc = new jsPDF()
    
    // Configuration des couleurs
    const primaryColor = [59, 130, 246] // blue-500
    const secondaryColor = [107, 114, 128] // gray-500
    const textColor = [31, 41, 55] // gray-800

    // En-tête avec logo/branding
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.rect(0, 0, 210, 30, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(20)
    doc.text(invoice.type === 'PROFORMA' ? 'PROFORMA' : 'FACTURE', 20, 20)
    
    doc.setFontSize(12)
    doc.text(`N° ${invoice.invoiceNumber}`, 150, 20)

    // Informations de l'entreprise
    doc.setTextColor(textColor[0], textColor[1], textColor[2])
    doc.setFontSize(12)
    let yPos = 45

    doc.setFont('helvetica', 'bold')
    doc.text(user?.companyName || user?.name || 'Entreprise', 20, yPos)
    yPos += 6

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    if (user?.address) {
      doc.text(user.address, 20, yPos)
      yPos += 5
    }
    if (user?.phone) {
      doc.text(`Tél: ${user.phone}`, 20, yPos)
      yPos += 5
    }
    if (user?.email) {
      doc.text(`Email: ${user.email}`, 20, yPos)
      yPos += 5
    }

    // Informations client
    yPos = 45
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('FACTURÉ À :', 120, yPos)
    yPos += 8

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    
    const clientName = invoice.clientName || invoice.project?.client?.name || 'Client non défini'
    doc.text(clientName, 120, yPos)
    yPos += 5

    if (invoice.clientEmail || invoice.project?.client?.email) {
      doc.text(invoice.clientEmail || invoice.project?.client?.email || '', 120, yPos)
      yPos += 5
    }

    if (invoice.clientAddress) {
      const lines = doc.splitTextToSize(invoice.clientAddress, 70)
      doc.text(lines, 120, yPos)
      yPos += lines.length * 5
    }

    if (invoice.clientPhone) {
      doc.text(`Tél: ${invoice.clientPhone}`, 120, yPos)
      yPos += 5
    }

    // Informations de la facture
    yPos = Math.max(yPos, 85)
    
    const infoData = [
      ['Information', 'Détail'],
      ['Date de création', new Date(invoice.createdAt).toLocaleDateString('fr-FR')],
      ['Date d\'échéance', invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('fr-FR') : 'Non définie'],
      ['Statut', getStatusLabel(invoice.status)],
      ...(invoice.project ? [['Projet', invoice.project.name]] : []),
      ...(invoice.paidDate ? [['Date de paiement', new Date(invoice.paidDate).toLocaleDateString('fr-FR')]] : [])
    ]

    doc.autoTable({
      startY: yPos,
      head: [infoData[0]],
      body: infoData.slice(1),
      headStyles: { 
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontSize: 10
      },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 40 },
        1: { cellWidth: 70 }
      },
      margin: { left: 20, right: 90 }
    })

    yPos = (doc as any).lastAutoTable.finalY + 15

    // Services/Items
    if (invoice.items && invoice.items.length > 0) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.text('DÉTAIL DES SERVICES', 20, yPos)
      yPos += 10

      const itemsData = [
        ['Description', 'Qté', 'Unité', 'Prix unit.', 'Total'],
        ...invoice.items.map(item => [
          item.name + (item.description ? `\n${item.description}` : ''),
          item.quantity.toString(),
          item.unit || 'unité',
          `${item.unitPrice.toLocaleString()} XOF`,
          `${item.totalPrice.toLocaleString()} XOF`
        ])
      ]

      doc.autoTable({
        startY: yPos,
        head: [itemsData[0]],
        body: itemsData.slice(1),
        headStyles: { 
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontSize: 10
        },
        bodyStyles: { 
          fontSize: 9,
          cellPadding: 3
        },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 30, halign: 'right' },
          4: { cellWidth: 35, halign: 'right', fontStyle: 'bold' }
        }
      })

      yPos = (doc as any).lastAutoTable.finalY + 10
    }

    // Total
    const totalData = [
      ['', 'Montant'],
      ['TOTAL', `${invoice.amount.toLocaleString()} XOF`]
    ]

    doc.autoTable({
      startY: yPos,
      head: [totalData[0]],
      body: [totalData[1]],
      headStyles: { 
        fillColor: [248, 250, 252],
        textColor: textColor,
        fontSize: 10
      },
      bodyStyles: { 
        fontSize: 12,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 150, halign: 'right', fontStyle: 'bold' },
        1: { cellWidth: 40, halign: 'right', fontStyle: 'bold', fillColor: primaryColor, textColor: [255, 255, 255] }
      }
    })

    yPos = (doc as any).lastAutoTable.finalY + 15

    // Notes
    if (invoice.notes) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.text('NOTES :', 20, yPos)
      yPos += 8

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      const notesLines = doc.splitTextToSize(invoice.notes, 170)
      doc.text(notesLines, 20, yPos)
      yPos += notesLines.length * 5 + 10
    }

    // Informations de paiement Wave si lien actif
    if (invoice.paymentLink && invoice.status !== 'PAID') {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.text('PAIEMENT EN LIGNE :', 20, yPos)
      yPos += 8

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text('Vous pouvez payer cette facture en ligne via Wave CI :', 20, yPos)
      yPos += 6

      doc.setTextColor(59, 130, 246) // blue
      doc.text(invoice.paymentLink, 20, yPos)
      doc.setTextColor(textColor[0], textColor[1], textColor[2])
      yPos += 10
    }

    // Statut de paiement
    if (invoice.status === 'PAID') {
      doc.setFillColor(34, 197, 94) // green-500
      doc.rect(20, yPos, 170, 15, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.text('✓ FACTURE PAYÉE', 25, yPos + 10)
      
      if (invoice.paidDate) {
        doc.text(`Le ${new Date(invoice.paidDate).toLocaleDateString('fr-FR')}`, 140, yPos + 10)
      }
      
      doc.setTextColor(textColor[0], textColor[1], textColor[2])
    } else if (invoice.status === 'OVERDUE') {
      doc.setFillColor(239, 68, 68) // red-500
      doc.rect(20, yPos, 170, 15, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.text('⚠ FACTURE EN RETARD', 25, yPos + 10)
      
      doc.setTextColor(textColor[0], textColor[1], textColor[2])
    }

    // Pied de page
    const pageHeight = doc.internal.pageSize.height
    doc.setFontSize(8)
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
    doc.text(
      `Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')} - REV Freelance Management`,
      20,
      pageHeight - 10
    )

    // Génération du blob
    const pdfBuffer = doc.output('arraybuffer')

    const filename = `${invoice.type.toLowerCase()}-${invoice.invoiceNumber}.pdf`

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`
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

function getStatusLabel(status: string): string {
  switch (status) {
    case 'PAID': return 'Payée'
    case 'PENDING': return 'En attente'
    case 'OVERDUE': return 'En retard'
    case 'CANCELLED': return 'Annulée'
    default: return status
  }
} 