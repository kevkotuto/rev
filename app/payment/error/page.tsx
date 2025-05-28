"use client"

import { useEffect, useState } from "react"
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
  'insufficient_funds': 'Fonds insuffisants sur votre compte Wave',
  'invalid_phone': 'Numéro de téléphone invalide',
  'transaction_failed': 'La transaction a échoué',
  'network_error': 'Erreur de réseau, veuillez réessayer',
  'timeout': 'La transaction a expiré',
  'cancelled': 'Paiement annulé par l\'utilisateur',
  'invalid_amount': 'Montant invalide',
  'account_blocked': 'Compte temporairement bloqué',
  'daily_limit_exceeded': 'Limite quotidienne dépassée',
  'default': 'Une erreur est survenue lors du paiement'
}

export default function PaymentErrorPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [paymentError, setPaymentError] = useState<PaymentError | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPaymentDetails = async () => {
      try {
        const type = searchParams.get('type')
        const amount = searchParams.get('amount')
        const currency = searchParams.get('currency') || 'XOF'
        const invoiceId = searchParams.get('invoice')
        const errorCode = searchParams.get('error_code')
        const errorMessage = searchParams.get('error_message')
        const clientReference = searchParams.get('client_reference')

        let details: PaymentError = {
          type: type || 'payment',
          amount: amount || '0',
          currency,
          error_code: errorCode || undefined,
          error_message: errorMessage || undefined,
          client_reference: clientReference || undefined
        }

        // Si c'est un paiement de facture, récupérer les détails
        if (invoiceId) {
          try {
            const response = await fetch(`/api/invoices/${invoiceId}`)
            if (response.ok) {
              const invoice = await response.json()
              details.invoice = invoice
              details.amount = invoice.amount.toString()
            }
          } catch (error) {
            console.error('Erreur lors du chargement de la facture:', error)
          }
        }

        setPaymentError(details)
      } catch (error) {
        console.error('Erreur lors du chargement des détails:', error)
        toast.error('Erreur lors du chargement des détails du paiement')
      } finally {
        setLoading(false)
      }
    }

    fetchPaymentDetails()
  }, [searchParams])

  const getErrorMessage = (errorCode?: string) => {
    if (!errorCode) return ERROR_MESSAGES.default
    return ERROR_MESSAGES[errorCode as keyof typeof ERROR_MESSAGES] || ERROR_MESSAGES.default
  }

  const getErrorSeverity = (errorCode?: string) => {
    const criticalErrors = ['account_blocked', 'invalid_phone', 'invalid_amount']
    const warningErrors = ['insufficient_funds', 'daily_limit_exceeded']
    
    if (criticalErrors.includes(errorCode || '')) return 'critical'
    if (warningErrors.includes(errorCode || '')) return 'warning'
    return 'error'
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'warning': return 'bg-orange-100 text-orange-800 border-orange-200'
      default: return 'bg-red-100 text-red-800 border-red-200'
    }
  }

  const handleRetryPayment = () => {
    if (paymentError?.invoice) {
      router.push(`/invoices/${paymentError.invoice.id}`)
    } else {
      router.push('/invoices')
    }
  }

  const handleContactSupport = () => {
    // Ouvrir WhatsApp ou email de support
    const message = encodeURIComponent(
      `Bonjour, j'ai rencontré un problème lors d'un paiement Wave.\n\n` +
      `Détails:\n` +
      `- Montant: ${formatCurrency(parseFloat(paymentError?.amount || '0'))}\n` +
      `- Code d'erreur: ${paymentError?.error_code || 'Non spécifié'}\n` +
      `- Référence: ${paymentError?.client_reference || 'Non spécifiée'}\n\n` +
      `Pouvez-vous m'aider à résoudre ce problème ?`
    )
    
    // Remplacer par votre numéro WhatsApp de support
    const whatsappUrl = `https://wa.me/+2250000000000?text=${message}`
    window.open(whatsappUrl, '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-500"></div>
      </div>
    )
  }

  const severity = getErrorSeverity(paymentError?.error_code)

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Icône d'erreur */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Paiement échoué</h1>
          <p className="text-gray-600 mt-2">
            Une erreur est survenue lors du traitement de votre paiement
          </p>
        </div>

        {/* Détails de l'erreur */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              Détails de l'erreur
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`p-3 rounded-lg border ${getSeverityColor(severity)}`}>
              <p className="font-medium">
                {getErrorMessage(paymentError?.error_code)}
              </p>
              {paymentError?.error_message && (
                <p className="text-sm mt-1 opacity-80">
                  {paymentError.error_message}
                </p>
              )}
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Montant</span>
              <span className="font-semibold text-lg">
                {formatCurrency(parseFloat(paymentError?.amount || '0'))}
              </span>
            </div>

            {paymentError?.error_code && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Code d'erreur</span>
                <Badge variant="outline" className="font-mono text-xs">
                  {paymentError.error_code}
                </Badge>
              </div>
            )}

            {paymentError?.client_reference && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Référence</span>
                <Badge variant="secondary" className="font-mono text-xs">
                  {paymentError.client_reference}
                </Badge>
              </div>
            )}

            {paymentError?.invoice && (
              <>
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Facture concernée</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Numéro</span>
                      <span className="font-medium">{paymentError.invoice.invoiceNumber}</span>
                    </div>
                    
                    {paymentError.invoice.clientName && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Client</span>
                        <span className="font-medium">{paymentError.invoice.clientName}</span>
                      </div>
                    )}

                    {paymentError.invoice.project && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Projet</span>
                        <span className="font-medium">{paymentError.invoice.project.name}</span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Type</span>
                      <Badge variant={paymentError.invoice.type === 'INVOICE' ? 'default' : 'secondary'}>
                        {paymentError.invoice.type === 'INVOICE' ? 'Facture' : 'Proforma'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Solutions suggérées */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-800 text-sm">Solutions suggérées</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-blue-700 space-y-2">
              {paymentError?.error_code === 'insufficient_funds' && (
                <>
                  <li>• Vérifiez le solde de votre compte Wave</li>
                  <li>• Rechargez votre compte si nécessaire</li>
                </>
              )}
              {paymentError?.error_code === 'invalid_phone' && (
                <>
                  <li>• Vérifiez que votre numéro Wave est correct</li>
                  <li>• Assurez-vous que votre compte Wave est actif</li>
                </>
              )}
              {paymentError?.error_code === 'daily_limit_exceeded' && (
                <>
                  <li>• Attendez le lendemain pour réessayer</li>
                  <li>• Contactez Wave pour augmenter vos limites</li>
                </>
              )}
              {paymentError?.error_code === 'network_error' && (
                <>
                  <li>• Vérifiez votre connexion internet</li>
                  <li>• Réessayez dans quelques minutes</li>
                </>
              )}
              <li>• Contactez notre support si le problème persiste</li>
            </ul>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={handleRetryPayment}
            className="w-full flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Réessayer le paiement
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={() => router.push('/invoices')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </Button>
            
            <Button
              variant="outline"
              onClick={handleContactSupport}
              className="flex items-center gap-2"
            >
              <Phone className="w-4 h-4" />
              Support
            </Button>
          </div>

          <Button
            variant="outline"
            onClick={() => router.push('/wave-transactions')}
            className="w-full flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Voir les transactions Wave
          </Button>
        </div>

        {/* Message d'aide */}
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Besoin d'aide ? Notre équipe support est disponible pour vous assister.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 