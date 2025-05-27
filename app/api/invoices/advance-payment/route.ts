import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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
    const { projectId, amount, description, clientEmail, generatePaymentLink } = body

    // Vérifier que le projet appartient à l'utilisateur
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: session.user.id
      },
      include: {
        client: true
      }
    })

    if (!project) {
      return NextResponse.json(
        { message: "Projet non trouvé" },
        { status: 404 }
      )
    }

    // Générer un numéro de facture
    const lastInvoice = await prisma.invoice.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' }
    })

    let invoiceNumber
    if (lastInvoice?.invoiceNumber) {
      const lastNumber = parseInt(lastInvoice.invoiceNumber.replace(/\D/g, ''))
      invoiceNumber = `FAC-${String(lastNumber + 1).padStart(4, '0')}`
    } else {
      invoiceNumber = 'FAC-0001'
    }

    // Créer la facture d'acompte
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        type: "INVOICE",
        amount: amount,
        status: "PENDING",
        notes: description || `Acompte pour le projet ${project.name}`,
        clientName: project.client?.name || project.name,
        clientEmail: clientEmail || project.client?.email,
        clientAddress: project.client?.address,
        clientPhone: project.client?.phone,
        projectId: projectId,
        userId: session.user.id
      }
    })

    let paymentLink = null

    // Générer un lien de paiement Wave si demandé
    if (generatePaymentLink) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/wave/create-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: amount,
            description: `Acompte ${invoiceNumber} - ${project.name}`,
            clientEmail: clientEmail || project.client?.email,
            invoiceId: invoice.id
          })
        })

        if (response.ok) {
          const paymentData = await response.json()
          paymentLink = paymentData.paymentUrl

          // Mettre à jour la facture avec le lien de paiement
          await prisma.invoice.update({
            where: { id: invoice.id },
            data: { paymentLink }
          })
        }
      } catch (error) {
        console.error('Erreur lors de la création du lien de paiement:', error)
      }
    }

    return NextResponse.json({
      invoice,
      paymentLink,
      message: `Acompte de ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(amount)} créé avec succès`
    })
  } catch (error) {
    console.error("Erreur lors de la création de l'acompte:", error)
    return NextResponse.json(
      { message: "Erreur lors de la création de l'acompte" },
      { status: 500 }
    )
  }
} 