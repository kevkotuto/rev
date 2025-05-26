import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const editProformaSchema = z.object({
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  clientName: z.string().optional(),
  clientEmail: z.string().email().optional().or(z.literal("")),
  clientAddress: z.string().optional(),
  clientPhone: z.string().optional(),
  footerText: z.string().optional()
})

// PUT - Modifier une proforma
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
    const validatedData = editProformaSchema.parse(body)

    // Vérifier que la proforma existe et appartient à l'utilisateur
    const proforma = await prisma.invoice.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
        type: "PROFORMA"
      }
    })

    if (!proforma) {
      return NextResponse.json(
        { message: "Proforma non trouvé" },
        { status: 404 }
      )
    }

    // Mettre à jour la proforma
    const updatedProforma = await prisma.invoice.update({
      where: { id: params.id },
      data: {
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : proforma.dueDate,
        ...(validatedData.notes !== undefined && { notes: validatedData.notes }),
        ...(validatedData.clientName !== undefined && { clientName: validatedData.clientName }),
        ...(validatedData.clientEmail !== undefined && validatedData.clientEmail !== "" && { clientEmail: validatedData.clientEmail }),
        ...(validatedData.clientAddress !== undefined && { clientAddress: validatedData.clientAddress }),
        ...(validatedData.clientPhone !== undefined && { clientPhone: validatedData.clientPhone }),
      }
    })

    return NextResponse.json({
      message: "Proforma modifiée avec succès",
      proforma: updatedProforma
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Données invalides", errors: error.errors },
        { status: 400 }
      )
    }

    console.error("Erreur lors de la modification de la proforma:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 