import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const notificationSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  message: z.string().min(1, "Le message est requis"),
  type: z.enum(["TASK_DUE", "INVOICE_OVERDUE", "PROJECT_DEADLINE", "PAYMENT_RECEIVED", "CLIENT_MESSAGE", "SYSTEM_UPDATE"]),
  actionUrl: z.string().optional(),
  metadata: z.record(z.any()).optional()
})

// GET - Récupérer les notifications de l'utilisateur
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
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {
      userId: session.user.id
    }

    if (unreadOnly) {
      where.isRead = false
    }

    if (type) {
      where.type = type
    }

    const [notifications, totalCount, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: {
          userId: session.user.id,
          isRead: false
        }
      })
    ])

    return NextResponse.json({
      notifications,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: totalCount > offset + limit
      },
      unreadCount
    })
  } catch (error) {
    console.error("Erreur récupération notifications:", error)
    return NextResponse.json(
      { message: "Erreur lors de la récupération des notifications" },
      { status: 500 }
    )
  }
}

// POST - Créer une nouvelle notification
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
    const validatedData = notificationSchema.parse(body)

    const notification = await prisma.notification.create({
      data: {
        title: validatedData.title,
        message: validatedData.message,
        type: validatedData.type,
        actionUrl: validatedData.actionUrl,
        metadata: validatedData.metadata,
        userId: session.user.id
      }
    })

    return NextResponse.json(notification, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Données invalides", errors: error.errors },
        { status: 400 }
      )
    }

    console.error("Erreur création notification:", error)
    return NextResponse.json(
      { message: "Erreur lors de la création de la notification" },
      { status: 500 }
    )
  }
}

// PUT - Marquer des notifications comme lues
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
    const action = searchParams.get('action')

    if (action === 'markAllRead') {
      // Marquer toutes les notifications comme lues
      const result = await prisma.notification.updateMany({
        where: {
          userId: session.user.id,
          isRead: false
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      })

      return NextResponse.json({
        message: `${result.count} notification(s) marquée(s) comme lue(s)`,
        count: result.count
      })
    }

    const body = await request.json()
    const { notificationIds } = body

    if (!Array.isArray(notificationIds)) {
      return NextResponse.json(
        { message: "notificationIds doit être un tableau" },
        { status: 400 }
      )
    }

    // Marquer les notifications spécifiées comme lues
    const result = await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId: session.user.id
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    })

    return NextResponse.json({
      message: `${result.count} notification(s) marquée(s) comme lue(s)`,
      count: result.count
    })
  } catch (error) {
    console.error("Erreur mise à jour notifications:", error)
    return NextResponse.json(
      { message: "Erreur lors de la mise à jour des notifications" },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer des notifications
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
    const action = searchParams.get('action')
    const notificationId = searchParams.get('id')

    if (action === 'deleteRead') {
      // Supprimer toutes les notifications lues
      const result = await prisma.notification.deleteMany({
        where: {
          userId: session.user.id,
          isRead: true
        }
      })

      return NextResponse.json({
        message: `${result.count} notification(s) supprimée(s)`,
        count: result.count
      })
    }

    if (notificationId) {
      // Supprimer une notification spécifique
      const notification = await prisma.notification.findFirst({
        where: {
          id: notificationId,
          userId: session.user.id
        }
      })

      if (!notification) {
        return NextResponse.json(
          { message: "Notification non trouvée" },
          { status: 404 }
        )
      }

      await prisma.notification.delete({
        where: { id: notificationId }
      })

      return NextResponse.json({ message: "Notification supprimée" })
    }

    const body = await request.json()
    const { notificationIds } = body

    if (!Array.isArray(notificationIds)) {
      return NextResponse.json(
        { message: "notificationIds doit être un tableau" },
        { status: 400 }
      )
    }

    // Supprimer les notifications spécifiées
    const result = await prisma.notification.deleteMany({
      where: {
        id: { in: notificationIds },
        userId: session.user.id
      }
    })

    return NextResponse.json({
      message: `${result.count} notification(s) supprimée(s)`,
      count: result.count
    })
  } catch (error) {
    console.error("Erreur suppression notifications:", error)
    return NextResponse.json(
      { message: "Erreur lors de la suppression des notifications" },
      { status: 500 }
    )
  }
} 