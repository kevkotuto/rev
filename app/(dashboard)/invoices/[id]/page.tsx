"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft,
  Edit, 
  Mail,
  Download,
  ExternalLink,
  DollarSign,
  Calendar,
  User,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  CreditCard,
  Link,
  Trash2,
  Copy,
  FolderOpen,
  Share2,
  RefreshCw
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { motion } from "motion/react"
import { toast } from "sonner"

interface Invoice {
  id: string
  invoiceNumber: string
  type: "INVOICE" | "PROFORMA"
  amount: number
  status: "PENDING" | "PAID" | "OVERDUE" | "CANCELLED"
  dueDate?: string
  paidDate?: string
  paymentLink?: string
  waveCheckoutId?: string
  notes?: string
  clientName?: string
  clientEmail?: string
  clientAddress?: string
  clientPhone?: string
  createdAt: string
  project?: {
    id: string
    name: string
    client?: {
      id: string
      name: string
      email?: string
    }
  }
  items?: Array<{
    id: string
    name: string
    description?: string
    unitPrice: number
    quantity: number
    unit?: string
    totalPrice: number
  }>
}

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const invoiceId = params.id as string

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [isMarkPaidDialogOpen, setIsMarkPaidDialogOpen] = useState(false)
  const [isGeneratePaymentLinkDialogOpen, setIsGeneratePaymentLinkDialogOpen] = useState(false)
  const [isRegeneratePaymentLinkDialogOpen, setIsRegeneratePaymentLinkDialogOpen] = useState(false)

  const [markPaidForm, setMarkPaidForm] = useState({
    paymentMethod: "CASH",
    paidDate: new Date().toISOString().split('T')[0],
    notes: ""
  })

  useEffect(() => {
    if (invoiceId) {
      fetchInvoice()
    }
  }, [invoiceId])

  const fetchInvoice = async () => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`)
      if (response.ok) {
        const data = await response.json()
        setInvoice(data)
      } else if (response.status === 404) {
        toast.error("Facture non trouvée")
        router.push("/invoices")
      } else {
        toast.error("Erreur lors du chargement de la facture")
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la facture:', error)
      toast.error('Erreur lors du chargement de la facture')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsPaid = async () => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/mark-paid`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(markPaidForm)
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(result.message)
        setIsMarkPaidDialogOpen(false)
        fetchInvoice()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors du marquage comme payée')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors du marquage comme payée')
    }
  }

  const handleGeneratePaymentLink = async () => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/payment-link`, {
        method: 'POST'
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(result.message)
        setIsGeneratePaymentLinkDialogOpen(false)
        fetchInvoice()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors de la génération du lien de paiement')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la génération du lien de paiement')
    }
  }

  const handleDeletePaymentLink = async () => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/payment-link`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(result.message)
        fetchInvoice()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors de la suppression du lien')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la suppression du lien')
    }
  }

  const handleRegeneratePaymentLink = async () => {
    if (!confirm('Êtes-vous sûr de vouloir régénérer le lien de paiement ? L\'ancien lien ne fonctionnera plus.')) return

    try {
      const response = await fetch(`/api/invoices/${invoiceId}/payment-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerate: true })
      })

      if (response.ok) {
        const result = await response.json()
        toast.success('Lien de paiement régénéré avec succès')
        setIsRegeneratePaymentLinkDialogOpen(false)
        fetchInvoice()
        
        // Optionnel: ouvrir le nouveau lien
        if (result.paymentLink) {
          window.open(result.paymentLink, '_blank')
        }
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors de la régénération du lien')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la régénération du lien')
    }
  }

  const handleDownloadPDF = async () => {
    try {
      const endpoint = invoice?.type === 'PROFORMA' 
        ? `/api/proformas/${invoiceId}/pdf`
        : `/api/invoices/${invoiceId}/pdf`
      
      const response = await fetch(endpoint)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${invoice?.type.toLowerCase()}-${invoice?.invoiceNumber}.pdf`
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

  const copyPaymentLink = async () => {
    if (invoice?.paymentLink) {
      try {
        await navigator.clipboard.writeText(invoice.paymentLink)
        toast.success('Lien de paiement copié dans le presse-papiers')
      } catch (error) {
        toast.error('Erreur lors de la copie du lien')
      }
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID': return CheckCircle
      case 'PENDING': return Clock
      case 'OVERDUE': return AlertTriangle
      default: return FileText
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'text-green-600 bg-green-100'
      case 'PENDING': return 'text-yellow-600 bg-yellow-100'
      case 'OVERDUE': return 'text-red-600 bg-red-100'
      case 'CANCELLED': return 'text-gray-600 bg-gray-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PAID': return 'Payée'
      case 'PENDING': return 'En attente'
      case 'OVERDUE': return 'En retard'
      case 'CANCELLED': return 'Annulée'
      default: return status
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-600">Facture non trouvée</p>
        </div>
      </div>
    )
  }

  const StatusIcon = getStatusIcon(invoice.status)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => router.push('/invoices')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux factures
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Actions principales */}
          <Button variant="outline" onClick={handleDownloadPDF}>
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>

          {invoice.paymentLink && (
            <Button variant="outline" onClick={() => window.open(invoice.paymentLink, '_blank')}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Payer
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>Actions</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/invoices?edit=${invoice.id}`)}>
                <Edit className="mr-2 h-4 w-4" />
                Modifier
              </DropdownMenuItem>
              
              <DropdownMenuItem>
                <Mail className="mr-2 h-4 w-4" />
                Envoyer par email
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {invoice.status !== 'PAID' && (
                <DropdownMenuItem onClick={() => setIsMarkPaidDialogOpen(true)}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Marquer comme payée
                </DropdownMenuItem>
              )}

              {invoice.type === 'INVOICE' && invoice.status !== 'PAID' && (
                <DropdownMenuItem onClick={() => setIsGeneratePaymentLinkDialogOpen(true)}>
                  <Link className="mr-2 h-4 w-4" />
                  {invoice.paymentLink ? 'Regénérer lien de paiement' : 'Générer lien de paiement'}
                </DropdownMenuItem>
              )}

              {invoice.paymentLink && (
                <DropdownMenuItem onClick={() => setIsRegeneratePaymentLinkDialogOpen(true)}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Régénérer nouveau lien Wave
                </DropdownMenuItem>
              )}

              {invoice.paymentLink && (
                <>
                  <DropdownMenuItem onClick={copyPaymentLink}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copier lien de paiement
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDeletePaymentLink}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer lien de paiement
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Informations principales */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{invoice.invoiceNumber}</h1>
                <Badge className={`${getStatusColor(invoice.status)} px-3 py-1`}>
                  <StatusIcon className="w-4 h-4 mr-1" />
                  {getStatusLabel(invoice.status)}
                </Badge>
              </div>
              <p className="text-lg text-muted-foreground">
                {invoice.type === 'PROFORMA' ? 'Proforma' : 'Facture'}
                {invoice.project && ` • ${invoice.project.name}`}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{formatCurrency(invoice.amount)}</div>
              {invoice.paymentLink && (
                <div className="text-sm text-blue-600 mt-1">Lien de paiement actif</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-2">Client</h3>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{invoice.clientName || invoice.project?.client?.name || 'Non défini'}</span>
                </div>
                {(invoice.clientEmail || invoice.project?.client?.email) && (
                  <div className="text-sm text-muted-foreground">
                    {invoice.clientEmail || invoice.project?.client?.email}
                  </div>
                )}
                {invoice.clientPhone && (
                  <div className="text-sm text-muted-foreground">{invoice.clientPhone}</div>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-2">Dates</h3>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Créée: {new Date(invoice.createdAt).toLocaleDateString('fr-FR')}</span>
                </div>
                {invoice.dueDate && (
                  <div className="text-sm text-muted-foreground">
                    Échéance: {new Date(invoice.dueDate).toLocaleDateString('fr-FR')}
                  </div>
                )}
                {invoice.paidDate && (
                  <div className="text-sm text-green-600 font-medium">
                    Payée: {new Date(invoice.paidDate).toLocaleDateString('fr-FR')}
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-2">Projet</h3>
              <div className="space-y-1">
                {invoice.project ? (
                  <Button
                    variant="link"
                    className="p-0 h-auto font-normal justify-start"
                    onClick={() => router.push(`/projects/${invoice.project?.id}`)}
                  >
                    <FolderOpen className="h-4 w-4 mr-2" />
                    {invoice.project.name}
                  </Button>
                ) : (
                  <div className="text-sm text-muted-foreground">Aucun projet lié</div>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-2">Paiement</h3>
              <div className="space-y-1">
                {invoice.paymentLink ? (
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-600">Wave CI</span>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">Pas de lien de paiement</div>
                )}
                {invoice.waveCheckoutId && (
                  <div className="text-xs text-muted-foreground">
                    ID: {invoice.waveCheckoutId}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Détails des services/items */}
      {invoice.items && invoice.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Services/Items</CardTitle>
            <CardDescription>Détail des services facturés</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {invoice.items.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <h4 className="font-medium">{item.name}</h4>
                    {item.description && (
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    )}
                    <div className="text-sm text-muted-foreground">
                      {item.quantity} {item.unit || 'unité'}{item.quantity > 1 ? 's' : ''} × {formatCurrency(item.unitPrice)}
                    </div>
                  </div>
                  <div className="font-semibold">{formatCurrency(item.totalPrice)}</div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {invoice.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Dialog marquer comme payée */}
      <Dialog open={isMarkPaidDialogOpen} onOpenChange={setIsMarkPaidDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marquer comme payée</DialogTitle>
            <DialogDescription>
              Confirmez le paiement de la facture {invoice.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="paymentMethod">Méthode de paiement</Label>
              <Select 
                value={markPaidForm.paymentMethod} 
                onValueChange={(value) => setMarkPaidForm({...markPaidForm, paymentMethod: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Espèces</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Virement bancaire</SelectItem>
                  <SelectItem value="WAVE">Wave</SelectItem>
                  <SelectItem value="CHECK">Chèque</SelectItem>
                  <SelectItem value="OTHER">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="paidDate">Date de paiement</Label>
              <Input
                id="paidDate"
                type="date"
                value={markPaidForm.paidDate}
                onChange={(e) => setMarkPaidForm({...markPaidForm, paidDate: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (optionnel)</Label>
              <Textarea
                id="notes"
                value={markPaidForm.notes}
                onChange={(e) => setMarkPaidForm({...markPaidForm, notes: e.target.value})}
                placeholder="Notes sur le paiement..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMarkPaidDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleMarkAsPaid}>
              Marquer comme payée
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog génération lien de paiement */}
      <Dialog open={isGeneratePaymentLinkDialogOpen} onOpenChange={setIsGeneratePaymentLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Générer un lien de paiement Wave</DialogTitle>
            <DialogDescription>
              Créez un lien de paiement sécurisé pour la facture {invoice.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div>
                  <h4 className="font-medium text-yellow-800">Configuration Wave CI requise</h4>
                  <p className="text-sm text-yellow-700">
                    Assurez-vous d'avoir configuré vos clés API Wave CI dans les paramètres.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Montant:</span>
                <span className="font-medium">{formatCurrency(invoice.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Client:</span>
                <span>{invoice.clientName || invoice.project?.client?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Email:</span>
                <span>{invoice.clientEmail || invoice.project?.client?.email || 'Non défini'}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGeneratePaymentLinkDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleGeneratePaymentLink}>
              Générer le lien
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog régénération lien de paiement */}
      <Dialog open={isRegeneratePaymentLinkDialogOpen} onOpenChange={setIsRegeneratePaymentLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Régénérer le lien de paiement Wave</DialogTitle>
            <DialogDescription>
              Créer un nouveau lien de paiement pour la facture {invoice?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <div>
                  <h4 className="font-medium text-orange-800">Attention</h4>
                  <p className="text-sm text-orange-700">
                    L'ancien lien de paiement ne fonctionnera plus après régénération. Assurez-vous d'envoyer le nouveau lien à votre client.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Montant:</span>
                <span className="font-medium">{invoice && formatCurrency(invoice.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Client:</span>
                <span>{invoice?.clientName || invoice?.project?.client?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Lien actuel:</span>
                <span className="text-xs text-blue-600 truncate max-w-48">
                  {invoice?.paymentLink}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRegeneratePaymentLinkDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleRegeneratePaymentLink} variant="destructive">
              <RefreshCw className="mr-2 h-4 w-4" />
              Régénérer le lien
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 