"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, ArrowLeft, ExternalLink } from "lucide-react"
import { motion } from "motion/react"
import { toast } from "sonner"

interface CheckoutSession {
  id: string
  amount: string
  currency: string
  checkout_status: string
  payment_status: string
  transaction_id: string
  business_name: string
  when_completed: string
  client_reference?: string
}

function CheckoutSuccessContent() {
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Chargement des informations de paiement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
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
              className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4"
            >
              <CheckCircle className="w-8 h-8 text-green-600" />
            </motion.div>
            <CardTitle className="text-2xl text-green-800">Paiement réussi !</CardTitle>
            <CardDescription>
              Votre paiement a été traité avec succès
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {checkoutSession ? (
              <>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Montant</span>
                    <span className="font-semibold text-lg text-green-600">
                      {formatCurrency(checkoutSession.amount, checkoutSession.currency)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">ID de transaction</span>
                    <span className="font-mono text-sm">{checkoutSession.transaction_id}</span>
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
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        {checkoutSession.payment_status}
                      </Badge>
                      <Badge variant="outline">
                        {checkoutSession.checkout_status}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Date</span>
                    <span className="text-sm">{formatDateTime(checkoutSession.when_completed)}</span>
                  </div>

                  {checkoutSession.business_name && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Entreprise</span>
                      <span className="text-sm font-medium">{checkoutSession.business_name}</span>
                    </div>
                  )}
                </div>

                <div className="text-center text-sm text-muted-foreground">
                  Vous devriez recevoir une confirmation par SMS de Wave
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Paiement confirmé mais impossible de récupérer les détails
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => router.push('/wave-transactions')}
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Transactions
              </Button>
              
              <Button
                onClick={() => router.push('/dashboard')}
                className="flex-1"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Chargement...</p>
        </div>
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  )
} 