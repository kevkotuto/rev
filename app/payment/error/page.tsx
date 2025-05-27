"use client"

import { Suspense } from "react"
import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { XCircle, ArrowLeft, RefreshCw, ExternalLink } from "lucide-react"
import { toast } from "sonner"

function PaymentErrorContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [invoice, setInvoice] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const invoiceParam = searchParams.get('invoice')
  const errorType = searchParams.get('type') || 'unknown'

  useEffect(() => {
    const fetchInvoiceDetails = async () => {
      if (!invoiceParam) {
        router.push('/invoices')
        return
      }

      try {
        const response = await fetch(`/api/invoices/${invoiceParam}`)
        if (response.ok) {
          const data = await response.json()
          setInvoice(data)
        } else {
          router.push('/invoices')
        }
      } catch (error) {
        console.error('Erreur:', error)
        router.push('/invoices')
      } finally {
        setLoading(false)
      }
    }

    fetchInvoiceDetails()
  }, [invoiceParam, router])

  const getErrorMessage = (type: string) => {
    switch (type) {
      case 'cancelled':
        return {
          title: 'Paiement annulé',
          description: 'Vous avez annulé le processus de paiement.',
          icon: 'text-orange-600'
        }
      case 'failed':
        return {
          title: 'Paiement échoué',
          description: 'Le paiement n\'a pas pu être traité. Veuillez réessayer.',
          icon: 'text-red-600'
        }
      case 'expired':
        return {
          title: 'Lien expiré',
          description: 'Le lien de paiement a expiré. Veuillez en générer un nouveau.',
          icon: 'text-red-600'
        }
      default:
        return {
          title: 'Erreur de paiement',
          description: 'Une erreur s\'est produite lors du traitement de votre paiement.',
          icon: 'text-red-600'
        }
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const handleRetryPayment = async () => {
    if (!invoice) return

    try {
      const response = await fetch(`/api/invoices/${invoice.id}/payment-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerate: true })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.paymentLink) {
          window.location.href = data.paymentLink
        }
      } else {
        toast.error('Erreur lors de la génération du nouveau lien de paiement')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la génération du nouveau lien de paiement')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-500"></div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">
              Erreur
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p>Facture non trouvée</p>
            <Button 
              onClick={() => router.push('/invoices')} 
              className="mt-4"
            >
              Retour aux factures
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const errorInfo = getErrorMessage(errorType)

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <XCircle className={`w-10 h-10 ${errorInfo.icon}`} />
          </div>
          <CardTitle className={`text-2xl ${errorInfo.icon}`}>
            {errorInfo.title}
          </CardTitle>
          <p className="text-muted-foreground">
            {errorInfo.description}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">Détails de la facture</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Numéro :</span>
                <p className="font-medium">{invoice.invoiceNumber}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Montant :</span>
                <p className="font-medium text-blue-600">{formatCurrency(invoice.amount)}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={() => router.push('/invoices')} 
              variant="outline"
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux factures
            </Button>
            
            <Button 
              onClick={handleRetryPayment}
              className="flex-1"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Réessayer le paiement
            </Button>
          </div>
        </CardContent>
      </Card>
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