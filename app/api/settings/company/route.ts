import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const companySettingsSchema = z.object({
  name: z.string().min(1, "Le nom de l'entreprise est requis").or(z.literal("")),
  description: z.string().optional(),
  logo: z.string().optional(),
  address: z.string().min(1, "L'adresse est requise").or(z.literal("")),
  city: z.string().min(1, "La ville est requise").or(z.literal("")),
  postalCode: z.string().optional(),
  country: z.string().default("Côte d'Ivoire"),
  phone: z.string().min(1, "Le téléphone est requis").or(z.literal("")),
  email: z.string().email("Email invalide").or(z.literal("")),
  website: z.string().url("URL invalide").optional().or(z.literal("")),
  rccm: z.string().optional(),
  nif: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  bankIban: z.string().optional(),
  bankSwift: z.string().optional(),
  legalForm: z.string().optional(),
  capital: z.string().optional(),
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

    const settings = await prisma.companySettings.findFirst({
      where: {
        userId: session.user.id
      }
    })

    // Si aucun paramètre n'existe, retourner des valeurs par défaut
    if (!settings) {
      return NextResponse.json({
        name: "",
        description: "",
        logo: "",
        address: "",
        city: "",
        postalCode: "",
        country: "Côte d'Ivoire",
        phone: "",
        email: "",
        website: "",
        rccm: "",
        nif: "",
        bankName: "",
        bankAccount: "",
        bankIban: "",
        bankSwift: "",
        legalForm: "",
        capital: ""
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error("Erreur lors de la récupération des paramètres:", error)
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
    const validatedData = companySettingsSchema.parse(body)

    // Vérifier si des paramètres existent déjà
    const existingSettings = await prisma.companySettings.findFirst({
      where: {
        userId: session.user.id
      }
    })

    let settings
    if (existingSettings) {
      // Mettre à jour les paramètres existants
      settings = await prisma.companySettings.update({
        where: {
          id: existingSettings.id
        },
        data: validatedData
      })
    } else {
      // Créer de nouveaux paramètres
      settings = await prisma.companySettings.create({
        data: {
          ...validatedData,
          userId: session.user.id
        }
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error("Erreur lors de la sauvegarde des paramètres:", error)
    return NextResponse.json(
      { message: "Erreur lors de la sauvegarde des paramètres" },
      { status: 500 }
    )
  }
} 