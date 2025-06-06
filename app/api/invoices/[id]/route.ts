import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { invoiceSchema } from "@/lib/validations"

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

    return NextResponse.json(invoice)
  } catch (error) {
    console.error("Erreur lors de la récupération de la facture:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

export async function PUT(
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
    const body = await request.json()

    // Supprimer les champs qui ne sont pas dans le modèle Prisma
    const { generatePaymentLink, ...updateData } = body

    // Convertir les dates si elles existent
    if (updateData.dueDate) {
      updateData.dueDate = new Date(updateData.dueDate)
    }
    if (updateData.paidDate) {
      updateData.paidDate = new Date(updateData.paidDate)
    }

    // Supprimer les champs qui ne sont pas dans le modèle Prisma
    const { generatePaymentLink: _, ...finalData } = updateData

    const invoice = await prisma.invoice.updateMany({
      where: {
        id,
        userId: session.user.id
      },
      data: finalData
    })

    if (invoice.count === 0) {
      return NextResponse.json(
        { message: "Facture non trouvée" },
        { status: 404 }
      )
    }

    const updatedInvoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            client: true
          }
        }
      }
    })

    return NextResponse.json(updatedInvoice)
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la facture:", error)
    return NextResponse.json(
      { message: "Erreur lors de la mise à jour de la facture" },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    const invoice = await prisma.invoice.deleteMany({
      where: {
        id,
        userId: session.user.id
      }
    })

    if (invoice.count === 0) {
      return NextResponse.json(
        { message: "Facture non trouvée" },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: "Facture supprimée avec succès" })
  } catch (error) {
    console.error("Erreur lors de la suppression de la facture:", error)
    return NextResponse.json(
      { message: "Erreur lors de la suppression de la facture" },
      { status: 500 }
    )
  }
} 