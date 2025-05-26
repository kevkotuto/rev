import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { userProfileSchema } from "@/lib/validations"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Non autorisé" },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json(
        { message: "Utilisateur non trouvé" },
        { status: 404 }
      )
    }

    // Retourner les données sans les mots de passe
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      companyName: user.companyName,
      companyLogo: user.companyLogo,
      address: user.address,
      phone: user.phone,
      currency: user.currency,
      smtpHost: user.smtpHost,
      smtpPort: user.smtpPort,
      smtpUser: user.smtpUser,
      smtpFrom: user.smtpFrom,
      hasWaveApiKey: !!user.waveApiKey,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }

    return NextResponse.json(safeUser)
  } catch (error) {
    console.error("Erreur lors de la récupération du profil:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Non autorisé" },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Séparer les données de profil des données sensibles
    const {
      smtpPassword,
      waveApiKey,
      waveWebhookUrl,
      ...profileData
    } = body

    // Valider les données de profil de base
    const validatedProfileData = userProfileSchema.parse(profileData)

    // Préparer les données à mettre à jour
    const updateData: any = {
      ...validatedProfileData
    }

    // Ajouter les données sensibles si fournies
    if (smtpPassword !== undefined) {
      updateData.smtpPassword = smtpPassword
    }
    if (waveApiKey !== undefined) {
      updateData.waveApiKey = waveApiKey
    }
    if (waveWebhookUrl !== undefined) {
      updateData.waveWebhookUrl = waveWebhookUrl
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        companyName: true,
        companyLogo: true,
        address: true,
        phone: true,
        currency: true,
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        smtpFrom: true,
        updatedAt: true
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error("Erreur lors de la mise à jour du profil:", error)
    return NextResponse.json(
      { message: "Erreur lors de la mise à jour du profil" },
      { status: 500 }
    )
  }
} 