import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const payoutSchema = z.object({
  amount: z.number().positive("Le montant doit être positif"),
  projectProviderId: z.string().optional(),
  notes: z.string().optional()
})

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

    const { id: providerId } = await params
    const body = await request.json()
    const { amount, projectProviderId, notes } = payoutSchema.parse(body)

    // Vérifier que le prestataire existe et appartient à l'utilisateur
    const provider = await prisma.provider.findFirst({
      where: {
        id: providerId,
        userId: session.user.id
      }
    })

    if (!provider) {
      return NextResponse.json(
        { message: "Prestataire non trouvé" },
        { status: 404 }
      )
    }

    // Vérifier que le prestataire a un numéro de téléphone
    if (!provider.phone) {
      return NextResponse.json(
        { message: "Le prestataire doit avoir un numéro de téléphone pour recevoir un paiement Wave" },
        { status: 400 }
      )
    }

    // Récupérer la clé API Wave de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        waveApiKey: true
      }
    })

    if (!user?.waveApiKey) {
      return NextResponse.json(
        { message: "Clé API Wave non configurée" },
        { status: 400 }
      )
    }

    // Préparer les données pour l'API Wave
    const wavePayload = {
      currency: "XOF",
      receive_amount: amount.toString(),
      mobile: provider.phone,
      name: provider.name,
      client_reference: `payout-${providerId}-${Date.now()}`,
      payment_reason: projectProviderId ? "Paiement projet" : "Paiement prestataire"
    }

    // Appeler l'API Wave
    let waveResponse = null
    try {
      const response = await fetch('https://api.wave.com/v1/payout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.waveApiKey}`,
          'Content-Type': 'application/json',
          'idempotency-key': `payout-${providerId}-${Date.now()}`
        },
        body: JSON.stringify(wavePayload)
      })

      waveResponse = await response.json()

      if (!response.ok) {
        console.error('Erreur API Wave:', waveResponse)
        return NextResponse.json(
          { 
            message: "Erreur lors du paiement Wave", 
            waveError: waveResponse.message || "Erreur inconnue"
          },
          { status: 400 }
        )
      }
    } catch (error) {
      console.error('Erreur lors de l\'appel API Wave:', error)
      return NextResponse.json(
        { message: "Erreur de connexion à l'API Wave" },
        { status: 500 }
      )
    }

    // Créer une dépense pour tracer le paiement
    const expenseData = {
      description: `Paiement Wave - ${provider.name}`,
      amount: amount,
      category: 'PROVIDER_PAYMENT' as const,
      type: projectProviderId ? 'PROJECT' as const : 'GENERAL' as const,
      date: new Date(),
      notes: `${notes || ''}\nWave ID: ${waveResponse.id}\nTéléphone: ${provider.phone}`.trim(),
      userId: session.user.id,
      projectId: null as string | null
    }

    // Si c'est lié à un projet, essayer de récupérer le projectId
    if (projectProviderId) {
      const projectProvider = await prisma.projectProvider.findUnique({
        where: { id: projectProviderId },
        include: { project: true }
      })
      
      if (projectProvider) {
        expenseData.projectId = projectProvider.project.id
        
        // Marquer le prestataire comme payé dans le projet
        await prisma.projectProvider.update({
          where: { id: projectProviderId },
          data: {
            isPaid: true,
            paidDate: new Date(),
            paymentMethod: 'WAVE'
          }
        })
      }
    }

    const expense = await prisma.expense.create({
      data: expenseData
    })

    return NextResponse.json({
      message: "Paiement Wave effectué avec succès",
      waveResponse,
      expense: {
        id: expense.id,
        amount: expense.amount
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Données invalides", errors: error.errors },
        { status: 400 }
      )
    }

    console.error("Erreur lors du paiement Wave:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 