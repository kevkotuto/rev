import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { clientSchema } from "@/lib/validations"

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

    const client = await prisma.client.findFirst({
      where: {
        id,
        userId: session.user.id
      },
      include: {
        projects: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            amount: true,
            startDate: true,
            endDate: true,
            logo: true,
            _count: {
              select: {
                invoices: true,
                tasks: true
              }
            }
          }
        }
      }
    })

    if (!client) {
      return NextResponse.json(
        { message: "Client non trouvé" },
        { status: 404 }
      )
    }

    // Récupérer les factures via les projets du client
    const invoices = await prisma.invoice.findMany({
      where: {
        project: {
          clientId: id,
          userId: session.user.id
        }
      },
      select: {
        id: true,
        invoiceNumber: true,
        amount: true,
        status: true,
        type: true,
        createdAt: true,
        dueDate: true,
        paidDate: true,
        project: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      ...client,
      invoices
    })
  } catch (error) {
    console.error("Erreur lors de la récupération du client:", error)
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

    const body = await request.json()
    const validatedData = clientSchema.parse(body)

    const { id } = await params

    const client = await prisma.client.updateMany({
      where: {
        id,
        userId: session.user.id
      },
      data: validatedData
    })

    if (client.count === 0) {
      return NextResponse.json(
        { message: "Client non trouvé" },
        { status: 404 }
      )
    }

    const updatedClient = await prisma.client.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            projects: true
          }
        }
      }
    })

    return NextResponse.json(updatedClient)
  } catch (error) {
    console.error("Erreur lors de la mise à jour du client:", error)
    return NextResponse.json(
      { message: "Erreur lors de la mise à jour du client" },
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

    // Vérifier si le client a des projets
    const clientWithProjects = await prisma.client.findFirst({
      where: {
        id,
        userId: session.user.id
      },
      include: {
        _count: {
          select: {
            projects: true
          }
        }
      }
    })

    if (!clientWithProjects) {
      return NextResponse.json(
        { message: "Client non trouvé" },
        { status: 404 }
      )
    }

    if (clientWithProjects._count.projects > 0) {
      return NextResponse.json(
        { message: "Impossible de supprimer un client avec des projets" },
        { status: 400 }
      )
    }

    await prisma.client.delete({
      where: { id }
    })

    return NextResponse.json({ message: "Client supprimé avec succès" })
  } catch (error) {
    console.error("Erreur lors de la suppression du client:", error)
    return NextResponse.json(
      { message: "Erreur lors de la suppression du client" },
      { status: 500 }
    )
  }
} 