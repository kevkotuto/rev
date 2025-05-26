import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Non autorisé" },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string || 'document' // photo, logo, document
    
    if (!file) {
      return NextResponse.json(
        { message: "Aucun fichier fourni" },
        { status: 400 }
      )
    }

    // Vérifier la taille du fichier (max 200MB)
    if (file.size > 200 * 1024 * 1024) {
      return NextResponse.json(
        { message: "Le fichier est trop volumineux (max 200MB)" },
        { status: 400 }
      )
    }

    // Tous les types de fichiers sont autorisés
    // Pas de restriction sur le type MIME

    // Créer le nom de fichier unique
    const timestamp = Date.now()
    const extension = file.name.split('.').pop()
    const filename = `${timestamp}-${Math.random().toString(36).substring(2)}.${extension}`
    
    // Créer le dossier de destination
    const uploadDir = join(process.cwd(), 'public', 'uploads', type)
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Sauvegarder le fichier
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const filepath = join(uploadDir, filename)
    await writeFile(filepath, buffer)

    // Retourner l'URL du fichier
    const fileUrl = `/uploads/${type}/${filename}`
    
    // Si c'est un document, l'enregistrer en base de données
    if (type === 'document') {
      const projectId = formData.get('projectId') as string
      const clientId = formData.get('clientId') as string
      const providerId = formData.get('providerId') as string
      const description = formData.get('description') as string
      
      // Déterminer la catégorie du fichier
      let category = 'DOCUMENT'
      if (file.type.startsWith('image/')) category = 'IMAGE'
      else if (file.type.startsWith('video/')) category = 'VIDEO'
      else if (file.type.startsWith('audio/')) category = 'AUDIO'
      
      try {
        const fileRecord = await prisma.file.create({
          data: {
            filename: filename,
            originalName: file.name,
            url: fileUrl,
            path: fileUrl,
            size: file.size,
            mimeType: file.type,
            category: category as any,
            description: description || null,
            projectId: projectId && projectId !== "none" ? projectId : null,
            clientId: clientId && clientId !== "none" ? clientId : null,
            providerId: providerId && providerId !== "none" ? providerId : null,
            userId: session.user.id
          }
        })
        
        console.log("Fichier enregistré en base:", fileRecord)
      } catch (dbError) {
        console.error("Erreur lors de l'enregistrement en base:", dbError)
        // Continue même si l'enregistrement en base échoue
      }
    }
    
    return NextResponse.json({
      url: fileUrl,
      filename: filename,
      originalName: file.name,
      size: file.size,
      mimeType: file.type
    })

  } catch (error) {
    console.error("Erreur lors de l'upload:", error)
    return NextResponse.json(
      { message: "Erreur lors de l'upload du fichier" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Non autorisé" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    const where: any = {
      userId: session.user.id
    }

    if (projectId) {
      where.projectId = projectId
    }

    const files = await prisma.file.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(files)
  } catch (error) {
    console.error("Erreur lors de la récupération des fichiers:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 