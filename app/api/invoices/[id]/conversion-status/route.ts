import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - Obtenir le statut de conversion partielle d'une proforma
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

    // Récupérer la proforma avec ses services et conversions
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
            services: {
              include: {
                invoiceItems: {
                  include: {
                    invoice: true
                  }
                }
              }
            }
          }
        },
        conversions: {
          where: {
            type: "INVOICE"
          },
          include: {
            items: {
              include: {
                projectService: true
              }
            }
          },
          orderBy: {
            createdAt: "desc"
          }
        }
      }
    })

    if (!proforma) {
      return NextResponse.json(
        { message: "Proforma non trouvée" },
        { status: 404 }
      )
    }

    // Calculer les statistiques de conversion
    const totalInvoicedAmount = proforma.conversions.reduce((sum, invoice) => sum + invoice.amount, 0)
    const remainingAmount = proforma.amount - totalInvoicedAmount
    const isFullyConverted = remainingAmount <= 0

    // Analyser quels services ont été facturés
    const serviceStatus = proforma.project?.services.map(service => {
      const invoicedItems = service.invoiceItems.filter(item => 
        item.invoice.parentProformaId === proforma.id
      )
      
      const totalInvoicedQuantity = invoicedItems.reduce((sum, item) => sum + item.quantity, 0)
      const remainingQuantity = service.quantity - totalInvoicedQuantity
      const isFullyInvoiced = remainingQuantity <= 0
      
      return {
        id: service.id,
        name: service.name,
        description: service.description,
        unitPrice: service.amount,
        originalQuantity: service.quantity,
        invoicedQuantity: totalInvoicedQuantity,
        remainingQuantity: Math.max(0, remainingQuantity),
        unit: service.unit,
        totalValue: service.amount * service.quantity,
        invoicedValue: invoicedItems.reduce((sum, item) => sum + item.totalPrice, 0),
        remainingValue: service.amount * Math.max(0, remainingQuantity),
        isFullyInvoiced,
        invoicedItems: invoicedItems.map(item => ({
          id: item.id,
          quantity: item.quantity,
          totalPrice: item.totalPrice,
          invoiceNumber: item.invoice.invoiceNumber,
          invoiceId: item.invoice.id,
          invoiceDate: item.invoice.createdAt
        }))
      }
    }) || []

    return NextResponse.json({
      proforma: {
        id: proforma.id,
        invoiceNumber: proforma.invoiceNumber,
        amount: proforma.amount,
        status: proforma.status,
        createdAt: proforma.createdAt
      },
      project: proforma.project ? {
        id: proforma.project.id,
        name: proforma.project.name,
        client: proforma.project.client
      } : null,
      conversionStats: {
        totalAmount: proforma.amount,
        invoicedAmount: totalInvoicedAmount,
        remainingAmount,
        conversionPercentage: (totalInvoicedAmount / proforma.amount) * 100,
        isFullyConverted,
        numberOfConversions: proforma.conversions.length
      },
      services: serviceStatus,
      conversions: proforma.conversions.map(invoice => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount,
        status: invoice.status,
        createdAt: invoice.createdAt,
        items: invoice.items.map(item => ({
          id: item.id,
          name: item.name,
          description: item.description,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          unit: item.unit,
          totalPrice: item.totalPrice,
          projectService: item.projectService ? {
            id: item.projectService.id,
            name: item.projectService.name
          } : null
        }))
      })),
      availableForConversion: serviceStatus.filter(service => service.remainingQuantity > 0)
    })

  } catch (error) {
    console.error("Erreur lors de la récupération du statut de conversion:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 