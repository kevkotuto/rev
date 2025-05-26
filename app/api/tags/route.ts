import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const tagSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(50, "Le nom ne peut pas dépasser 50 caractères"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Couleur hexadécimale invalide").default("#3B82F6"),
  description: z.string().optional()
})

const tagUpdateSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(50, "Le nom ne peut pas dépasser 50 caractères").optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Couleur hexadécimale invalide").optional(),
  description: z.string().optional()
})

// GET - Récupérer les tags de l'utilisateur
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
    const search = searchParams.get('search')
    const withUsage = searchParams.get('withUsage') === 'true'

    const where: any = {
      userId: session.user.id
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    const tags = await prisma.tag.findMany({
      where,
      include: withUsage ? {
        _count: {
          select: {
            projects: true,
            clients: true,
            tasks: true,
            files: true
          }
        }
      } : undefined,
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(tags)
  } catch (error) {
    console.error("Erreur récupération tags:", error)
    return NextResponse.json(
      { message: "Erreur lors de la récupération des tags" },
      { status: 500 }
    )
  }
}

// POST - Créer un nouveau tag
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
    const validatedData = tagSchema.parse(body)

    // Vérifier l'unicité du nom pour cet utilisateur
    const existingTag = await prisma.tag.findFirst({
      where: {
        name: validatedData.name,
        userId: session.user.id
      }
    })

    if (existingTag) {
      return NextResponse.json(
        { message: "Un tag avec ce nom existe déjà" },
        { status: 409 }
      )
    }

    const tag = await prisma.tag.create({
      data: {
        name: validatedData.name,
        color: validatedData.color,
        description: validatedData.description,
        userId: session.user.id
      },
      include: {
        _count: {
          select: {
            projects: true,
            clients: true,
            tasks: true,
            files: true
          }
        }
      }
    })

    return NextResponse.json(tag, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Données invalides", errors: error.errors },
        { status: 400 }
      )
    }

    console.error("Erreur création tag:", error)
    return NextResponse.json(
      { message: "Erreur lors de la création du tag" },
      { status: 500 }
    )
  }
}

// PUT - Mettre à jour un tag
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Non autorisé" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const tagId = searchParams.get('id')

    if (!tagId) {
      return NextResponse.json(
        { message: "ID du tag requis" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = tagUpdateSchema.parse(body)

    // Vérifier que le tag existe et appartient à l'utilisateur
    const existingTag = await prisma.tag.findFirst({
      where: {
        id: tagId,
        userId: session.user.id
      }
    })

    if (!existingTag) {
      return NextResponse.json(
        { message: "Tag non trouvé" },
        { status: 404 }
      )
    }

    // Vérifier l'unicité du nom si on le change
    if (validatedData.name && validatedData.name !== existingTag.name) {
      const nameExists = await prisma.tag.findFirst({
        where: {
          name: validatedData.name,
          userId: session.user.id,
          id: { not: tagId }
        }
      })

      if (nameExists) {
        return NextResponse.json(
          { message: "Un tag avec ce nom existe déjà" },
          { status: 409 }
        )
      }
    }

    const updatedTag = await prisma.tag.update({
      where: { id: tagId },
      data: validatedData,
      include: {
        _count: {
          select: {
            projects: true,
            clients: true,
            tasks: true,
            files: true
          }
        }
      }
    })

    return NextResponse.json(updatedTag)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Données invalides", errors: error.errors },
        { status: 400 }
      )
    }

    console.error("Erreur mise à jour tag:", error)
    return NextResponse.json(
      { message: "Erreur lors de la mise à jour du tag" },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer un tag
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Non autorisé" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const tagId = searchParams.get('id')

    if (!tagId) {
      return NextResponse.json(
        { message: "ID du tag requis" },
        { status: 400 }
      )
    }

    // Vérifier que le tag existe et appartient à l'utilisateur
    const existingTag = await prisma.tag.findFirst({
      where: {
        id: tagId,
        userId: session.user.id
      },
      include: {
        _count: {
          select: {
            projects: true,
            clients: true,
            tasks: true,
            files: true
          }
        }
      }
    })

    if (!existingTag) {
      return NextResponse.json(
        { message: "Tag non trouvé" },
        { status: 404 }
      )
    }

    const totalUsage = existingTag._count.projects + existingTag._count.clients + 
                      existingTag._count.tasks + existingTag._count.files

    if (totalUsage > 0) {
      return NextResponse.json(
        { 
          message: `Impossible de supprimer le tag "${existingTag.name}" car il est utilisé dans ${totalUsage} éléments`,
          usage: existingTag._count
        },
        { status: 400 }
      )
    }

    await prisma.tag.delete({
      where: { id: tagId }
    })

    return NextResponse.json({ message: "Tag supprimé avec succès" })
  } catch (error) {
    console.error("Erreur suppression tag:", error)
    return NextResponse.json(
      { message: "Erreur lors de la suppression du tag" },
      { status: 500 }
    )
  }
} 