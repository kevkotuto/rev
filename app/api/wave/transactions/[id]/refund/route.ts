import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Non autorisé" },
        { status: 401 }
      )
    }

    const { transactionId } = await params

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

    // Récupérer les détails de la transaction originale
    const originalAssignment = await prisma.waveTransactionAssignment.findUnique({
      where: {
        userId_transactionId: {
          userId: session.user.id,
          transactionId: transactionId
        }
      }
    })

    if (!originalAssignment) {
      return NextResponse.json(
        { message: "Transaction non trouvée ou non assignée" },
        { status: 404 }
      )
    }

    // Vérifier que c'est une transaction reçue (montant positif)
    if (originalAssignment.amount <= 0) {
      return NextResponse.json(
        { message: "Seules les transactions reçues peuvent être remboursées" },
        { status: 400 }
      )
    }

    // Vérifier si la transaction a un checkout session ID dans waveData
    const waveData = originalAssignment.waveData as any
    let checkoutSessionId = null

    // D'abord essayer de récupérer la session checkout via l'API Wave
    try {
      const checkoutResponse = await fetch(`https://api.wave.com/v1/checkout/sessions?transaction_id=${transactionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.waveApiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (checkoutResponse.ok) {
        const checkoutData = await checkoutResponse.json()
        if (checkoutData && checkoutData.id) {
          checkoutSessionId = checkoutData.id
        }
      }

      // Si pas trouvé par transaction_id, essayer par client_reference
      if (!checkoutSessionId && waveData?.client_reference) {
        const searchResponse = await fetch(`https://api.wave.com/v1/checkout/sessions/search?client_reference=${waveData.client_reference}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${user.waveApiKey}`,
            'Content-Type': 'application/json'
          }
        })

        if (searchResponse.ok) {
          const searchData = await searchResponse.json()
          if (searchData?.result && searchData.result.length > 0) {
            // Prendre la première session trouvée
            checkoutSessionId = searchData.result[0].id
          }
        }
      }
    } catch (error) {
      console.log('Impossible de récupérer la session checkout, utilisation de send-money')
    }

    // Si pas de session checkout trouvée, essayer dans les données locales
    if (!checkoutSessionId) {
      if (waveData?.checkout_session_id) {
        checkoutSessionId = waveData.checkout_session_id
      } else if (waveData?.session_id) {
        checkoutSessionId = waveData.session_id
      } else if (waveData?.id && waveData.id.startsWith('cos-')) {
        checkoutSessionId = waveData.id
      }
    }

    // Si toujours pas de session checkout, utiliser l'ancienne méthode send-money
    if (!checkoutSessionId) {
      return await handleSendMoneyRefund(user.waveApiKey, originalAssignment, transactionId, session.user.id)
    }

    // Appeler l'API Wave checkout refund
    const waveResponse = await fetch(`https://api.wave.com/v1/checkout/sessions/${checkoutSessionId}/refund`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user.waveApiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!waveResponse.ok) {
      const errorData = await waveResponse.json().catch(() => ({}))
      console.error('Erreur Wave Checkout Refund API:', {
        status: waveResponse.status,
        statusText: waveResponse.statusText,
        checkoutSessionId,
        transactionId,
        error: errorData
      })
      
      // Si l'API checkout échoue (404, 409, etc.), essayer avec send-money
      console.log('Tentative de remboursement via send-money...')
      return await handleSendMoneyRefund(user.waveApiKey, originalAssignment, transactionId, session.user.id)
    }

    const refundData = await waveResponse.json()

    // Créer une dépense de remboursement
    const refundExpense = await prisma.expense.create({
      data: {
        description: `Remboursement transaction ${transactionId}`,
        amount: originalAssignment.amount,
        category: "Remboursement client",
        type: "GENERAL",
        notes: `Remboursement de la transaction Wave ${transactionId}`,
        userId: session.user.id,
        ...(originalAssignment.projectId && { projectId: originalAssignment.projectId })
      }
    })

    // Créer l'assignation pour la transaction de remboursement
    await prisma.waveTransactionAssignment.create({
      data: {
        transactionId: refundData.id,
        type: "expense",
        description: `Remboursement transaction ${transactionId}`,
        amount: originalAssignment.amount,
        fee: parseFloat(refundData.fee || "0"),
        currency: originalAssignment.currency,
        timestamp: new Date(),
        counterpartyName: originalAssignment.counterpartyName,
        counterpartyMobile: originalAssignment.counterpartyMobile,
        expenseId: refundExpense.id,
        waveData: refundData,
        userId: session.user.id,
        ...(originalAssignment.projectId && { projectId: originalAssignment.projectId }),
        ...(originalAssignment.clientId && { clientId: originalAssignment.clientId })
      }
    })

    // Créer une notification
    await createNotification({
      userId: session.user.id,
      title: "Transaction remboursée",
      message: `Remboursement de ${originalAssignment.amount} ${originalAssignment.currency} envoyé vers ${originalAssignment.counterpartyMobile}`,
      type: "SUCCESS",
      relatedType: "wave_transaction",
      relatedId: refundData.id,
      actionUrl: "/wave-transactions",
      metadata: {
        amount: originalAssignment.amount,
        currency: originalAssignment.currency,
        recipient: originalAssignment.counterpartyMobile,
        originalTransactionId: transactionId,
        refundTransactionId: refundData.id
      }
    })

    return NextResponse.json({
      success: true,
      refundTransaction: refundData,
      refundExpense,
      message: "Transaction remboursée avec succès"
    })

  } catch (error) {
    console.error("Erreur lors du remboursement:", error)
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

async function handleSendMoneyRefund(
  waveApiKey: string,
  originalAssignment: any,
  transactionId: string,
  userId: string
) {
  // Appeler l'API Wave pour effectuer le remboursement
  const wavePayload = {
    amount: originalAssignment.amount.toString(),
    currency: originalAssignment.currency,
    recipient_mobile: originalAssignment.counterpartyMobile,
    payment_reason: `Remboursement transaction ${transactionId}`,
    client_reference: `refund_${transactionId}`
  }

  const waveResponse = await fetch('https://api.wave.com/v1/send-money', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${waveApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(wavePayload)
  })

  if (!waveResponse.ok) {
    const errorData = await waveResponse.json().catch(() => ({}))
    console.error('Erreur Wave API:', errorData)
    
    return NextResponse.json(
      { message: "Erreur lors du remboursement Wave", error: errorData },
      { status: waveResponse.status }
    )
  }

  const waveData = await waveResponse.json()

  // Créer une dépense de remboursement
  const refundExpense = await prisma.expense.create({
    data: {
      description: `Remboursement transaction ${transactionId}`,
      amount: originalAssignment.amount,
      category: "Remboursement client",
      type: "GENERAL",
      notes: `Remboursement de la transaction Wave ${transactionId}`,
      userId: userId,
      ...(originalAssignment.projectId && { projectId: originalAssignment.projectId })
    }
  })

  // Créer l'assignation pour la transaction de remboursement
  await prisma.waveTransactionAssignment.create({
    data: {
      transactionId: waveData.id,
      type: "expense",
      description: `Remboursement transaction ${transactionId}`,
      amount: originalAssignment.amount,
      fee: parseFloat(waveData.fee || "0"),
      currency: originalAssignment.currency,
      timestamp: new Date(),
      counterpartyName: originalAssignment.counterpartyName,
      counterpartyMobile: originalAssignment.counterpartyMobile,
      expenseId: refundExpense.id,
      waveData: waveData,
      userId: userId,
      ...(originalAssignment.projectId && { projectId: originalAssignment.projectId }),
      ...(originalAssignment.clientId && { clientId: originalAssignment.clientId })
    }
  })

  // Créer une notification
  await createNotification({
    userId: userId,
    title: "Transaction remboursée",
    message: `Remboursement de ${originalAssignment.amount} ${originalAssignment.currency} envoyé vers ${originalAssignment.counterpartyMobile}`,
    type: "SUCCESS",
    relatedType: "wave_transaction",
    relatedId: waveData.id,
    actionUrl: "/wave-transactions",
    metadata: {
      amount: originalAssignment.amount,
      currency: originalAssignment.currency,
      recipient: originalAssignment.counterpartyMobile,
      originalTransactionId: transactionId,
      refundTransactionId: waveData.id
    }
  })

  return NextResponse.json({
    success: true,
    refundTransaction: waveData,
    refundExpense,
    message: "Transaction remboursée avec succès"
  })
} 