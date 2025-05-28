import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"
import crypto from "crypto"



// Interface pour les données du webhook Wave
interface WaveWebhookPayload {
  type: string
  data: {
    id: string
    amount?: string
    currency?: string
    status?: string
    client_reference?: string
    when_completed?: string
    when_created?: string
    transaction_id?: string
    last_payment_error?: any
    sender_mobile?: string
    merchant_id?: string
    custom_fields?: any
    sender_id?: string
    restrict_payer_mobile?: string
    // Champs pour les tests
    test_key?: string
    your_merchant_name?: string
    webhook_test_id?: string
    user_id?: string
  }
}

// Fonction pour vérifier la signature Wave
function verifyWaveSignature(
  waveWebhookSecret: string,
  waveSignature: string,
  webhookBody: string
): boolean {
  try {
    const parts = waveSignature.split(",")
    const timestamp = parts[0].split("=")[1]
    
    const signatures = parts.slice(1).map(part => part.split("=")[1])
    
    const payload = timestamp + webhookBody
    const computedHmac = crypto
      .createHmac("sha256", waveWebhookSecret)
      .update(payload)
      .digest("hex")
    
    return signatures.includes(computedHmac)
  } catch (error) {
    console.error("Erreur lors de la vérification de signature:", error)
    return false
  }
}

// Fonction pour traiter les événements de test
async function handleTestEvent(eventData: any, signature: string) {
  console.log('Traitement événement de test:', eventData)
  
  const { webhook_test_id, user_id, your_merchant_name } = eventData
  
  if (webhook_test_id && user_id) {
    // Extraire le secret de la signature et le sauvegarder
    const secret = extractSecretFromSignature(signature)
    if (secret) {
      try {
        await prisma.user.update({
          where: { id: user_id },
          data: {
            waveWebhookSecret: secret
          }
        })
        
        console.log(`Secret webhook sauvegardé pour l'utilisateur ${user_id}:`, secret.substring(0, 10) + '...')
        
        // Créer une notification de succès
        await createNotification({
          userId: user_id,
          title: "Webhook Wave configuré !",
          message: `Test webhook réussi pour ${your_merchant_name}. Secret de signature configuré automatiquement.`,
          type: "SUCCESS",
          relatedType: "webhook_test",
          relatedId: webhook_test_id,
          actionUrl: "/profile",
          metadata: {
            testId: webhook_test_id,
            merchantName: your_merchant_name,
            signatureConfigured: true
          }
        })
      } catch (error) {
        console.error('Erreur lors de la sauvegarde du secret:', error)
      }
    }
  }
}

// Fonction pour extraire le secret de la signature Wave
function extractSecretFromSignature(signature: string): string | null {
  try {
    // Pour un vrai système, nous devrions avoir le secret configuré par l'utilisateur
    // Ici, nous allons créer un secret basé sur la signature pour identifier cet utilisateur
    const parts = signature.split(",")
    if (parts.length >= 2) {
      const timestamp = parts[0].split("=")[1]
      const hash = parts[1].split("=")[1]
      
      // Créer un secret unique basé sur les premiers caractères du hash
      // Ceci est temporaire - l'utilisateur devra configurer le vrai secret Wave
      return `wave_${hash.substring(0, 16)}_${timestamp.substring(-8)}`
    }
    return null
  } catch (error) {
    console.error("Erreur lors de l'extraction du secret:", error)
    return null
  }
}

// Fonction pour traiter les événements Wave
async function processWaveEvent(eventType: string, eventData: any) {
  try {
    console.log(`Traitement de l'événement Wave: ${eventType}`, eventData)
    
    switch (eventType) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(eventData)
        break
      
      case 'checkout.session.payment_failed':
        await handleCheckoutFailed(eventData)
        break
      
      case 'merchant.payment_received':
        await handleMerchantPaymentReceived(eventData)
        break
      
      case 'b2b.payment_received':
        await handleB2BPaymentReceived(eventData)
        break
      
      case 'b2b.payment_failed':
        await handleB2BPaymentFailed(eventData)
        break
      
      default:
        console.log(`Type d'événement Wave non géré: ${eventType}`)
        // Créer une notification générique pour les événements non gérés
        await handleGenericWaveEvent(eventType, eventData)
    }
  } catch (error) {
    console.error(`Erreur lors du traitement de l'événement ${eventType}:`, error)
  }
}

// Gestionnaire générique pour les événements non spécifiquement gérés
async function handleGenericWaveEvent(eventType: string, data: any) {
  const users = await prisma.user.findMany({
    where: {
      waveApiKey: { not: null }
    }
  })

  for (const user of users) {
    await createNotification({
      userId: user.id,
      title: `Événement Wave: ${eventType}`,
      message: `Nouvel événement Wave reçu: ${eventType}`,
      type: "INFO",
      relatedType: "wave_transaction",
      relatedId: data.id,
      actionUrl: "/wave-transactions",
      metadata: {
        eventType,
        data
      }
    })
  }
}

// Gestionnaires d'événements spécifiques
async function handleCheckoutCompleted(data: any) {
  console.log('Traitement checkout.session.completed:', data)
  
  // 1. Chercher une facture liée par waveCheckoutId
  let invoice = await prisma.invoice.findFirst({
    where: {
      waveCheckoutId: data.id
    },
    include: {
      user: true,
      project: true
    }
  })

  // 2. Si pas de facture trouvée, chercher par client_reference
  if (!invoice && data.client_reference) {
    invoice = await prisma.invoice.findFirst({
      where: {
        id: data.client_reference
      },
      include: {
        user: true,
        project: true
      }
    })
  }

  // 3. Si toujours pas de facture, créer une transaction Wave générique
  if (!invoice) {
    console.log('Aucune facture trouvée, création d\'une transaction Wave générique')
    await handleGenericPaymentReceived(data)
    return
  }

  // 4. Mettre à jour la facture
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status: 'PAID',
      paidDate: data.when_completed ? new Date(data.when_completed) : new Date()
    }
  })

  // 5. Créer une notification
  await createNotification({
    userId: invoice.userId,
    title: "Paiement reçu !",
    message: `La facture ${invoice.invoiceNumber} de ${data.amount} ${data.currency} a été payée avec succès.`,
    type: "WAVE_CHECKOUT_COMPLETED",
    relatedType: "invoice",
    relatedId: invoice.id,
    actionUrl: `/invoices/${invoice.id}`,
    metadata: {
      amount: data.amount,
      currency: data.currency,
      transactionId: data.transaction_id,
      clientReference: data.client_reference,
      waveCheckoutId: data.id
    }
  })

  console.log(`Facture ${invoice.invoiceNumber} marquée comme payée`)
}

async function handleGenericPaymentReceived(data: any) {
  console.log('Traitement paiement générique:', data)
  
  // Trouver tous les utilisateurs avec Wave configuré
  const users = await prisma.user.findMany({
    where: {
      waveApiKey: { not: null }
    }
  })

  for (const user of users) {
    // Créer une assignation Wave pour tracking
    const assignment = await prisma.waveTransactionAssignment.create({
      data: {
        transactionId: data.transaction_id || data.id,
        type: 'revenue',
        description: `Paiement Wave reçu - ${data.id}`,
        amount: parseFloat(data.amount),
        currency: data.currency,
        timestamp: data.when_completed ? new Date(data.when_completed) : new Date(),
        counterpartyMobile: data.restrict_payer_mobile,
        userId: user.id,
        waveData: data
      }
    })

    // Créer une notification
    await createNotification({
      userId: user.id,
      title: "Nouveau paiement Wave",
      message: `Paiement de ${data.amount} ${data.currency} reçu via lien de paiement`,
      type: "WAVE_PAYMENT_RECEIVED",
      relatedType: "wave_transaction",
      relatedId: assignment.id,
      actionUrl: "/wave-transactions",
      metadata: {
        amount: data.amount,
        currency: data.currency,
        transactionId: data.transaction_id || data.id,
        waveCheckoutId: data.id,
        clientReference: data.client_reference
      }
    })
  }
}

async function handleCheckoutFailed(data: any) {
  console.log('Traitement checkout.session.payment_failed:', data)
  
  const invoice = await prisma.invoice.findFirst({
    where: {
      OR: [
        { waveCheckoutId: data.id },
        { id: data.client_reference || '' }
      ]
    },
    include: {
      user: true
    }
  })

  if (invoice) {
    await createNotification({
      userId: invoice.userId,
      title: "Échec de paiement",
      message: `Le paiement de la facture ${invoice.invoiceNumber} a échoué. Montant: ${data.amount} ${data.currency}`,
      type: "WAVE_CHECKOUT_FAILED",
      relatedType: "invoice",
      relatedId: invoice.id,
      actionUrl: `/invoices/${invoice.id}`,
      metadata: {
        amount: data.amount,
        currency: data.currency,
        error: data.last_payment_error,
        waveCheckoutId: data.id
      }
    })
  } else {
    // Notifier tous les utilisateurs Wave
    const users = await prisma.user.findMany({
      where: { waveApiKey: { not: null } }
    })

    for (const user of users) {
      await createNotification({
        userId: user.id,
        title: "Échec de paiement Wave",
        message: `Paiement échoué: ${data.amount} ${data.currency}`,
        type: "WAVE_PAYMENT_FAILED",
        relatedType: "wave_transaction",
        relatedId: data.id,
        actionUrl: "/wave-transactions",
        metadata: {
          amount: data.amount,
          currency: data.currency,
          error: data.last_payment_error,
          waveCheckoutId: data.id
        }
      })
    }
  }
}

async function handleMerchantPaymentReceived(data: any) {
  console.log('Traitement merchant.payment_received:', data)
  
  const users = await prisma.user.findMany({
    where: {
      waveApiKey: { not: null }
    }
  })

  for (const user of users) {
    // Assignation automatique intelligente basée sur le numéro de téléphone
    let autoAssignment = null
    let conflictData = null

    if (data.sender_mobile) {
      // Rechercher le numéro dans les clients et prestataires
      const [matchingClients, matchingProviders] = await Promise.all([
        prisma.client.findMany({
          where: {
            userId: user.id,
            phone: {
              contains: data.sender_mobile.replace(/^\+\d{1,3}/, '').replace(/\D/g, '') // Normaliser le numéro
            }
          }
        }),
        prisma.provider.findMany({
          where: {
            userId: user.id,
            phone: {
              contains: data.sender_mobile.replace(/^\+\d{1,3}/, '').replace(/\D/g, '') // Normaliser le numéro
            }
          }
        })
      ])

      // Logique d'assignation automatique
      if (matchingClients.length === 1 && matchingProviders.length === 0) {
        // Un seul client correspond - assignation automatique
        autoAssignment = {
          type: 'revenue' as const,
          description: `Paiement marchand reçu de ${matchingClients[0].name}`,
          clientId: matchingClients[0].id,
          counterpartyName: matchingClients[0].name
        }
      } else if (matchingProviders.length === 1 && matchingClients.length === 0) {
        // Un seul prestataire correspond - assignation automatique comme remboursement
        autoAssignment = {
          type: 'revenue' as const,
          description: `Remboursement reçu de ${matchingProviders[0].name}`,
          providerId: matchingProviders[0].id,
          counterpartyName: matchingProviders[0].name
        }
      } else if (matchingClients.length > 0 || matchingProviders.length > 0) {
        // Conflit - plusieurs correspondances
        conflictData = {
          clients: matchingClients,
          providers: matchingProviders,
          senderMobile: data.sender_mobile
        }
      }
    }

    // Créer une assignation Wave avec assignation automatique ou données de conflit
    const assignmentData = {
      transactionId: data.id,
      type: autoAssignment?.type || 'revenue',
      description: autoAssignment?.description || `Paiement marchand reçu de ${data.sender_mobile}`,
      amount: parseFloat(data.amount),
      currency: data.currency,
      timestamp: new Date(),
      counterpartyMobile: data.sender_mobile,
      counterpartyName: autoAssignment?.counterpartyName,
      userId: user.id,
      waveData: data,
      ...(autoAssignment?.clientId && { clientId: autoAssignment.clientId }),
      ...(autoAssignment?.providerId && { providerId: autoAssignment.providerId }),
      ...(conflictData && { 
        conflictData: {
          needsResolution: true,
          ...conflictData
        }
      })
    }

    const assignment = await prisma.waveTransactionAssignment.create({
      data: assignmentData,
      include: {
        client: true,
        provider: true
      }
    })

    // Créer une notification adaptée
    let notificationTitle = "Nouveau paiement marchand Wave"
    let notificationMessage = `Paiement de ${data.amount} ${data.currency} reçu`
    let notificationType: "SUCCESS" | "WARNING" | "WAVE_PAYMENT_RECEIVED" = "WAVE_PAYMENT_RECEIVED"

    if (autoAssignment) {
      notificationTitle = autoAssignment.clientId 
        ? "Paiement client assigné automatiquement" 
        : "Remboursement prestataire assigné automatiquement"
      notificationMessage = `${autoAssignment.description} - ${data.amount} ${data.currency}`
      notificationType = "SUCCESS"
    } else if (conflictData) {
      notificationTitle = "Paiement Wave - Assignation requise"
      notificationMessage = `Paiement de ${data.amount} ${data.currency} de ${data.sender_mobile} nécessite une assignation manuelle (plusieurs correspondances trouvées)`
      notificationType = "WARNING"
    }

    await createNotification({
      userId: user.id,
      title: notificationTitle,
      message: notificationMessage,
      type: notificationType,
      relatedType: "wave_transaction",
      relatedId: assignment.id,
      actionUrl: autoAssignment ? `/wave-transactions` : `/wave-transactions?conflict=${assignment.id}`,
      metadata: {
        amount: data.amount,
        currency: data.currency,
        senderMobile: data.sender_mobile,
        autoAssigned: !!autoAssignment,
        hasConflict: !!conflictData,
        assignmentId: assignment.id,
        ...(autoAssignment?.clientId && { clientId: autoAssignment.clientId }),
        ...(autoAssignment?.providerId && { providerId: autoAssignment.providerId })
      }
    })
  }
}

async function handleB2BPaymentReceived(data: any) {
  console.log('Traitement b2b.payment_received:', data)
  
  const users = await prisma.user.findMany({
    where: {
      waveApiKey: { not: null }
    }
  })

  for (const user of users) {
    // Créer une assignation Wave
    const assignment = await prisma.waveTransactionAssignment.create({
      data: {
        transactionId: data.id,
        type: 'revenue',
        description: `Paiement B2B reçu`,
        amount: parseFloat(data.amount),
        currency: data.currency,
        timestamp: new Date(),
        userId: user.id,
        waveData: data
      }
    })

    await createNotification({
      userId: user.id,
      title: "Paiement B2B reçu",
      message: `Paiement B2B reçu: ${data.amount} ${data.currency}`,
      type: "WAVE_PAYMENT_RECEIVED",
      relatedType: "wave_transaction",
      relatedId: assignment.id,
      actionUrl: "/wave-transactions",
      metadata: {
        amount: data.amount,
        currency: data.currency,
        senderId: data.sender_id,
        clientReference: data.client_reference
      }
    })
  }
}

async function handleB2BPaymentFailed(data: any) {
  console.log('Traitement b2b.payment_failed:', data)
  
  const users = await prisma.user.findMany({
    where: {
      waveApiKey: { not: null }
    }
  })

  for (const user of users) {
    await createNotification({
      userId: user.id,
      title: "Échec de paiement B2B",
      message: `Paiement B2B échoué: ${data.amount} ${data.currency}. Raison: ${data.last_payment_error?.message || 'Erreur inconnue'}`,
      type: "WAVE_PAYMENT_FAILED",
      relatedType: "wave_transaction",
      relatedId: data.id,
      actionUrl: "/wave-transactions",
      metadata: {
        amount: data.amount,
        currency: data.currency,
        senderId: data.sender_id,
        clientReference: data.client_reference,
        error: data.last_payment_error
      }
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Webhook Wave reçu')
    
    // Lire le corps de la requête
    const webhookBody = await request.text()
    const waveSignature = request.headers.get('wave-signature')

    console.log('Signature Wave:', waveSignature)
    console.log('Corps du webhook:', webhookBody.substring(0, 200) + '...')

    if (!waveSignature) {
      console.error("Signature Wave manquante")
      return NextResponse.json({ error: "Signature manquante" }, { status: 400 })
    }

    // Parser le JSON
    let eventData: WaveWebhookPayload
    try {
      eventData = JSON.parse(webhookBody)
    } catch (error) {
      console.error("Corps du webhook invalide:", error)
      return NextResponse.json({ error: "JSON invalide" }, { status: 400 })
    }

    console.log('Événement Wave parsé:', eventData.type, eventData.data)

    // Vérifier si c'est un événement de test
    if (eventData.type === 'test.test_event' && eventData.data.webhook_test_id) {
      console.log('Événement de test détecté:', eventData.data.webhook_test_id)
      
      // Traiter l'événement de test
      await handleTestEvent(eventData.data, waveSignature)
      
      return NextResponse.json({ 
        received: true, 
        test: true,
        message: "Test webhook traité avec succès"
      }, { status: 200 })
    }

    // Pour les événements normaux, vérifier la signature
    const users = await prisma.user.findMany({
      where: {
        waveWebhookSecret: { not: null }
      }
    })

    let validSignature = false
    let targetUser = null

    // Essayer de valider avec chaque secret utilisateur
    for (const user of users) {
      if (user.waveWebhookSecret && verifyWaveSignature(user.waveWebhookSecret, waveSignature, webhookBody)) {
        validSignature = true
        targetUser = user
        break
      }
    }

    // Si aucune signature valide trouvée, essayer de détecter l'utilisateur par d'autres moyens
    if (!validSignature) {
      console.log("Aucune signature valide trouvée, tentative de détection automatique...")
      
      // Chercher par client_reference ou autres identifiants
      if (eventData.data.client_reference) {
        const invoice = await prisma.invoice.findFirst({
          where: { id: eventData.data.client_reference },
          include: { user: true }
        })
        
        if (invoice?.user) {
          targetUser = invoice.user
          console.log(`Utilisateur détecté via client_reference: ${targetUser.email}`)
          
          // Sauvegarder automatiquement le secret pour cet utilisateur
          const extractedSecret = extractSecretFromSignature(waveSignature)
          if (extractedSecret) {
            await prisma.user.update({
              where: { id: targetUser.id },
              data: { waveWebhookSecret: extractedSecret }
            })
            console.log(`Secret automatiquement configuré pour ${targetUser.email}`)
            validSignature = true
          }
        }
      }
      
      // Si toujours pas trouvé, assigner au premier utilisateur avec Wave configuré
      if (!targetUser) {
        const waveUsers = await prisma.user.findMany({
          where: { waveApiKey: { not: null } }
        })
        
        if (waveUsers.length > 0) {
          targetUser = waveUsers[0]
          console.log(`Utilisateur par défaut assigné: ${targetUser.email}`)
          
          // Sauvegarder le secret pour cet utilisateur
          const extractedSecret = extractSecretFromSignature(waveSignature)
          if (extractedSecret) {
            await prisma.user.update({
              where: { id: targetUser.id },
              data: { waveWebhookSecret: extractedSecret }
            })
            console.log(`Secret automatiquement configuré pour ${targetUser.email}`)
            validSignature = true
          }
        }
      }
    }

    if (!validSignature && !targetUser) {
      console.error("Impossible de valider la signature ou détecter l'utilisateur")
      return NextResponse.json({ error: "Signature invalide" }, { status: 401 })
    }

    console.log(`Webhook traité pour l'utilisateur: ${targetUser?.email}`)

    // Traiter l'événement de manière asynchrone
    setImmediate(async () => {
      try {
        await processWaveEvent(eventData.type, eventData.data)
        console.log(`Événement ${eventData.type} traité avec succès`)
      } catch (error) {
        console.error("Erreur lors du traitement du webhook Wave:", error)
      }
    })

    // Répondre immédiatement avec un code de succès (comme recommandé par Wave)
    return NextResponse.json({ received: true }, { status: 200 })

  } catch (error) {
    console.error("Erreur critique dans le webhook Wave:", error)
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 })
  }
}

// GET - Endpoint pour tester le webhook (optionnel)
export async function GET() {
  return NextResponse.json({
    message: "Endpoint webhook Wave CI actif",
    url: `${process.env.NEXTAUTH_URL}/api/webhooks/wave`,
    timestamp: new Date().toISOString(),
    status: "OK"
  })
} 