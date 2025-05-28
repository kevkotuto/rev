"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, ArrowLeft, Download, Eye, ExternalLink, Mail } from "lucide-react"
import { formatCurrency } from "@/lib/format"
import { toast } from "sonner"

interface PaymentDetails {
  type: string
  amount: string
  currency: string
  invoice?: {
    id: string
    invoiceNumber: string
    type: string
    clientName?: string
    project?: {
      name: string
    }
  }
  transaction_id?: string
  client_reference?: string
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPaymentDetails = async () => {
      try {
        setLoading(true)
        
        // Récupérer les paramètres de l'URL
        const invoiceId = searchParams.get('invoice_id') || searchParams.get('invoice')
        const transactionId = searchParams.get('transaction_id')
        const clientReference = searchParams.get('client_reference')
        const amount = searchParams.get('amount')
        const currency = searchParams.get('currency') || 'XOF'
        
        if (invoiceId) {
          // Si on a un ID de facture, récupérer les détails via la route publique
          const response = await fetch(`/api/invoices/${invoiceId}/public`)
          if (response.ok) {
            const invoice = await response.json()
            
            // Marquer la facture comme payée si elle ne l'est pas déjà
            if (invoice.status === 'PENDING' || invoice.status === 'OVERDUE') {
              try {
                const markPaidResponse = await fetch(`/api/invoices/${invoiceId}/mark-paid-public`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    paymentMethod: 'WAVE',
                    paidDate: new Date().toISOString(),
                    transactionId: transactionId,
                    amount: amount,
                    waveCheckoutId: invoice.waveCheckoutId // Pour la sécurité
                  })
                })
                
                if (markPaidResponse.ok) {
                  const result = await markPaidResponse.json()
                  const updatedInvoice = result.invoice
                  toast.success('Paiement confirmé avec succès')
                  
                  // Utiliser la facture mise à jour
                  setPaymentDetails({
                    type: 'invoice_payment',
                    amount: amount || updatedInvoice.amount.toString(),
                    currency,
                    invoice: {
                      id: updatedInvoice.id,
                      invoiceNumber: updatedInvoice.invoiceNumber,
                      type: updatedInvoice.type,
                      clientName: updatedInvoice.clientName || updatedInvoice.project?.client?.name,
                      project: updatedInvoice.project ? {
                        name: updatedInvoice.project.name
                      } : undefined
                    },
                    transaction_id: transactionId || undefined,
                    client_reference: clientReference || undefined
                  })
                } else {
                  const errorData = await markPaidResponse.json()
                  console.error('Erreur lors du marquage comme payée:', errorData.message)
                  // Utiliser la facture originale même si la mise à jour a échoué
                  setPaymentDetails({
                    type: 'invoice_payment',
                    amount: amount || invoice.amount.toString(),
                    currency,
                    invoice: {
                      id: invoice.id,
                      invoiceNumber: invoice.invoiceNumber,
                      type: invoice.type,
                      clientName: invoice.clientName || invoice.project?.client?.name,
                      project: invoice.project ? {
                        name: invoice.project.name
                      } : undefined
                    },
                    transaction_id: transactionId || undefined,
                    client_reference: clientReference || undefined
                  })
                }
              } catch (markPaidError) {
                console.error('Erreur lors du marquage comme payée:', markPaidError)
                // Continuer avec la facture originale
                setPaymentDetails({
                  type: 'invoice_payment',
                  amount: amount || invoice.amount.toString(),
                  currency,
                  invoice: {
                    id: invoice.id,
                    invoiceNumber: invoice.invoiceNumber,
                    type: invoice.type,
                    clientName: invoice.clientName || invoice.project?.client?.name,
                    project: invoice.project ? {
                      name: invoice.project.name
                    } : undefined
                  },
                  transaction_id: transactionId || undefined,
                  client_reference: clientReference || undefined
                })
              }
            } else {
              // La facture est déjà payée, utiliser ses détails
              setPaymentDetails({
                type: 'invoice_payment',
                amount: amount || invoice.amount.toString(),
                currency,
                invoice: {
                  id: invoice.id,
                  invoiceNumber: invoice.invoiceNumber,
                  type: invoice.type,
                  clientName: invoice.clientName || invoice.project?.client?.name,
                  project: invoice.project ? {
                    name: invoice.project.name
                  } : undefined
                },
                transaction_id: transactionId || undefined,
                client_reference: clientReference || undefined
              })
            }
          }
        } else {
          // Paiement générique
          setPaymentDetails({
            type: 'generic_payment',
            amount: amount || '0',
            currency,
            transaction_id: transactionId || undefined,
            client_reference: clientReference || undefined
          })
        }
      } catch (error) {
        console.error('Erreur lors du chargement des détails de paiement:', error)
        toast.error('Erreur lors du chargement des détails')
      } finally {
        setLoading(false)
      }
    }

    fetchPaymentDetails()
  }, [searchParams])

  const handleDownloadPDF = async () => {
    if (!paymentDetails?.invoice?.id) return

    try {
      // Utiliser la route publique avec le numéro de facture pour la sécurité
      const response = await fetch(`/api/invoices/${paymentDetails.invoice.id}/pdf-public?invoiceNumber=${encodeURIComponent(paymentDetails.invoice.invoiceNumber)}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `${paymentDetails.invoice.invoiceNumber}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('PDF téléchargé avec succès')
      } else {
        toast.error('Erreur lors du téléchargement du PDF')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors du téléchargement')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    )
  }

  if (!paymentDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">Paiement confirmé</h3>
            <p className="text-muted-foreground mb-4">
              Votre paiement a été traité avec succès, mais nous n'avons pas pu récupérer tous les détails.
            </p>
            <p className="text-sm text-muted-foreground">
              Si vous avez des questions, contactez le prestataire qui vous a envoyé ce lien.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Paiement réussi !</h1>
          <p className="text-gray-600">
            Votre paiement a été traité avec succès
          </p>
        </div>

        {/* Détails du paiement */}
        <Card className="border-green-200 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              Détails du paiement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {formatCurrency(parseFloat(paymentDetails.amount))}
              </div>
              <p className="text-green-700 font-medium">Paiement confirmé</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              {paymentDetails.transaction_id && (
                <div>
                  <span className="text-muted-foreground">Transaction ID :</span>
                  <p className="font-medium font-mono">{paymentDetails.transaction_id}</p>
                </div>
              )}
              {paymentDetails.client_reference && (
                <div>
                  <span className="text-muted-foreground">Référence :</span>
                  <p className="font-medium">{paymentDetails.client_reference}</p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Date :</span>
                <p className="font-medium">{new Date().toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Devise :</span>
                <p className="font-medium">{paymentDetails.currency}</p>
              </div>
            </div>

            {paymentDetails.invoice && (
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Informations de la facture</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Numéro :</span>
                    <p className="font-medium">{paymentDetails.invoice.invoiceNumber}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type :</span>
                    <Badge variant={paymentDetails.invoice.type === 'INVOICE' ? 'default' : 'secondary'}>
                      {paymentDetails.invoice.type === 'INVOICE' ? 'Facture' : 'Proforma'}
                    </Badge>
                  </div>
                  {paymentDetails.invoice.clientName && (
                    <div>
                      <span className="text-muted-foreground">Client :</span>
                      <p className="font-medium">{paymentDetails.invoice.clientName}</p>
                    </div>
                  )}
                  {paymentDetails.invoice.project && (
                    <div>
                      <span className="text-muted-foreground">Projet :</span>
                      <p className="font-medium">{paymentDetails.invoice.project.name}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-3 sm:grid-cols-2">
              {paymentDetails.invoice && (
                <Button onClick={handleDownloadPDF} className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger la facture PDF
                </Button>
              )}
              
              <Button 
                variant="outline" 
                onClick={() => window.location.href = 'mailto:support@example.com'}
                className="w-full"
              >
                <Mail className="w-4 h-4 mr-2" />
                Contacter le support
              </Button>
            </div>
            
            {paymentDetails.invoice && (
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Gardez cette page ou téléchargez votre facture comme preuve de paiement
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Message de confirmation */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <h4 className="font-medium mb-2 text-blue-800">Votre paiement est confirmé !</h4>
              <div className="space-y-2 text-sm text-blue-700">
                {paymentDetails.invoice ? (
                  <>
                    <p>✅ Votre facture {paymentDetails.invoice.invoiceNumber} a été payée avec succès</p>
                    <p>📄 Vous pouvez télécharger votre reçu PDF en cliquant sur le bouton ci-dessus</p>
                    <p>📧 Le prestataire a été automatiquement notifié de votre paiement</p>
                    <p>💡 Conservez cette page ou le PDF comme preuve de paiement</p>
                  </>
                ) : (
                  <>
                    <p>✅ Votre paiement a été traité avec succès</p>
                    <p>📧 Un reçu vous sera envoyé par email si configuré</p>
                    <p>💡 Conservez cette page comme preuve de paiement</p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-3">
                Une question sur votre paiement ?
              </p>
              <Button variant="outline" size="sm" onClick={() => window.location.href = 'mailto:support@example.com'}>
                Contacter le support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
} 