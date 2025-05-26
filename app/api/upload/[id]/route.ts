import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { unlink } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Non autorisé" },
        { status: 401 }
      )
    }

    // Récupérer le fichier pour obtenir le chemin
    const file = await prisma.file.findFirst({
      where: {
        id: params.id,
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
      const filePath = join(process.cwd(), 'public', file.path)
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
        id: params.id
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