import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const proformaManagementSchema = z.object({
  action: z.enum(["update_amount", "create_new", "sync_with_project"]),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  clientName: z.string().optional(),
  clientEmail: z.string().email().optional().or(z.literal("")),
  clientAddress: z.string().optional(),
  clientPhone: z.string().optional(),
})

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
    const validatedData = proformaManagementSchema.parse(body)

    // Récupérer le projet
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      },
      include: {
        client: true,
        services: true,
        invoices: {
          where: { type: "PROFORMA" },
          orderBy: { createdAt: "desc" }
        }
      }
    })

    if (!project) {
      return NextResponse.json(
        { message: "Projet non trouvé" },
        { status: 404 }
      )
    }

    const existingProforma = project.invoices[0] // La plus récente

    // Calculer le montant total (somme des services uniquement)
    const servicesAmount = project.services.reduce((sum, service) => {
      const quantity = (service as any).quantity || 1
      return sum + (service.amount * quantity)
    }, 0)
    const totalAmount = servicesAmount > 0 ? servicesAmount : project.amount

    switch (validatedData.action) {
      case "update_amount":
        if (!existingProforma) {
          return NextResponse.json(
            { message: "Aucune proforma à mettre à jour" },
            { status: 404 }
          )
        }

        // Mettre à jour le montant de la proforma existante
        const updatedProforma = await prisma.invoice.update({
          where: { id: existingProforma.id },
          data: {
            amount: totalAmount,
            dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : existingProforma.dueDate,
          }
        })

        return NextResponse.json({
          message: "Proforma mise à jour avec le nouveau montant du projet",
          proforma: updatedProforma
        })

      case "create_new":
        // Générer un nouveau numéro de proforma
        const proformaCount = await prisma.invoice.count({
          where: {
            userId: session.user.id,
            type: "PROFORMA"
          }
        })

        const newProformaNumber = `PRO-${String(proformaCount + 1).padStart(4, '0')}`

        // Créer une nouvelle proforma
        const newProforma = await prisma.invoice.create({
          data: {
            invoiceNumber: newProformaNumber,
            type: "PROFORMA",
            amount: totalAmount,
            status: "PENDING",
            dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
            projectId: project.id,
            userId: session.user.id
          }
        })

        return NextResponse.json({
          message: "Nouvelle proforma créée avec succès",
          proforma: newProforma
        })

      case "sync_with_project":
        if (!existingProforma) {
          return NextResponse.json(
            { message: "Aucune proforma à synchroniser" },
            { status: 404 }
          )
        }

        // Synchroniser avec les données du projet et du client
        const syncedProforma = await prisma.invoice.update({
          where: { id: existingProforma.id },
          data: {
            amount: totalAmount,
          }
        })

        return NextResponse.json({
          message: "Proforma synchronisée avec les données du projet",
          proforma: syncedProforma
        })

      default:
        return NextResponse.json(
          { message: "Action non reconnue" },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error("Erreur lors de la gestion de la proforma:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

// GET - Obtenir le statut des proformas du projet
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

    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      },
      include: {
        client: true,
        services: true,
        invoices: {
          where: { type: "PROFORMA" },
          orderBy: { createdAt: "desc" }
        }
      }
    })

    if (!project) {
      return NextResponse.json(
        { message: "Projet non trouvé" },
        { status: 404 }
      )
    }

    const latestProforma = project.invoices[0]

    // Calculer le montant total (somme des services uniquement)
    const servicesAmount = project.services.reduce((sum, service) => {
      const quantity = (service as any).quantity || 1
      return sum + (service.amount * quantity)
    }, 0)
    const totalAmount = servicesAmount > 0 ? servicesAmount : project.amount

    return NextResponse.json({
      projectAmount: totalAmount,
      proformas: project.invoices,
      latestProforma,
      needsUpdate: latestProforma && latestProforma.amount !== totalAmount,
      canCreateNew: true,
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        client: project.client
      },
      recommendations: {
        updateExisting: (latestProforma && latestProforma.amount !== totalAmount) ? "Le montant du projet ou des services a changé, vous devriez mettre à jour la proforma existante" : null,
        createNew: project.invoices.length > 0 ? "Vous pouvez créer une nouvelle version de la proforma" : "Créez votre première proforma pour ce projet"
      }
    })

  } catch (error) {
    console.error("Erreur lors de la récupération du statut:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 