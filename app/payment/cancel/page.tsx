"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { XCircle, ArrowLeft, RefreshCw, Home } from "lucide-react"
import { motion } from "motion/react"

function PaymentCancelContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [invoice, setInvoice] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const invoiceId = searchParams.get('invoice')

  useEffect(() => {
    if (invoiceId) {
      fetchInvoiceDetails()
    } else {
      setLoading(false)
    }
  }, [invoiceId])

  const fetchInvoiceDetails = async () => {
    try {
      const response = await fetch(`/api/wave/checkout?invoiceId=${invoiceId}`)
      if (response.ok) {
        const data = await response.json()
        setInvoice(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la facture:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const handleRetryPayment = () => {
    if (invoice?.paymentLink) {
      window.location.href = invoice.paymentLink
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4"
            >
              <XCircle className="w-8 h-8 text-red-600" />
            </motion.div>
            <CardTitle className="text-2xl font-bold text-red-800">
              Paiement Annulé
            </CardTitle>
            <CardDescription className="text-gray-600">
              Votre paiement a été annulé ou a échoué
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {invoice && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gray-50 rounded-lg p-4 space-y-3"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Facture</span>
                  <span className="font-semibold">{invoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Montant</span>
                  <span className="font-bold text-lg text-gray-700">
                    {formatCurrency(invoice.amount)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Statut</span>
                  <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                    Non payé
                  </span>
                </div>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center space-y-4"
            >
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm text-orange-800">
                  <strong>Que s'est-il passé ?</strong>
                </p>
                <p className="text-sm text-orange-700 mt-1">
                  Le paiement a été interrompu. Cela peut arriver si vous avez fermé la fenêtre 
                  de paiement ou si une erreur s'est produite.
                </p>
              </div>
              
              <div className="flex flex-col gap-3">
                {invoice?.paymentLink && (
                  <Button
                    onClick={handleRetryPayment}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Réessayer le paiement
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                  className="w-full"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Retour au tableau de bord
                </Button>
                
                <Button
                  variant="ghost"
                  onClick={() => router.back()}
                  className="w-full"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour à la page précédente
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-center"
            >
              <p className="text-xs text-gray-500">
                Besoin d'aide ? Contactez notre support client
              </p>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

export default function PaymentCancelPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-500"></div>
      </div>
    }>
      <PaymentCancelContent />
    </Suspense>
  )
} 