"use client"

import { Suspense } from "react"
import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, ArrowLeft, Download, ExternalLink, CreditCard } from "lucide-react"
import { toast } from "sonner"

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [invoice, setInvoice] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const invoiceParam = searchParams.get('invoice')
  const paymentType = searchParams.get('type')
  const amount = searchParams.get('amount')
  const currency = searchParams.get('currency')

  useEffect(() => {
    if (paymentType === 'payment_link') {
      // Paiement via lien de paiement générique
      setLoading(false)
    } else if (invoiceParam) {
      // Paiement de facture spécifique
      fetchInvoiceDetails()
    } else {
      // Rediriger vers le tableau de bord si aucune information
      router.push('/dashboard')
    }
  }, [invoiceParam, paymentType, router])

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

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(numAmount)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    )
  }

  // Affichage pour les liens de paiement génériques
  if (paymentType === 'payment_link') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-600">
              Paiement réussi !
            </CardTitle>
            <p className="text-muted-foreground">
              Votre paiement Wave a été traité avec succès.
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3 text-green-800 flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Détails du paiement Wave
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Type :</span>
                  <p className="font-medium">Lien de paiement Wave</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Montant :</span>
                  <p className="font-medium text-green-600">
                    {amount && currency ? formatCurrency(amount) : 'Montant non spécifié'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Statut :</span>
                  <p className="font-medium text-green-600">Payé</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date :</span>
                  <p className="font-medium">{new Date().toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">Que se passe-t-il maintenant ?</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Votre paiement a été confirmé par Wave</li>
                <li>• Une notification a été envoyée au destinataire</li>
                <li>• La transaction apparaîtra dans l'historique Wave</li>
                <li>• Un reçu peut être disponible dans votre compte Wave</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={() => router.push('/dashboard')} 
                variant="outline"
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Tableau de bord
              </Button>
              
              <Button 
                onClick={() => router.push('/wave-transactions')}
                className="flex-1"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Voir les transactions Wave
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Affichage pour les factures spécifiques
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-600">
            Paiement réussi !
          </CardTitle>
          <p className="text-muted-foreground">
            Votre paiement a été traité avec succès.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-3 text-green-800">Détails du paiement</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Facture :</span>
                <p className="font-medium">{invoice.invoiceNumber}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Montant :</span>
                <p className="font-medium text-green-600">{formatCurrency(invoice.amount)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Statut :</span>
                <p className="font-medium text-green-600">Payé</p>
              </div>
              <div>
                <span className="text-muted-foreground">Date :</span>
                <p className="font-medium">{new Date().toLocaleDateString('fr-FR')}</p>
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
              onClick={() => router.push('/dashboard')}
              className="flex-1"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Tableau de bord
            </Button>
          </div>
        </CardContent>
      </Card>
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