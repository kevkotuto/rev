"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { XCircle, ArrowLeft, RefreshCw, ExternalLink } from "lucide-react"
import { motion } from "motion/react"
import { toast } from "sonner"

interface CheckoutSession {
  id: string
  amount: string
  currency: string
  checkout_status: string
  payment_status: string
  transaction_id?: string
  business_name: string
  when_created: string
  when_expires: string
  client_reference?: string
  last_payment_error?: {
    code: string
    message: string
  }
  wave_launch_url: string
}

function CheckoutErrorContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [checkoutSession, setCheckoutSession] = useState<CheckoutSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const transactionId = searchParams.get('transaction_id')
    const sessionId = searchParams.get('session_id')
    
    if (transactionId) {
      fetchCheckoutByTransactionId(transactionId)
    } else if (sessionId) {
      fetchCheckoutById(sessionId)
    } else {
      setLoading(false)
      toast.error("Aucun identifiant de session fourni")
    }
  }, [searchParams])

  const fetchCheckoutByTransactionId = async (transactionId: string) => {
    try {
      const response = await fetch(`/api/wave/checkout/sessions?transaction_id=${encodeURIComponent(transactionId)}`)
      if (response.ok) {
        const data = await response.json()
        setCheckoutSession(data.checkout)
      } else {
        toast.error("Impossible de récupérer les informations de la session")
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error("Erreur lors de la récupération des informations")
    } finally {
      setLoading(false)
    }
  }

  const fetchCheckoutById = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/wave/checkout/sessions/${sessionId}`)
      if (response.ok) {
        const data = await response.json()
        setCheckoutSession(data.checkout)
      } else {
        toast.error("Impossible de récupérer les informations de la session")
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error("Erreur lors de la récupération des informations")
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: string, currency: string) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency === 'XOF' ? 'XOF' : currency,
      minimumFractionDigits: 0,
    }).format(parseFloat(amount))
  }

  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getErrorMessage = (errorCode?: string) => {
    const errorMessages: Record<string, string> = {
      'blocked-account': 'Compte bloqué - Le compte utilisé est temporairement bloqué',
      'cross-border-payment-not-allowed': 'Paiement transfrontalier non autorisé',
      'customer-age-restricted': 'Restriction d\'âge - Le client est mineur ou d\'âge inconnu',
      'insufficient-funds': 'Fonds insuffisants - Le solde du compte est insuffisant',
      'kyb-limits-exceeded': 'Limites de compte dépassées',
      'payer-mobile-mismatch': 'Numéro de téléphone non autorisé pour ce paiement',
      'payment-failure': 'Erreur technique lors du paiement'
    }
    
    return errorMessages[errorCode || ''] || 'Erreur de paiement inconnue'
  }

  const isSessionExpired = () => {
    if (!checkoutSession?.when_expires) return false
    return new Date() > new Date(checkoutSession.when_expires)
  }

  const canRetry = () => {
    return checkoutSession?.checkout_status === 'open' && !isSessionExpired()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Chargement des informations de paiement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-lg border-0">
          <CardHeader className="text-center pb-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4"
            >
              <XCircle className="w-8 h-8 text-red-600" />
            </motion.div>
            <CardTitle className="text-2xl text-red-800">Paiement échoué</CardTitle>
            <CardDescription>
              {isSessionExpired() 
                ? "La session de paiement a expiré"
                : "Une erreur s'est produite lors du paiement"
              }
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {checkoutSession ? (
              <>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Montant</span>
                    <span className="font-semibold text-lg">
                      {formatCurrency(checkoutSession.amount, checkoutSession.currency)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Session</span>
                    <span className="font-mono text-sm">{checkoutSession.id}</span>
                  </div>

                  {checkoutSession.client_reference && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Référence</span>
                      <span className="font-mono text-sm">{checkoutSession.client_reference}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Statut</span>
                    <div className="flex gap-2">
                      <Badge variant="destructive">
                        {checkoutSession.payment_status}
                      </Badge>
                      <Badge variant="outline" className={isSessionExpired() ? "text-orange-600" : ""}>
                        {isSessionExpired() ? "expired" : checkoutSession.checkout_status}
                      </Badge>
                    </div>
                  </div>

                  {checkoutSession.last_payment_error && (
                    <div className="bg-red-50 border border-red-200 rounded p-3">
                      <div className="text-sm font-medium text-red-800 mb-1">
                        Erreur: {checkoutSession.last_payment_error.code}
                      </div>
                      <div className="text-sm text-red-700">
                        {getErrorMessage(checkoutSession.last_payment_error.code)}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Créé le</span>
                    <span className="text-sm">{formatDateTime(checkoutSession.when_created)}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Expire le</span>
                    <span className={`text-sm ${isSessionExpired() ? 'text-red-600 font-medium' : ''}`}>
                      {formatDateTime(checkoutSession.when_expires)}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {canRetry() ? (
                    <Button 
                      onClick={() => window.open(checkoutSession.wave_launch_url, '_blank')}
                      className="w-full"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Réessayer le paiement
                    </Button>
                  ) : (
                    <div className="bg-orange-50 border border-orange-200 rounded p-3">
                      <div className="text-sm text-orange-800">
                        {isSessionExpired() 
                          ? "Cette session a expiré. Vous devez créer une nouvelle session de paiement."
                          : "Cette session n'est plus disponible pour un nouveau paiement."
                        }
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => router.push('/wave-transactions')}
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span className="hidden sm:inline">Transactions</span>
                      <span className="sm:hidden">Trans.</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => router.push('/dashboard')}
                      className="flex items-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span className="hidden sm:inline">Dashboard</span>
                      <span className="sm:hidden">Retour</span>
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                <h3 className="text-lg font-medium mb-2">Session introuvable</h3>
                <p className="text-muted-foreground mb-4">
                  Impossible de récupérer les informations de cette session de paiement.
                </p>
                <div className="space-y-2">
                  <Button onClick={() => router.push('/dashboard')} className="w-full">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Retour au dashboard
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

export default function CheckoutErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Chargement...</p>
        </div>
      </div>
    }>
      <CheckoutErrorContent />
    </Suspense>
  )
} 