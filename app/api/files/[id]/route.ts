import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { unlink } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

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

    // Récupérer le fichier pour obtenir l'URL
    const file = await prisma.file.findFirst({
      where: {
        id: id,
        userId: session.user.id
      }
    })

    if (!file) {
      return NextResponse.json(
        { message: "Fichier non trouvé" },
        { status: 404 }
      )
    }

    // Supprimer le fichier physique
    try {
      const filePath = join(process.cwd(), 'public', file.url)
      if (existsSync(filePath)) {
        await unlink(filePath)
      }
    } catch (error) {
      console.error("Erreur lors de la suppression du fichier physique:", error)
      // Continue même si la suppression physique échoue
    }

    // Supprimer l'enregistrement en base
    await prisma.file.delete({
      where: {
        id: id
      }
    })

    return NextResponse.json({ message: "Fichier supprimé avec succès" })
  } catch (error) {
    console.error("Erreur lors de la suppression du fichier:", error)
    return NextResponse.json(
      { message: "Erreur lors de la suppression du fichier" },
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
    const { description, projectId, clientId, providerId } = body

    const file = await prisma.file.update({
      where: {
        id: id,
        userId: session.user.id
      },
      data: {
        description,
        projectId: projectId === "none" ? null : projectId,
        clientId: clientId === "none" ? null : clientId,
        providerId: providerId === "none" ? null : providerId,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        },
        client: {
          select: {
            id: true,
            name: true
          }
        },
        provider: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json(file)
  } catch (error) {
    console.error("Erreur lors de la mise à jour du fichier:", error)
    return NextResponse.json(
      { message: "Erreur lors de la mise à jour du fichier" },
      { status: 500 }
    )
  }
} 