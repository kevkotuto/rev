import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const markPaidSchema = z.object({
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "WAVE", "CHECK", "OTHER"]).optional(),
  paidDate: z.string().optional(),
  notes: z.string().optional()
})

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
    const validatedData = markPaidSchema.parse(body)

    // Vérifier que la facture appartient à l'utilisateur
    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    })

    if (!invoice) {
      return NextResponse.json(
        { message: "Facture non trouvée" },
        { status: 404 }
      )
    }

    if (invoice.status === "PAID") {
      return NextResponse.json(
        { message: "Cette facture est déjà marquée comme payée" },
        { status: 400 }
      )
    }

    // Marquer la facture comme payée
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        status: "PAID",
        paidDate: validatedData.paidDate ? new Date(validatedData.paidDate) : new Date(),
        notes: validatedData.notes ? 
          `${invoice.notes ? invoice.notes + '\n' : ''}Payé par ${validatedData.paymentMethod || 'méthode non spécifiée'} le ${new Date().toLocaleDateString('fr-FR')}` : 
          invoice.notes
      },
      include: {
        project: {
          include: {
            client: true
          }
        }
      }
    })

    return NextResponse.json({
      invoice: updatedInvoice,
      message: "Facture marquée comme payée avec succès"
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Données invalides", errors: error.errors },
        { status: 400 }
      )
    }

    console.error("Erreur lors du marquage de la facture comme payée:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 