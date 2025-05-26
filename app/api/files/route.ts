import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const fileSchema = z.object({
  filename: z.string().min(1, "Le nom du fichier est requis"),
  originalName: z.string().min(1, "Le nom original est requis"),
  url: z.string().min(1, "L'URL du fichier est requise"),
  path: z.string().min(1, "Le chemin est requis"),
  size: z.number().min(0, "La taille doit être positive"),
  mimeType: z.string().min(1, "Le type MIME est requis"),
  category: z.enum(["DOCUMENT", "IMAGE", "VIDEO", "AUDIO", "ARCHIVE", "CONTRACT", "INVOICE", "RECEIPT", "OTHER"]).default("DOCUMENT"),
  description: z.string().optional(),
  projectId: z.string().nullable().optional(),
  clientId: z.string().nullable().optional(),
  providerId: z.string().nullable().optional(),
})

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
    const clientId = searchParams.get('clientId')
    const providerId = searchParams.get('providerId')

    const where: any = {
      userId: session.user.id
    }

    if (projectId && projectId !== "all") {
      where.projectId = projectId
    }
    if (clientId && clientId !== "all") {
      where.clientId = clientId
    }
    if (providerId && providerId !== "all") {
      where.providerId = providerId
    }

    const files = await prisma.file.findMany({
      where,
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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Non autorisé" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = fileSchema.parse(body)

    const file = await prisma.file.create({
      data: {
        ...validatedData,
        userId: session.user.id,
        projectId: validatedData.projectId === "none" ? null : validatedData.projectId,
        clientId: validatedData.clientId === "none" ? null : validatedData.clientId,
        providerId: validatedData.providerId === "none" ? null : validatedData.providerId,
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
    console.error("Erreur lors de la création du fichier:", error)
    return NextResponse.json(
      { message: "Erreur lors de la création du fichier" },
      { status: 500 }
    )
  }
} 