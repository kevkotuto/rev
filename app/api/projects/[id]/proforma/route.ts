import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const proformaSchema = z.object({
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  clientName: z.string().optional(),
  clientEmail: z.string().optional(),
  clientAddress: z.string().optional(),
  clientPhone: z.string().optional()
})

// POST - Générer une proforma pour un projet
export async function POST(
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

    const body = await request.json()
    const validatedData = proformaSchema.parse(body)

    // Récupérer le projet avec ses détails
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      },
      include: {
        client: true,
        services: true
      }
    })

    if (!project) {
      return NextResponse.json(
        { message: "Projet non trouvé" },
        { status: 404 }
      )
    }

    // Vérifier s'il existe déjà une proforma pour ce projet
    const existingProforma = await prisma.invoice.findFirst({
      where: {
        projectId: params.id,
        type: "PROFORMA"
      }
    })

    if (existingProforma) {
      return NextResponse.json(
        { message: "Une proforma existe déjà pour ce projet" },
        { status: 400 }
      )
    }

    // Générer le numéro de proforma
    const currentYear = new Date().getFullYear()
    const lastProforma = await prisma.invoice.findFirst({
      where: {
        userId: session.user.id,
        type: "PROFORMA",
        invoiceNumber: {
          startsWith: `PRO-${currentYear}`
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    let proformaNumber = `PRO-${currentYear}-001`
    if (lastProforma) {
      const lastNumber = parseInt(lastProforma.invoiceNumber.split('-')[2])
      const nextNumber = (lastNumber + 1).toString().padStart(3, '0')
      proformaNumber = `PRO-${currentYear}-${nextNumber}`
    }

    // Calculer le montant total (somme des services uniquement)
    const servicesAmount = project.services.reduce((sum, service) => {
      const quantity = (service as any).quantity || 1
      return sum + (service.amount * quantity)
    }, 0)
    const totalAmount = servicesAmount > 0 ? servicesAmount : project.amount

    // Créer la proforma
    const proforma = await prisma.invoice.create({
      data: {
        invoiceNumber: proformaNumber,
        type: "PROFORMA",
        amount: totalAmount,
        status: "PENDING",
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
        notes: validatedData.notes,
        clientName: validatedData.clientName || project.client?.name,
        clientEmail: validatedData.clientEmail || project.client?.email,
        clientAddress: validatedData.clientAddress || project.client?.address,
        clientPhone: validatedData.clientPhone || project.client?.phone,
        projectId: params.id,
        userId: session.user.id
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

    return NextResponse.json(proforma, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Données invalides", errors: error.errors },
        { status: 400 }
      )
    }

    console.error("Erreur lors de la création de la proforma:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 