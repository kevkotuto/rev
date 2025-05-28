"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, ArrowLeft, RefreshCw, ExternalLink, Phone } from "lucide-react"
import { formatCurrency } from "@/lib/format"
import { toast } from "sonner"

interface PaymentError {
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
  error_code?: string
  error_message?: string
  client_reference?: string
}

const ERROR_MESSAGES = {
  'INSUFFICIENT_FUNDS': 'Solde insuffisant',
  'INVALID_PHONE': 'Numéro de téléphone invalide',
  'LIMIT_EXCEEDED': 'Limite de transaction dépassée',
  'NETWORK_ERROR': 'Erreur de réseau',
  'TIMEOUT': 'Délai d\'attente dépassé',
  'CANCELLED': 'Paiement annulé par l\'utilisateur',
  'FRAUD_DETECTED': 'Activité suspecte détectée',
  'MERCHANT_ERROR': 'Erreur du marchand'
}

function PaymentErrorContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [paymentError, setPaymentError] = useState<PaymentError | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPaymentDetails = async () => {
      try {
        setLoading(true)
        
        // Récupérer les paramètres de l'URL
        const invoiceId = searchParams.get('invoice_id')
        const errorCode = searchParams.get('error_code')
        const errorMessage = searchParams.get('error_message')
        const clientReference = searchParams.get('client_reference')
        const amount = searchParams.get('amount')
        const currency = searchParams.get('currency') || 'XOF'
        
        if (invoiceId) {
          // Si on a un ID de facture, récupérer les détails
          const response = await fetch(`/api/invoices/${invoiceId}`)
          if (response.ok) {
            const invoice = await response.json()
            setPaymentError({
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
              error_code: errorCode || undefined,
              error_message: errorMessage || undefined,
              client_reference: clientReference || undefined
            })
          }
        } else {
          // Paiement générique
          setPaymentError({
            type: 'generic_payment',
            amount: amount || '0',
            currency,
            error_code: errorCode || undefined,
            error_message: errorMessage || undefined,
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

  const getErrorMessage = (errorCode?: string) => {
    return ERROR_MESSAGES[errorCode as keyof typeof ERROR_MESSAGES] || 'Erreur de paiement inconnue'
  }

  const getErrorSeverity = (errorCode?: string) => {
    const criticalErrors = ['FRAUD_DETECTED', 'LIMIT_EXCEEDED']
    const warningErrors = ['INSUFFICIENT_FUNDS', 'INVALID_PHONE']
    
    if (criticalErrors.includes(errorCode || '')) return 'critical'
    if (warningErrors.includes(errorCode || '')) return 'warning'
    return 'error'
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'warning': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'error': return 'bg-red-50 text-red-700 border-red-100'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const handleRetryPayment = () => {
    if (paymentError?.invoice?.id) {
      router.push(`/invoices?retry=${paymentError.invoice.id}`)
    } else {
      router.push('/wave-transactions')
    }
  }

  const handleContactSupport = () => {
    const subject = encodeURIComponent(`Erreur de paiement - ${paymentError?.error_code || 'UNKNOWN'}`)
    const body = encodeURIComponent(`
Bonjour,

J'ai rencontré une erreur lors d'un paiement :

- Référence : ${paymentError?.client_reference || 'N/A'}
- Montant : ${paymentError?.amount} ${paymentError?.currency}
- Code d'erreur : ${paymentError?.error_code || 'N/A'}
- Message : ${paymentError?.error_message || 'N/A'}
${paymentError?.invoice ? `- Facture : ${paymentError.invoice.invoiceNumber}` : ''}

Merci de votre aide.
    `)
    
    window.location.href = `mailto:support@example.com?subject=${subject}&body=${body}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-500"></div>
      </div>
    )
  }

  if (!paymentError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">Erreur inconnue</h3>
            <p className="text-muted-foreground mb-4">
              Impossible de récupérer les détails de l'erreur de paiement.
            </p>
            <Button onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour au dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const severity = getErrorSeverity(paymentError.error_code)

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Échec du paiement</h1>
          <p className="text-gray-600">
            Votre paiement n'a pas pu être traité
          </p>
        </div>

        {/* Détails de l'erreur */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Détails de l'erreur
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`p-4 rounded-lg border ${getSeverityColor(severity)}`}>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-white">
                  {paymentError.error_code || 'UNKNOWN_ERROR'}
                </Badge>
                <span className="font-medium">
                  {getErrorMessage(paymentError.error_code)}
                </span>
              </div>
              {paymentError.error_message && (
                <p className="text-sm opacity-90">
                  {paymentError.error_message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Montant :</span>
                <p className="font-medium">{formatCurrency(parseFloat(paymentError.amount))}</p>
              </div>
              {paymentError.client_reference && (
                <div>
                  <span className="text-muted-foreground">Référence :</span>
                  <p className="font-medium">{paymentError.client_reference}</p>
                </div>
              )}
            </div>

            {paymentError.invoice && (
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Informations de la facture</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Numéro :</span>
                    <p className="font-medium">{paymentError.invoice.invoiceNumber}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type :</span>
                    <p className="font-medium">
                      {paymentError.invoice.type === 'INVOICE' ? 'Facture' : 'Proforma'}
                    </p>
                  </div>
                  {paymentError.invoice.clientName && (
                    <div>
                      <span className="text-muted-foreground">Client :</span>
                      <p className="font-medium">{paymentError.invoice.clientName}</p>
                    </div>
                  )}
                  {paymentError.invoice.project && (
                    <div>
                      <span className="text-muted-foreground">Projet :</span>
                      <p className="font-medium">{paymentError.invoice.project.name}</p>
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
              <Button 
                onClick={handleRetryPayment}
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Réessayer le paiement
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleContactSupport}
                className="w-full"
              >
                <Phone className="w-4 h-4 mr-2" />
                Contacter le support
              </Button>
              
              <Button 
                variant="ghost" 
                onClick={() => router.push('/dashboard')}
                className="w-full sm:col-span-2"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour au dashboard
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Informations supplémentaires */}
        <Card>
          <CardContent className="pt-6">
            <h4 className="font-medium mb-3">Que faire ensuite ?</h4>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium flex-shrink-0">1</div>
                <p>Vérifiez les détails de votre paiement et votre solde</p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium flex-shrink-0">2</div>
                <p>Réessayez le paiement en cliquant sur "Réessayer"</p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium flex-shrink-0">3</div>
                <p>Si le problème persiste, contactez notre support technique</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function PaymentErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-500"></div>
      </div>
    }>
      <PaymentErrorContent />
    </Suspense>
  )
} 