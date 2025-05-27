import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Non autorisé" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'thisMonth'

    // Calculer les dates selon la période
    const now = new Date()
    let startDate: Date, endDate: Date

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
        break
      case 'thisWeek':
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - now.getDay())
        startOfWeek.setHours(0, 0, 0, 0)
        startDate = startOfWeek
        endDate = new Date()
        break
      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date()
        break
      case 'lastMonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
        break
      case 'thisYear':
        startDate = new Date(now.getFullYear(), 0, 1)
        endDate = new Date()
        break
      default: // 'all'
        startDate = new Date(2020, 0, 1) // Date suffisamment ancienne
        endDate = new Date()
        break
    }

    // Récupérer les factures (revenus)
    const invoices = await prisma.invoice.findMany({
      where: {
        userId: session.user.id,
        OR: [
          {
            paidDate: {
              gte: startDate,
              lte: endDate
            }
          },
          {
            createdAt: {
              gte: startDate,
              lte: endDate
            }
          }
        ]
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            client: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Récupérer les dépenses avec les informations du projet
    const expenses = await prisma.expense.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            client: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: { date: 'desc' }
    })

    // Convertir les factures en transactions
    const revenueTransactions = invoices.map(invoice => {
      // Utiliser la date de paiement si disponible, sinon la date de création
      const displayDate = invoice.paidDate || invoice.createdAt
      const dateLabel = invoice.paidDate ? 'Payée le' : 'Créée le'
      
      return {
        id: `invoice-${invoice.id}`,
        type: 'revenue' as const,
        description: `Facture ${invoice.invoiceNumber}${invoice.project ? ` - ${invoice.project.name}` : ''}`,
        amount: invoice.amount,
        date: displayDate.toISOString(),
        status: invoice.status,
        dateLabel,
        relatedType: 'invoice' as const,
        relatedId: invoice.id,
        relatedData: {
          invoiceNumber: invoice.invoiceNumber,
          projectName: invoice.project?.name,
          clientName: invoice.project?.client?.name
        }
      }
    })

    // Transformer les dépenses en transactions avec informations Wave
    const expenseTransactions = expenses.map(expense => {
      // Extraire l'ID Wave des notes si c'est un paiement prestataire
      let waveId = null
      if ((expense.category === 'PROVIDER_PAYMENT' || expense.category === 'PROVIDER_PAYMENT_REVERSAL') && expense.notes) {
        const waveIdMatch = expense.notes.match(/Wave ID: (pt-[a-zA-Z0-9]+)/) || 
                           expense.notes.match(/Paiement original: (pt-[a-zA-Z0-9]+)/)
        if (waveIdMatch) {
          waveId = waveIdMatch[1]
        }
      }

      return {
        id: `expense-${expense.id}`,
        type: 'expense' as const,
        description: expense.description,
        amount: -expense.amount, // Négatif pour les dépenses
        date: expense.date.toISOString(),
        status: 'completed' as const,
        category: expense.category,
        relatedType: expense.project ? 'project' : 'expense',
        relatedId: expense.project ? expense.project.id : expense.id,
        relatedData: {
          projectName: expense.project?.name,
          clientName: expense.project?.client?.name
        },
        waveId, // ID Wave pour la navigation
        isWavePayment: (expense.category === 'PROVIDER_PAYMENT' || expense.category === 'PROVIDER_PAYMENT_REVERSAL') && !!waveId,
        isReversal: expense.category === 'PROVIDER_PAYMENT_REVERSAL'
      }
    })

    // Combiner et trier toutes les transactions
    const allTransactions = [...revenueTransactions, ...expenseTransactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Calculer les statistiques
    const totalRevenue = revenueTransactions
      .filter(t => t.status === 'PAID')
      .reduce((sum, t) => sum + t.amount, 0)
    
    const totalExpenses = expenseTransactions
      .reduce((sum, t) => sum + t.amount, 0)
    
    const netFlow = totalRevenue - totalExpenses
    
    const transactionCount = allTransactions.length
    
    const pendingAmount = revenueTransactions
      .filter(t => t.status === 'PENDING' || t.status === 'OVERDUE')
      .reduce((sum, t) => sum + t.amount, 0)

    const stats = {
      totalRevenue,
      totalExpenses,
      netFlow,
      transactionCount,
      pendingAmount
    }

    return NextResponse.json({
      transactions: allTransactions,
      stats
    })

  } catch (error) {
    console.error("Erreur lors de la récupération des transactions:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 