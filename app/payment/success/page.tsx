"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Download, ArrowLeft, Receipt } from "lucide-react"
import { motion } from "motion/react"

function PaymentSuccessContent() {
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
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
              className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4"
            >
              <CheckCircle className="w-8 h-8 text-green-600" />
            </motion.div>
            <CardTitle className="text-2xl font-bold text-green-800">
              Paiement Réussi !
            </CardTitle>
            <CardDescription className="text-gray-600">
              Votre paiement a été traité avec succès
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
                  <span className="font-bold text-lg text-green-600">
                    {formatCurrency(invoice.amount)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Statut</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    Payé
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
              <p className="text-sm text-gray-600">
                Un reçu de paiement vous sera envoyé par email sous peu.
              </p>
              
              <div className="flex flex-col gap-3">
                {invoice && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(`/api/invoices/${invoice.invoiceId}/pdf`, '_blank')}
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger la facture
                  </Button>
                )}
                
                <Button
                  onClick={() => router.push('/dashboard')}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour au tableau de bord
                </Button>
              </div>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
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