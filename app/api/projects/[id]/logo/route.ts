import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

export async function POST(
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
    const formData = await request.formData()
    const file = formData.get('logo') as File

    if (!file) {
      return NextResponse.json(
        { message: "Aucun fichier fourni" },
        { status: 400 }
      )
    }

    // Vérifier que le projet appartient à l'utilisateur
    const project = await prisma.project.findFirst({
      where: {
        id: id,
        userId: session.user.id
      }
    })

    if (!project) {
      return NextResponse.json(
        { message: "Projet non trouvé" },
        { status: 404 }
      )
    }

    // Vérifier la taille du fichier (max 200MB)
    if (file.size > 200 * 1024 * 1024) {
      return NextResponse.json(
        { message: "Le fichier ne doit pas dépasser 200MB" },
        { status: 400 }
      )
    }

    // Tous les types de fichiers sont autorisés

    // Créer le dossier uploads s'il n'existe pas
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'projects')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Générer un nom de fichier unique
    const timestamp = Date.now()
    const extension = file.name.split('.').pop()
    const filename = `project-${id}-${timestamp}.${extension}`
    const filepath = join(uploadsDir, filename)

    // Sauvegarder le fichier
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    // URL publique du fichier
    const logoUrl = `/uploads/projects/${filename}`

    // Mettre à jour le projet avec le nouveau logo
    const updatedProject = await prisma.project.update({
      where: { id: id },
      data: { logo: logoUrl }
    })

    return NextResponse.json({
      message: "Logo uploadé avec succès",
      logoUrl: logoUrl,
      project: updatedProject
    })

  } catch (error) {
    console.error("Erreur lors de l'upload du logo:", error)
    return NextResponse.json(
      { message: "Erreur lors de l'upload du logo" },
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

    // Vérifier que le projet appartient à l'utilisateur
    const project = await prisma.project.findFirst({
      where: {
        id: id,
        userId: session.user.id
      }
    })

    if (!project) {
      return NextResponse.json(
        { message: "Projet non trouvé" },
        { status: 404 }
      )
    }

    // Supprimer le logo du projet
    const updatedProject = await prisma.project.update({
      where: { id: id },
      data: { logo: null }
    })

    return NextResponse.json({
      message: "Logo supprimé avec succès",
      project: updatedProject
    })

  } catch (error) {
    console.error("Erreur lors de la suppression du logo:", error)
    return NextResponse.json(
      { message: "Erreur lors de la suppression du logo" },
      { status: 500 }
    )
  }
} 