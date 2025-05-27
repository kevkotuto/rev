import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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

    // Récupérer l'abonnement original
    const originalSubscription = await prisma.expense.findFirst({
      where: {
        id,
        userId: session.user.id,
        isSubscription: true
      }
    })

    if (!originalSubscription) {
      return NextResponse.json(
        { message: "Abonnement non trouvé" },
        { status: 404 }
      )
    }

    if (!originalSubscription.subscriptionPeriod || !originalSubscription.nextRenewalDate) {
      return NextResponse.json(
        { message: "Configuration d'abonnement incomplète" },
        { status: 400 }
      )
    }

    // Calculer la prochaine date de renouvellement
    const nextRenewalDate = new Date(originalSubscription.nextRenewalDate)
    if (originalSubscription.subscriptionPeriod === 'MONTHLY') {
      nextRenewalDate.setMonth(nextRenewalDate.getMonth() + 1)
    } else if (originalSubscription.subscriptionPeriod === 'YEARLY') {
      nextRenewalDate.setFullYear(nextRenewalDate.getFullYear() + 1)
    }

    // Créer une nouvelle dépense pour ce renouvellement
    const newExpense = await prisma.expense.create({
      data: {
        description: `${originalSubscription.description} (Renouvellement ${new Date().toLocaleDateString('fr-FR')})`,
        amount: originalSubscription.amount,
        category: originalSubscription.category,
        date: new Date(),
        notes: `Renouvellement automatique de l'abonnement ${originalSubscription.description}`,
        type: originalSubscription.type,
        isSubscription: true,
        subscriptionPeriod: originalSubscription.subscriptionPeriod,
        nextRenewalDate: nextRenewalDate,
        reminderDays: originalSubscription.reminderDays,
        isActive: true,
        projectId: originalSubscription.projectId,
        userId: session.user.id
      }
    })

    // Marquer l'ancien abonnement comme inactif
    await prisma.expense.update({
      where: { id: originalSubscription.id },
      data: { 
        isActive: false,
        notes: originalSubscription.notes 
          ? `${originalSubscription.notes}\nRenouvelé le ${new Date().toLocaleDateString('fr-FR')}`
          : `Renouvelé le ${new Date().toLocaleDateString('fr-FR')}`
      }
    })

    // Créer une notification de confirmation
    await prisma.notification.create({
      data: {
        title: "✅ Abonnement renouvelé",
        message: `L'abonnement "${originalSubscription.description}" a été renouvelé. Prochaine échéance: ${nextRenewalDate.toLocaleDateString('fr-FR')}`,
        type: "SUCCESS",
        relatedType: "expense",
        relatedId: newExpense.id,
        userId: session.user.id
      }
    })

    return NextResponse.json({
      originalSubscription,
      newSubscription: newExpense,
      nextRenewalDate: nextRenewalDate.toISOString(),
      message: "Abonnement renouvelé avec succès"
    })

  } catch (error) {
    console.error("Erreur lors du renouvellement de l'abonnement:", error)
    return NextResponse.json(
      { message: "Erreur lors du renouvellement de l'abonnement" },
      { status: 500 }
    )
  }
} 