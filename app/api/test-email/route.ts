import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sendEmail } from "@/lib/email"
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

    const { testEmail } = await request.json()

    if (!testEmail) {
      return NextResponse.json(
        { message: "Email de test requis" },
        { status: 400 }
      )
    }

    // Récupérer les informations de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
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
          message: "Configuration SMTP incomplète. Veuillez configurer vos paramètres SMTP dans votre profil.",
          missingConfig: {
            smtpHost: !user.smtpHost,
            smtpUser: !user.smtpUser,
            smtpPassword: !user.smtpPassword
          }
        },
        { status: 400 }
      )
    }

    // Générer le contenu de l'email de test
    const testEmailContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Test de configuration SMTP</title>
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: #f8fafc;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 12px; 
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }
          .header { 
            background: linear-gradient(135deg, #10b981, #059669);
            color: white; 
            text-align: center; 
            padding: 30px 20px;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
          }
          .content {
            padding: 40px 30px;
          }
          .success-icon {
            text-align: center;
            font-size: 64px;
            margin: 20px 0;
          }
          .test-details {
            background: #f0fdf4;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #10b981;
          }
          .footer { 
            background: #f9fafb;
            padding: 30px; 
            border-top: 1px solid #e5e7eb; 
            font-size: 14px; 
            color: #6b7280;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Test SMTP Réussi !</h1>
            <p>Configuration email validée</p>
          </div>
          
          <div class="content">
            <div class="success-icon">🎉</div>
            
            <h2 style="text-align: center; color: #059669;">Félicitations !</h2>
            
            <p>Votre configuration SMTP fonctionne parfaitement. Vous pouvez maintenant envoyer des emails depuis votre application REV.</p>
            
            <div class="test-details">
              <h3 style="margin: 0 0 15px 0; color: #059669;">📋 Détails du test</h3>
              <p><strong>Date du test :</strong> ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
              <p><strong>Serveur SMTP :</strong> ${user.smtpHost}:${user.smtpPort || 587}</p>
              <p><strong>Utilisateur :</strong> ${user.smtpUser}</p>
              <p><strong>Email expéditeur :</strong> ${user.smtpFrom || user.email}</p>
            </div>
            
            <div style="margin: 30px 0; padding: 20px; background: #eff6ff; border-radius: 8px; border-left: 4px solid #3b82f6;">
              <p style="margin: 0; color: #1e40af;">
                <strong>💡 Conseil :</strong> Vous pouvez maintenant envoyer vos proformas et factures par email directement depuis l'application.
              </p>
            </div>
            
            <p style="text-align: center; margin: 25px 0; color: #6b7280;">
              Merci d'utiliser REV ! 🚀
            </p>
          </div>
          
          <div class="footer">
            <div>
              <h4>${user.companyName || user.name}</h4>
              ${user.address ? `<p>📍 ${user.address}</p>` : ''}
              ${user.phone ? `<p>📞 ${user.phone}</p>` : ''}
              <p>📧 ${user.email}</p>
            </div>
            
            <p style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb; font-size: 12px;">
              Cet email de test a été généré automatiquement par REV.
            </p>
          </div>
        </div>
      </body>
      </html>
    `

    console.log("🧪 Envoi d'email de test à:", testEmail)

    // Envoyer l'email de test
    const result = await sendEmail(session.user.id, {
      to: testEmail,
      subject: `✅ Test SMTP réussi - ${user.companyName || user.name}`,
      html: testEmailContent
    })

    console.log("✅ Email de test envoyé avec succès:", result.messageId)

    // Enregistrer l'email de test en base de données
    await prisma.email.create({
      data: {
        to: testEmail,
        subject: `Test SMTP réussi - ${user.companyName || user.name}`,
        content: "Email de test de configuration SMTP",
        type: "custom",
        status: "SENT",
        sentAt: new Date(),
        userId: session.user.id
      }
    })

    return NextResponse.json({
      message: "Email de test envoyé avec succès !",
      messageId: result.messageId,
      testEmail,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error("❌ Erreur lors de l'envoi de l'email de test:", error)

    // Messages d'erreur spécifiques
    let errorMessage = "Erreur lors de l'envoi de l'email de test"
    
    if (error.code === 'EAUTH') {
      errorMessage = "Erreur d'authentification SMTP. Vérifiez votre nom d'utilisateur et mot de passe."
    } else if (error.code === 'ECONNECTION') {
      errorMessage = "Impossible de se connecter au serveur SMTP. Vérifiez l'adresse du serveur et le port."
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = "Timeout de connexion au serveur SMTP. Vérifiez votre connexion internet."
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = "Serveur SMTP introuvable. Vérifiez l'adresse du serveur."
    } else if (error.message?.includes('Configuration SMTP manquante')) {
      errorMessage = error.message
    } else if (error.message) {
      errorMessage = `Erreur SMTP: ${error.message}`
    }

    return NextResponse.json(
      { 
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        code: error.code
      },
      { status: 500 }
    )
  }
} 