import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

// Extend jsPDF with autoTable
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Non autorisé" },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'thisMonth'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Récupérer les données statistiques (même logique que l'API statistics principale)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true }
    })

    // Construction des filtres de date
    let dateFilter = {}
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      }
    }

    // Récupération des données
    const [clients, projects, tasks, invoices, expenses] = await Promise.all([
      prisma.client.findMany({
        where: { userId },
        include: {
          projects: { 
            select: { amount: true, status: true },
            where: startDate && endDate ? dateFilter : {}
          },
          _count: { select: { projects: true } }
        }
      }),
      prisma.project.findMany({
        where: { 
          userId,
          ...(startDate && endDate ? dateFilter : {})
        },
        include: {
          client: { select: { name: true } }
        }
      }),
      prisma.task.findMany({
        where: { 
          userId,
          ...(startDate && endDate ? dateFilter : {})
        }
      }),
      prisma.invoice.findMany({
        where: { 
          userId,
          ...(startDate && endDate ? dateFilter : {})
        }
      }),
      prisma.expense.findMany({
        where: { 
          userId,
          ...(startDate && endDate ? dateFilter : {})
        }
      })
    ])

    // Calculs des métriques
    const totalRevenue = invoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + i.amount, 0)
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
    const netProfit = totalRevenue - totalExpenses
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

    const activeProjects = projects.filter(p => p.status === 'IN_PROGRESS').length
    const completedProjects = projects.filter(p => p.status === 'COMPLETED').length
    const projectSuccessRate = projects.length > 0 ? (completedProjects / projects.length) * 100 : 0

    const paidInvoices = invoices.filter(i => i.status === 'PAID').length
    const pendingInvoices = invoices.filter(i => i.status === 'PENDING').length
    const overdueInvoices = invoices.filter(i => i.status === 'OVERDUE').length

    const completedTasks = tasks.filter(t => t.status === 'DONE').length
    const taskCompletionRate = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0

    // Création du PDF
    const doc = new jsPDF()
    
    // Configuration des couleurs
    const primaryColor: [number, number, number] = [59, 130, 246] // blue-500
    const secondaryColor: [number, number, number] = [107, 114, 128] // gray-500
    const successColor: [number, number, number] = [34, 197, 94] // green-500
    const warningColor: [number, number, number] = [251, 146, 60] // orange-500
    const dangerColor: [number, number, number] = [239, 68, 68] // red-500

    // En-tête
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.rect(0, 0, 210, 40, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(24)
    doc.text('REV - Rapport Statistiques', 20, 25)
    
    doc.setFontSize(12)
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 20, 32)
    doc.text(`Utilisateur: ${user?.name || 'Non défini'}`, 120, 32)

    // Période
    let periodLabel = ''
    switch(period) {
      case 'thisWeek': periodLabel = 'Cette semaine'; break
      case 'thisMonth': periodLabel = 'Ce mois'; break
      case 'lastMonth': periodLabel = 'Mois dernier'; break
      case 'thisQuarter': periodLabel = 'Ce trimestre'; break
      case 'thisYear': periodLabel = 'Cette année'; break
      case 'lastYear': periodLabel = 'Année dernière'; break
      case 'custom': periodLabel = `${startDate} → ${endDate}`; break
      default: periodLabel = 'Période sélectionnée'
    }

    doc.setTextColor(0, 0, 0)
    doc.setFontSize(14)
    doc.text(`Période: ${periodLabel}`, 20, 55)

    let yPos = 70

    // Métriques principales
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Métriques Principales', 20, yPos)
    yPos += 10

    const mainMetrics = [
      ['Métrique', 'Valeur', 'Statut'],
      [
        'Chiffre d\'affaires', 
        `${totalRevenue.toLocaleString()} XOF`,
        totalRevenue > 0 ? 'Positif' : 'Neutre'
      ],
      [
        'Marge bénéficiaire', 
        `${profitMargin.toFixed(1)}%`,
        profitMargin >= 20 ? 'Excellent' : profitMargin >= 10 ? 'Bon' : 'À améliorer'
      ],
      [
        'Taux de réussite projets', 
        `${projectSuccessRate.toFixed(1)}%`,
        projectSuccessRate >= 80 ? 'Excellent' : projectSuccessRate >= 60 ? 'Bon' : 'À améliorer'
      ],
      [
        'Taux de completion tâches', 
        `${taskCompletionRate.toFixed(1)}%`,
        taskCompletionRate >= 80 ? 'Excellent' : taskCompletionRate >= 60 ? 'Bon' : 'À améliorer'
      ]
    ]

    autoTable(doc, {
      startY: yPos,
      head: [mainMetrics[0]],
      body: mainMetrics.slice(1),
      headStyles: { fillColor: primaryColor },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { fontSize: 10 }
    })

    yPos = (doc as any).lastAutoTable.finalY + 15

    // Répartition des données
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Répartition des Données', 20, yPos)
    yPos += 10

    const dataBreakdown = [
      ['Catégorie', 'Total', 'Actifs/Terminés', 'En cours/En attente'],
      ['Clients', clients.length.toString(), '-', '-'],
      ['Projets', projects.length.toString(), completedProjects.toString(), activeProjects.toString()],
      ['Tâches', tasks.length.toString(), completedTasks.toString(), (tasks.length - completedTasks).toString()],
      ['Factures', invoices.length.toString(), paidInvoices.toString(), (pendingInvoices + overdueInvoices).toString()]
    ]

    autoTable(doc, {
      startY: yPos,
      head: [dataBreakdown[0]],
      body: dataBreakdown.slice(1),
      headStyles: { fillColor: primaryColor },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { fontSize: 10 }
    })

    yPos = (doc as any).lastAutoTable.finalY + 15

    // Analyse financière
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Analyse Financière', 20, yPos)
    yPos += 10

    const financialAnalysis = [
      ['Élément', 'Montant (XOF)', 'Pourcentage'],
      ['Revenus totaux', totalRevenue.toLocaleString(), '100%'],
      ['Dépenses totales', totalExpenses.toLocaleString(), totalRevenue > 0 ? `${((totalExpenses / totalRevenue) * 100).toFixed(1)}%` : '0%'],
      ['Bénéfice net', netProfit.toLocaleString(), totalRevenue > 0 ? `${profitMargin.toFixed(1)}%` : '0%']
    ]

    autoTable(doc, {
      startY: yPos,
      head: [financialAnalysis[0]],
      body: financialAnalysis.slice(1),
      headStyles: { fillColor: primaryColor },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { fontSize: 10 },
      columnStyles: {
        2: { halign: 'right' }
      }
    })

    yPos = (doc as any).lastAutoTable.finalY + 15

    // Top 5 clients
    if (clients.length > 0) {
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('Top 5 Clients', 20, yPos)
      yPos += 10

      const topClients = clients
        .map(c => ({
          ...c,
          totalValue: c.projects.reduce((sum, p) => sum + p.amount, 0)
        }))
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 5)

      const clientsData = [
        ['Client', 'Projets', 'Chiffre d\'affaires (XOF)', 'Part (%)'],
        ...topClients.map((client, index) => [
          client.name,
          client._count.projects.toString(),
          client.totalValue.toLocaleString(),
          totalRevenue > 0 ? `${((client.totalValue / totalRevenue) * 100).toFixed(1)}%` : '0%'
        ])
      ]

      autoTable(doc, {
        startY: yPos,
        head: [clientsData[0]],
        body: clientsData.slice(1),
        headStyles: { fillColor: primaryColor },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { fontSize: 10 },
        columnStyles: {
          2: { halign: 'right' },
          3: { halign: 'right' }
        }
      })

      yPos = (doc as any).lastAutoTable.finalY + 15
    }

    // Nouvelle page si nécessaire
    if (yPos > 250) {
      doc.addPage()
      yPos = 20
    }

    // État des factures
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('État des Factures', 20, yPos)
    yPos += 10

    const invoiceStatus = [
      ['Statut', 'Nombre', 'Pourcentage'],
      ['Payées', paidInvoices.toString(), `${((paidInvoices / invoices.length) * 100).toFixed(1)}%`],
      ['En attente', pendingInvoices.toString(), `${((pendingInvoices / invoices.length) * 100).toFixed(1)}%`],
      ['En retard', overdueInvoices.toString(), `${((overdueInvoices / invoices.length) * 100).toFixed(1)}%`]
    ]

    autoTable(doc, {
      startY: yPos,
      head: [invoiceStatus[0]],
      body: invoiceStatus.slice(1),
      headStyles: { fillColor: primaryColor },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { fontSize: 10 },
      columnStyles: {
        2: { halign: 'right' }
      }
    })

    yPos = (doc as any).lastAutoTable.finalY + 15

    // Recommandations
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Recommandations', 20, yPos)
    yPos += 10

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)

    const recommendations = []
    if (profitMargin < 10) {
      recommendations.push('• Améliorer la marge bénéficiaire en optimisant les coûts ou en augmentant les tarifs')
    }
    if (overdueInvoices > 0) {
      recommendations.push('• Relancer les factures en retard pour améliorer la trésorerie')
    }
    if (projectSuccessRate < 80) {
      recommendations.push('• Analyser les causes d\'échec des projets et mettre en place des mesures correctives')
    }
    if (taskCompletionRate < 70) {
      recommendations.push('• Améliorer la gestion des tâches et la productivité')
    }
    if (recommendations.length === 0) {
      recommendations.push('• Continuer sur cette excellente lancée !')
      recommendations.push('• Envisager d\'augmenter la capacité pour saisir plus d\'opportunités')
    }

    recommendations.forEach(rec => {
      doc.text(rec, 20, yPos, { maxWidth: 170 })
      yPos += 6
    })

    // Pied de page
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
      doc.text(
        `Page ${i} sur ${pageCount} - Généré par REV le ${new Date().toLocaleDateString('fr-FR')}`,
        20,
        290
      )
    }

    // Génération du blob
    const pdfBuffer = doc.output('arraybuffer')

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="rapport-statistiques-${period}-${new Date().toISOString().split('T')[0]}.pdf"`
      }
    })

  } catch (error) {
    console.error("Erreur génération PDF:", error)
    return NextResponse.json(
      { 
        message: "Erreur lors de la génération du PDF",
        error: error instanceof Error ? error.message : "Erreur inconnue" 
      },
      { status: 500 }
    )
  }
} 