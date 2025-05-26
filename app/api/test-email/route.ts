import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import nodemailer from "nodemailer"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Non autorisé" },
        { status: 401 }
      )
    }

    const { testEmail } = await request.json()

    if (!testEmail) {
      return NextResponse.json(
        { message: "Email de test requis" },
        { status: 400 }
      )
    }

    // Récupérer les paramètres SMTP de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        smtpPassword: true,
        smtpFrom: true,
        name: true
      }
    })

    if (!user?.smtpHost || !user?.smtpPort || !user?.smtpUser || !user?.smtpPassword) {
      return NextResponse.json(
        { message: "Configuration SMTP incomplète. Veuillez configurer vos paramètres SMTP dans votre profil." },
        { status: 400 }
      )
    }

    // Créer le transporteur nodemailer
    const transporter = nodemailer.createTransport({
      host: user.smtpHost,
      port: user.smtpPort,
      secure: user.smtpPort === 465, // true pour 465, false pour les autres ports
      auth: {
        user: user.smtpUser,
        pass: user.smtpPassword,
      },
    })

    // Vérifier la connexion SMTP
    await transporter.verify()

    // Envoyer l'email de test
    const info = await transporter.sendMail({
      from: user.smtpFrom || user.smtpUser,
      to: testEmail,
      subject: "Test de configuration SMTP - Freelance Manager",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Test de configuration SMTP réussi !</h2>
          <p>Bonjour,</p>
          <p>Cet email confirme que votre configuration SMTP fonctionne correctement.</p>
          <p><strong>Détails de la configuration :</strong></p>
          <ul>
            <li>Serveur SMTP : ${user.smtpHost}</li>
            <li>Port : ${user.smtpPort}</li>
            <li>Utilisateur : ${user.smtpUser}</li>
            <li>Expéditeur : ${user.smtpFrom || user.smtpUser}</li>
          </ul>
          <p>Vous pouvez maintenant envoyer des emails depuis votre application Freelance Manager.</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            Cet email a été envoyé depuis Freelance Manager par ${user.name || 'Utilisateur'}
          </p>
        </div>
      `,
      text: `
        Test de configuration SMTP réussi !
        
        Cet email confirme que votre configuration SMTP fonctionne correctement.
        
        Détails de la configuration :
        - Serveur SMTP : ${user.smtpHost}
        - Port : ${user.smtpPort}
        - Utilisateur : ${user.smtpUser}
        - Expéditeur : ${user.smtpFrom || user.smtpUser}
        
        Vous pouvez maintenant envoyer des emails depuis votre application Freelance Manager.
        
        Cet email a été envoyé depuis Freelance Manager par ${user.name || 'Utilisateur'}
      `
    })

    // Enregistrer l'email dans la base de données
    await prisma.email.create({
      data: {
        to: testEmail,
        subject: "Test de configuration SMTP - Freelance Manager",
        content: "Email de test de configuration SMTP",
        type: "test",
        status: "SENT",
        sentAt: new Date(),
        userId: session.user.id
      }
    })

    return NextResponse.json({
      message: "Email de test envoyé avec succès !",
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected
    })

  } catch (error: any) {
    console.error("Erreur lors de l'envoi de l'email de test:", error)
    
    let errorMessage = "Erreur lors de l'envoi de l'email de test"
    
    if (error.code === 'EAUTH') {
      errorMessage = "Erreur d'authentification SMTP. Vérifiez vos identifiants."
    } else if (error.code === 'ECONNECTION') {
      errorMessage = "Impossible de se connecter au serveur SMTP. Vérifiez l'adresse et le port."
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = "Timeout de connexion au serveur SMTP."
    } else if (error.message) {
      errorMessage = error.message
    }

    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    )
  }
} 