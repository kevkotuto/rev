"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, ArrowLeft, Download, Eye, ExternalLink } from "lucide-react"
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

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPaymentDetails = async () => {
      try {
        const type = searchParams.get('type')
        const amount = searchParams.get('amount')
        const currency = searchParams.get('currency') || 'XOF'
        const invoiceId = searchParams.get('invoice')
        const transactionId = searchParams.get('transaction_id')
        const clientReference = searchParams.get('client_reference')

        let details: PaymentDetails = {
          type: type || 'payment',
          amount: amount || '0',
          currency,
          transaction_id: transactionId || undefined,
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

        setPaymentDetails(details)
      } catch (error) {
        console.error('Erreur lors du chargement des détails:', error)
        toast.error('Erreur lors du chargement des détails du paiement')
      } finally {
        setLoading(false)
      }
    }

    fetchPaymentDetails()
  }, [searchParams])

  const handleDownloadPDF = async () => {
    if (!paymentDetails?.invoice) return

    try {
      const endpoint = paymentDetails.invoice.type === 'PROFORMA' 
        ? `/api/proformas/${paymentDetails.invoice.id}/pdf`
        : `/api/invoices/${paymentDetails.invoice.id}/pdf`
      
      const response = await fetch(endpoint)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${paymentDetails.invoice.type.toLowerCase()}-${paymentDetails.invoice.invoiceNumber}.pdf`
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
      toast.error('Erreur lors du téléchargement du PDF')
    }
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
      <div className="max-w-md w-full space-y-6">
        {/* Icône de succès */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Paiement réussi !</h1>
          <p className="text-gray-600 mt-2">
            Votre paiement a été traité avec succès
          </p>
        </div>

        {/* Détails du paiement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Détails du paiement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Montant</span>
              <span className="font-semibold text-lg">
                {formatCurrency(parseFloat(paymentDetails?.amount || '0'))}
              </span>
            </div>

            {paymentDetails?.transaction_id && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">ID Transaction</span>
                <Badge variant="outline" className="font-mono text-xs">
                  {paymentDetails.transaction_id}
                </Badge>
              </div>
            )}

            {paymentDetails?.client_reference && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Référence</span>
                <Badge variant="secondary" className="font-mono text-xs">
                  {paymentDetails.client_reference}
                </Badge>
              </div>
            )}

            {paymentDetails?.invoice && (
              <>
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Facture payée</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Numéro</span>
                      <span className="font-medium">{paymentDetails.invoice.invoiceNumber}</span>
                    </div>
                    
                    {paymentDetails.invoice.clientName && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Client</span>
                        <span className="font-medium">{paymentDetails.invoice.clientName}</span>
                      </div>
                    )}

                    {paymentDetails.invoice.project && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Projet</span>
                        <span className="font-medium">{paymentDetails.invoice.project.name}</span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Type</span>
                      <Badge variant={paymentDetails.invoice.type === 'INVOICE' ? 'default' : 'secondary'}>
                        {paymentDetails.invoice.type === 'INVOICE' ? 'Facture' : 'Proforma'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Statut</span>
                <Badge className="bg-green-100 text-green-800">
                  Paiement confirmé
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          {paymentDetails?.invoice && (
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={handleDownloadPDF}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Télécharger PDF
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/invoices/${paymentDetails.invoice?.id}`)}
                className="flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Voir facture
              </Button>
            </div>
          )}

          <Button
            onClick={() => router.push('/invoices')}
            className="w-full flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour aux factures
          </Button>

          <Button
            variant="outline"
            onClick={() => router.push('/wave-transactions')}
            className="w-full flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Voir les transactions Wave
          </Button>
        </div>

        {/* Message de confirmation */}
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-green-800">
                Un email de confirmation a été envoyé. 
                Vous pouvez fermer cette page en toute sécurité.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 