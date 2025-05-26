import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sendEmail, generateInvoiceEmailTemplate, generateProjectUpdateEmailTemplate } from "@/lib/email"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const emailSchema = z.object({
  type: z.enum(["invoice", "project_update", "custom"]),
  to: z.string().email("Email invalide"),
  subject: z.string().min(1, "Le sujet est requis"),
  message: z.string().optional(),
  invoiceId: z.string().optional(),
  projectId: z.string().optional(),
  customHtml: z.string().optional(),
})

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
    const validatedData = emailSchema.parse(body)

    // Récupérer les informations utilisateur
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json(
        { message: "Utilisateur non trouvé" },
        { status: 404 }
      )
    }

    let emailHtml = ""

    switch (validatedData.type) {
      case "invoice":
        if (!validatedData.invoiceId) {
          return NextResponse.json(
            { message: "ID de facture requis" },
            { status: 400 }
          )
        }

        const invoice = await prisma.invoice.findFirst({
          where: {
            id: validatedData.invoiceId,
            userId: session.user.id
          },
          include: {
            project: {
              include: {
                client: true
              }
            }
          }
        })

        if (!invoice) {
          return NextResponse.json(
            { message: "Facture non trouvée" },
            { status: 404 }
          )
        }

        emailHtml = generateInvoiceEmailTemplate(invoice, user)
        break

      case "project_update":
        if (!validatedData.projectId || !validatedData.message) {
          return NextResponse.json(
            { message: "ID de projet et message requis" },
            { status: 400 }
          )
        }

        const project = await prisma.project.findFirst({
          where: {
            id: validatedData.projectId,
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

        emailHtml = generateProjectUpdateEmailTemplate(project, user, validatedData.message)
        break

      case "custom":
        if (!validatedData.customHtml) {
          return NextResponse.json(
            { message: "Contenu HTML requis" },
            { status: 400 }
          )
        }
        emailHtml = validatedData.customHtml
        break

      default:
        return NextResponse.json(
          { message: "Type d'email non supporté" },
          { status: 400 }
        )
    }

    // Envoyer l'email
    await sendEmail(session.user.id, {
      to: validatedData.to,
      subject: validatedData.subject,
      html: emailHtml
    })

    return NextResponse.json({ 
      message: "Email envoyé avec succès",
      type: validatedData.type,
      to: validatedData.to
    })

  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email:", error)
    return NextResponse.json(
      { message: "Erreur lors de l'envoi de l'email" },
      { status: 500 }
    )
  }
} 