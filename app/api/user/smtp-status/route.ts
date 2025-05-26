import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Non autorisé" },
        { status: 401 }
      )
    }

    // Récupérer les informations SMTP de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        smtpPassword: true,
        smtpFrom: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { message: "Utilisateur non trouvé" },
        { status: 404 }
      )
    }

    // Vérifier si la configuration SMTP est complète
    const isConfigured = !!(
      user.smtpHost && 
      user.smtpUser && 
      user.smtpPassword
    )

    const missingFields = []
    if (!user.smtpHost) missingFields.push('smtpHost')
    if (!user.smtpUser) missingFields.push('smtpUser')
    if (!user.smtpPassword) missingFields.push('smtpPassword')

    return NextResponse.json({
      isConfigured,
      missingFields,
      hasSmtpHost: !!user.smtpHost,
      hasSmtpUser: !!user.smtpUser,
      hasSmtpPassword: !!user.smtpPassword,
      hasSmtpFrom: !!user.smtpFrom,
      smtpPort: user.smtpPort || 587
    })

  } catch (error) {
    console.error("Erreur lors de la vérification du statut SMTP:", error)
    return NextResponse.json(
      { message: "Erreur lors de la vérification du statut SMTP" },
      { status: 500 }
    )
  }
} 