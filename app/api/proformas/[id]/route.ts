import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const proformaUpdateSchema = z.object({
  amount: z.number().min(0, "Le montant doit être positif"),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  clientName: z.string().optional(),
  clientEmail: z.string().email("Email invalide").optional(),
  clientAddress: z.string().optional(),
  clientPhone: z.string().optional(),
})

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

    const proforma = await prisma.invoice.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
        type: "PROFORMA"
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            client: {
              select: {
                name: true,
                email: true,
                address: true,
                phone: true
              }
            }
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

    return NextResponse.json(proforma)
  } catch (error) {
    console.error("Erreur lors de la récupération du proforma:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

export async function PUT(
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
    const validatedData = proformaUpdateSchema.parse(body)

    // Vérifier que le proforma existe et appartient à l'utilisateur
    const existingProforma = await prisma.invoice.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
        type: "PROFORMA"
      }
    })

    if (!existingProforma) {
      return NextResponse.json(
        { message: "Proforma non trouvé" },
        { status: 404 }
      )
    }

    const updatedProforma = await prisma.invoice.update({
      where: { id: params.id },
      data: {
        amount: validatedData.amount,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
        notes: validatedData.notes,
        clientName: validatedData.clientName,
        clientEmail: validatedData.clientEmail,
        clientAddress: validatedData.clientAddress,
        clientPhone: validatedData.clientPhone,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json(updatedProforma)
  } catch (error) {
    console.error("Erreur lors de la mise à jour du proforma:", error)
    return NextResponse.json(
      { message: "Erreur lors de la mise à jour du proforma" },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Vérifier que le proforma existe et appartient à l'utilisateur
    const existingProforma = await prisma.invoice.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
        type: "PROFORMA"
      }
    })

    if (!existingProforma) {
      return NextResponse.json(
        { message: "Proforma non trouvé" },
        { status: 404 }
      )
    }

    await prisma.invoice.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: "Proforma supprimé avec succès" })
  } catch (error) {
    console.error("Erreur lors de la suppression du proforma:", error)
    return NextResponse.json(
      { message: "Erreur lors de la suppression du proforma" },
      { status: 500 }
    )
  }
} 