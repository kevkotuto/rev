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

    const notifications = await prisma.notification.findMany({
      where: {
        userId: session.user.id,
        ...(unreadOnly && { isRead: false })
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50 // Limiter à 50 notifications
    })

    return NextResponse.json(notifications)
  } catch (error) {
    console.error("Erreur lors de la récupération des notifications:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
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
    const { title, message, type, relatedType, relatedId } = body

    const notification = await prisma.notification.create({
      data: {
        title,
        message,
        type: type || 'INFO',
        relatedType,
        relatedId,
        userId: session.user.id
      }
    })

    return NextResponse.json(notification, { status: 201 })
  } catch (error) {
    console.error("Erreur lors de la création de la notification:", error)
    return NextResponse.json(
      { message: "Erreur lors de la création de la notification" },
      { status: 500 }
    )
  }
}

// PATCH - Marquer une notification comme lue
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Non autorisé" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { notificationId, markAllAsRead } = body

    if (markAllAsRead) {
      // Marquer toutes les notifications comme lues
      await prisma.notification.updateMany({
        where: {
          userId: session.user.id,
          isRead: false
        },
        data: {
          isRead: true
        }
      })
      
      return NextResponse.json({ message: "Toutes les notifications marquées comme lues" })
    } else {
      // Marquer une notification spécifique comme lue
      const notification = await prisma.notification.update({
        where: {
          id: notificationId,
          userId: session.user.id
        },
        data: {
          isRead: true
        }
      })
      
      return NextResponse.json(notification)
    }
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la notification:", error)
    return NextResponse.json(
      { message: "Erreur lors de la mise à jour de la notification" },
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