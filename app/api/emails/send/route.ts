import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sendEmail, generateInvoiceEmailTemplate, generateProjectUpdateEmailTemplate, generateInvoicePDF } from "@/lib/email"
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
  attachPDF: z.boolean().optional().default(true), // Par défaut, attacher le PDF pour les factures/proformas
  customMessage: z.string().optional(), // Message personnalisé pour accompagner le PDF
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
    console.log("📧 Données reçues pour l'envoi d'email:", body)
    
    const validatedData = emailSchema.parse(body)

    // Récupérer les informations utilisateur
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        companyName: true,
        companyLogo: true,
        address: true,
        phone: true,
        currency: true,
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

    // Vérifier la configuration SMTP
    if (!user.smtpHost || !user.smtpUser || !user.smtpPassword) {
      return NextResponse.json(
        { 
          message: "Configuration SMTP manquante. Veuillez configurer vos paramètres SMTP dans votre profil.",
          missingConfig: {
            smtpHost: !user.smtpHost,
            smtpUser: !user.smtpUser,
            smtpPassword: !user.smtpPassword
          }
        },
        { status: 400 }
      )
    }

    let emailHtml = ""
    let emailData: any = {
      to: validatedData.to,
      subject: validatedData.subject,
      content: validatedData.message || "",
      type: validatedData.type,
      status: "PENDING",
      userId: session.user.id
    }

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

        // Utiliser le message personnalisé si fourni, sinon le template complet
        if (validatedData.customMessage) {
          emailHtml = generateInvoiceEmailTemplate(invoice, user, validatedData.customMessage)
        } else {
          emailHtml = validatedData.customHtml || generateInvoiceEmailTemplate(invoice, user)
        }
        
        emailData.invoiceId = validatedData.invoiceId
        emailData.content = validatedData.customMessage || `Email de facture ${invoice.invoiceNumber}`
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
        emailData.projectId = validatedData.projectId
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

    console.log("📧 Tentative d'envoi d'email à:", validatedData.to)

    // Préparer les options d'email
    const emailOptions: any = {
      to: validatedData.to,
      subject: validatedData.subject,
      html: emailHtml
    }

    // Ajouter le PDF en pièce jointe si c'est une facture/proforma et que l'option est activée
    if (validatedData.type === "invoice" && validatedData.attachPDF && validatedData.invoiceId) {
      try {
        console.log("📎 Génération du PDF en pièce jointe...")
        const pdfBuffer = await generateInvoicePDF(validatedData.invoiceId, session.user.id)
        
        // Récupérer les informations de la facture pour le nom du fichier
        const invoice = await prisma.invoice.findUnique({
          where: { id: validatedData.invoiceId },
          select: { invoiceNumber: true, type: true }
        })
        
        const docType = invoice?.type === 'PROFORMA' ? 'proforma' : 'facture'
        const filename = `${docType}-${invoice?.invoiceNumber || 'document'}.pdf`
        
        emailOptions.attachments = [{
          filename: filename,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }]
        
        console.log("✅ PDF généré et ajouté en pièce jointe:", filename)
      } catch (pdfError) {
        console.error("❌ Erreur lors de la génération du PDF:", pdfError)
        // Continuer l'envoi sans le PDF en cas d'erreur
        console.log("⚠️ Envoi de l'email sans le PDF...")
      }
    }

    // Envoyer l'email
    const emailResult = await sendEmail(session.user.id, emailOptions)

    console.log("✅ Email envoyé avec succès:", emailResult.messageId)

    // Enregistrer l'email en base de données
    const savedEmail = await prisma.email.create({
      data: {
        ...emailData,
        status: "SENT",
        sentAt: new Date()
      }
    })

    console.log("💾 Email enregistré en base:", savedEmail.id)

    return NextResponse.json({ 
      message: "Email envoyé avec succès",
      type: validatedData.type,
      to: validatedData.to,
      messageId: emailResult.messageId,
      emailId: savedEmail.id
    })

  } catch (error: any) {
    console.error("❌ Erreur lors de l'envoi de l'email:", error)
    
    // Enregistrer l'erreur en base si possible
    try {
      if (error.name !== 'ZodError') {
        await prisma.email.create({
          data: {
            to: (await request.json()).to || "unknown",
            subject: (await request.json()).subject || "Erreur",
            content: `Erreur: ${error.message}`,
            type: "custom",
            status: "FAILED",
            userId: (await getServerSession(authOptions))?.user?.id || ""
          }
        })
      }
    } catch (dbError) {
      console.error("Erreur lors de l'enregistrement de l'erreur:", dbError)
    }

    // Messages d'erreur spécifiques
    let errorMessage = "Erreur lors de l'envoi de l'email"
    
    if (error.code === 'EAUTH') {
      errorMessage = "Erreur d'authentification SMTP. Vérifiez vos identifiants dans votre profil."
    } else if (error.code === 'ECONNECTION') {
      errorMessage = "Impossible de se connecter au serveur SMTP. Vérifiez l'adresse et le port."
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = "Timeout de connexion au serveur SMTP."
    } else if (error.message?.includes('Configuration SMTP manquante')) {
      errorMessage = error.message
    } else if (error.name === 'ZodError') {
      errorMessage = "Données invalides: " + error.errors.map((e: any) => e.message).join(", ")
    } else if (error.message) {
      errorMessage = error.message
    }

    return NextResponse.json(
      { 
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
} 