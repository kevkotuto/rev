"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, ArrowLeft, Download, ExternalLink } from "lucide-react"
import { toast } from "sonner"

export function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [invoice, setInvoice] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const invoiceParam = searchParams.get('invoice')

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
          toast.error('Facture non trouvée')
          router.push('/invoices')
        }
      } catch (error) {
        console.error('Erreur:', error)
        toast.error('Erreur lors du chargement')
        router.push('/invoices')
      } finally {
        setLoading(false)
      }
    }

    fetchInvoiceDetails()
  }, [invoiceParam, router])

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
          <CardTitle className="text-2xl text-green-800">
            Paiement réussi !
          </CardTitle>
          <p className="text-muted-foreground">
            Votre paiement a été traité avec succès
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Détails de la facture */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">Détails de la facture</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Numéro :</span>
                <p className="font-medium">{invoice.invoiceNumber}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Montant :</span>
                <p className="font-medium text-green-600">{formatCurrency(invoice.amount)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Client :</span>
                <p className="font-medium">{invoice.clientName || 'Client non défini'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Statut :</span>
                <p className="font-medium text-green-600">Payé</p>
              </div>
            </div>
          </div>

          {/* Prochaines étapes */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2 text-blue-800">Prochaines étapes</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Un email de confirmation vous sera envoyé</li>
              <li>• Votre facture sera automatiquement marquée comme payée</li>
              <li>• Vous pouvez télécharger votre reçu de paiement</li>
            </ul>
          </div>

          {/* Actions */}
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
              onClick={() => window.open(`/api/invoices/${invoice.id}/pdf`, '_blank')}
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              Télécharger PDF
            </Button>
            
            <Button 
              onClick={() => window.open('/dashboard', '_blank')}
              variant="outline"
              className="flex-1"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Tableau de bord
            </Button>
          </div>

          {/* Informations de contact */}
          <div className="text-center text-sm text-muted-foreground border-t pt-4">
            <p>
              Des questions ? Contactez-nous à{' '}
              <a href="mailto:support@example.com" className="text-blue-600 hover:underline">
                support@example.com
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 