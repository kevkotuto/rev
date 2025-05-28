import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateInvoicePDF } from "@/lib/email"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    
    // Paramètres de sécurité optionnels
    const token = searchParams.get('token') // Token de sécurité optionnel
    const invoiceNumber = searchParams.get('invoiceNumber') // Numéro de facture pour validation

    // Récupérer la facture pour obtenir l'userId
    const invoice = await prisma.invoice.findFirst({
      where: {
        id
      },
      select: {
        id: true,
        invoiceNumber: true,
        userId: true
      }
    })

    if (!invoice) {
      return NextResponse.json(
        { message: "Facture non trouvée" },
        { status: 404 }
      )
    }

    // Vérification de sécurité optionnelle avec le numéro de facture
    if (invoiceNumber && invoice.invoiceNumber !== invoiceNumber) {
      return NextResponse.json(
        { message: "Numéro de facture invalide" },
        { status: 403 }
      )
    }

    // Générer le PDF en utilisant la fonction existante
    const pdfBuffer = await generateInvoicePDF(invoice.id, invoice.userId)

    // Retourner le PDF avec les en-têtes appropriés
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoice.invoiceNumber}.pdf"`,
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*', // Permettre l'accès depuis n'importe quel domaine
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })

  } catch (error) {
    console.error("Erreur lors de la génération du PDF public:", error)
    
    // Si la génération PDF échoue, essayer de retourner une réponse JSON d'erreur
    try {
      return NextResponse.json(
        { message: "Erreur lors de la génération du PDF" },
        { status: 500 }
      )
    } catch {
      // Si même la réponse JSON échoue, retourner une réponse texte
      return new NextResponse("Erreur lors de la génération du PDF", {
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      })
    }
  }
} 