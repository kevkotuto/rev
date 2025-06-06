"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { FormField, FormError } from "@/components/ui/form-error"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { useFormWithValidation } from "@/hooks/use-form-validation"
import { invoiceSchema, type InvoiceInput } from "@/lib/validations"

// Type pour les formulaires de facture
interface InvoiceFormData {
  type: "INVOICE" | "PROFORMA"
  amount: number
  dueDate?: string
  paidDate?: string
  notes?: string
  clientName?: string
  clientEmail?: string
  clientAddress?: string
  clientPhone?: string
  projectId?: string
  generatePaymentLink: boolean
}
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  Mail, 
  Download, 
  ExternalLink,
  FileText,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  MoreHorizontal,
  Copy,
  RefreshCw,
  Link,
  CreditCard,
  ArrowRight,
  RotateCcw,
  MessageCircle
} from "lucide-react"
import { toast } from "sonner"
import { formatCurrency, formatDate } from "@/lib/format"
import { EmailPreviewDialog } from "@/components/email-preview-dialog"
import { PartialInvoiceConversion } from "@/components/partial-invoice-conversion"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface Invoice {
  id: string
  invoiceNumber: string
  type: "INVOICE" | "PROFORMA"
  amount: number
  status: "PENDING" | "PAID" | "OVERDUE" | "CANCELLED" | "CONVERTED"
  dueDate?: string
  paidDate?: string
  paymentLink?: string
  waveCheckoutId?: string
  notes?: string
  clientName?: string
  clientEmail?: string
  clientAddress?: string
  clientPhone?: string
  project?: {
    id: string
    name: string
    client?: {
      id: string
      name: string
      email?: string
    }
  }
  createdAt: string
  updatedAt: string
}

interface Project {
  id: string
  name: string
  amount: number
  client?: {
    id: string
    name: string
    email?: string
  }
}

interface Client {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  company?: string
}

interface Provider {
  id: string
  name: string
  email?: string
  phone?: string
  role?: string
}

interface PaymentLinkFormData {
  amount: string // Wave utilise des chaînes pour les montants
  currency: "XOF"
  recipient_type: "client" | "provider" | "custom"
  clientId?: string
  providerId?: string
  recipient_name?: string
  recipient_phone?: string
  description: string
  client_reference?: string
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [emailInvoiceId, setEmailInvoiceId] = useState<string>("")
  const [emailInvoiceType, setEmailInvoiceType] = useState<"INVOICE" | "PROFORMA">("INVOICE")
  const [showPaymentLinkDialog, setShowPaymentLinkDialog] = useState(false)
  const [showConvertDialog, setShowConvertDialog] = useState(false)
  const [showPartialConvertDialog, setShowPartialConvertDialog] = useState(false)
  const [showPaymentLinksDialog, setShowPaymentLinksDialog] = useState(false)
  const [convertingInvoice, setConvertingInvoice] = useState<Invoice | null>(null)
  const [partialConvertingInvoice, setPartialConvertingInvoice] = useState<Invoice | null>(null)
  const [createdPaymentLinks, setCreatedPaymentLinks] = useState<Array<{
    id: string
    amount: string
    currency: string
    description: string
    wave_launch_url: string
    client_reference?: string
    created_at: string
    recipient_info?: string
  }>>([])
  const [lastCreatedLink, setLastCreatedLink] = useState<string | null>(null)
  
  // Nouveaux états pour le dialog de partage
  const [showSharePaymentDialog, setShowSharePaymentDialog] = useState(false)
  const [sharePaymentData, setSharePaymentData] = useState<{
    paymentLink: string
    invoice?: Invoice
    amount?: string
    description?: string
  } | null>(null)
  
  // Hook de confirmation
  const { confirm, ConfirmDialog } = useConfirmDialog()

  // États pour les formulaires
  const [formData, setFormData] = useState<InvoiceFormData>({
    type: "INVOICE",
    amount: 0,
    generatePaymentLink: false
  })

  // États pour la validation
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const [paymentLinkForm, setPaymentLinkForm] = useState<PaymentLinkFormData>({
    amount: "",
    currency: "XOF",
    recipient_type: "client",
    description: "",
    client_reference: ""
  })

  const [convertForm, setConvertForm] = useState({
    generatePaymentLink: false,
    paymentMethod: "CASH" as "WAVE" | "CASH" | "BANK_TRANSFER",
    markAsPaid: false,
    paidDate: new Date().toISOString().split('T')[0]
  })

  // Statistiques
  const [stats, setStats] = useState({
    total: 0,
    paid: 0,
    pending: 0,
    overdue: 0,
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0
  })

  useEffect(() => {
    fetchInvoices()
    fetchProjects()
    fetchClients()
    fetchProviders()
  }, [])

  useEffect(() => {
    calculateStats()
  }, [invoices])

  const fetchInvoices = async () => {
    try {
      const response = await fetch('/api/invoices')
      if (response.ok) {
        const data = await response.json()
        setInvoices(data)
      } else {
        toast.error('Erreur lors du chargement des factures')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors du chargement des factures')
    } finally {
      setLoading(false)
    }
  }

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects')
      if (response.ok) {
        const data = await response.json()
        setProjects(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des projets:', error)
    }
  }

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients')
      if (response.ok) {
        const data = await response.json()
        setClients(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des clients:', error)
    }
  }

  const fetchProviders = async () => {
    try {
      const response = await fetch('/api/providers')
      if (response.ok) {
        const data = await response.json()
        setProviders(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des prestataires:', error)
    }
  }

  const calculateStats = () => {
    const total = invoices.length
    const paid = invoices.filter(inv => inv.status === 'PAID').length
    const pending = invoices.filter(inv => inv.status === 'PENDING').length
    const overdue = invoices.filter(inv => inv.status === 'OVERDUE').length
    
    const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0)
    const paidAmount = invoices.filter(inv => inv.status === 'PAID').reduce((sum, inv) => sum + inv.amount, 0)
    const pendingAmount = invoices.filter(inv => inv.status === 'PENDING').reduce((sum, inv) => sum + inv.amount, 0)

    setStats({
      total,
      paid,
      pending,
      overdue,
      totalAmount,
      paidAmount,
      pendingAmount
    })
  }

  const validateForm = (data: InvoiceFormData): string[] => {
    const errors: string[] = []
    
    if (!data.amount || data.amount <= 0) {
      errors.push("Le montant doit être supérieur à 0")
    }
    
    if (!data.projectId && !data.clientName) {
      errors.push("Le nom du client est requis si aucun projet n'est sélectionné")
    }
    
    if (data.clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.clientEmail)) {
      errors.push("Format d'email invalide")
    }
    
    return errors
  }

  const handleCreateInvoice = async () => {
    const errors = validateForm(formData)
    
    if (errors.length > 0) {
      toast.error(errors[0])
      return
    }
    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const newInvoice = await response.json()
        setInvoices([newInvoice, ...invoices])
        setShowCreateDialog(false)
        
        // Si un lien de paiement a été généré, ouvrir le dialog de partage
        if (formData.generatePaymentLink && newInvoice.paymentLink) {
          setSharePaymentData({
            paymentLink: newInvoice.paymentLink,
            invoice: newInvoice,
            amount: newInvoice.amount.toString(),
            description: `Paiement facture ${newInvoice.invoiceNumber}`
          })
          setShowSharePaymentDialog(true)
        }
        
        setFormData({
          type: "INVOICE",
          amount: 0,
          generatePaymentLink: false
        })
        toast.success(`${formData.type === 'PROFORMA' ? 'Proforma' : 'Facture'} créée avec succès`)
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors de la création')
        throw new Error(error.message)
      }
    } catch (error) {
      console.error('Erreur:', error)
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Erreur lors de la création')
    }
  }

  const handleEditInvoice = async () => {
    if (!editingInvoice) return

    const errors = validateForm(formData)
    
    if (errors.length > 0) {
      toast.error(errors[0])
      return
    }

    try {
      const response = await fetch(`/api/invoices/${editingInvoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const updatedInvoice = await response.json()
        setInvoices(invoices.map(inv => inv.id === editingInvoice.id ? updatedInvoice : inv))
        setShowEditDialog(false)
        setEditingInvoice(null)
        toast.success('Facture mise à jour avec succès')
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors de la mise à jour')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const handleDeleteInvoice = async (invoiceId: string) => {
    confirm({
      title: "Supprimer la facture",
      description: "Êtes-vous sûr de vouloir supprimer cette facture ? Cette action ne peut pas être annulée.",
      variant: "destructive",
      confirmText: "Supprimer",
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/invoices/${invoiceId}`, {
            method: 'DELETE'
          })

          if (response.ok) {
            setInvoices(invoices.filter(inv => inv.id !== invoiceId))
            toast.success('Facture supprimée avec succès')
          } else {
            const error = await response.json()
            toast.error(error.message || 'Erreur lors de la suppression')
          }
        } catch (error) {
          console.error('Erreur:', error)
          toast.error('Erreur lors de la suppression')
        }
      }
    })
  }

  const handleMarkAsPaid = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/mark-paid`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: 'CASH',
          paidDate: new Date().toISOString().split('T')[0]
        })
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(result.message)
        fetchInvoices()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors du marquage comme payée')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors du marquage comme payée')
    }
  }

  const handleGeneratePaymentLink = async (invoiceId: string) => {
    try {
      // Récupérer les détails de la facture
      const invoice = invoices.find(inv => inv.id === invoiceId)
      if (!invoice) {
        toast.error('Facture non trouvée')
        return
      }

      // Utiliser le nouveau système de checkout
      const response = await fetch('/api/wave/checkout/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: invoice.amount.toString(),
          currency: 'XOF',
          success_url: `${window.location.origin}/payment/success?invoice=${invoiceId}&amount=${invoice.amount}&currency=XOF`,
          error_url: `${window.location.origin}/payment/error?invoice=${invoiceId}&amount=${invoice.amount}&currency=XOF`,
          client_reference: invoice.invoiceNumber,
          description: `Paiement facture ${invoice.invoiceNumber}`,
          projectId: invoice.project?.id,
          clientId: invoice.project?.client?.id
        })
      })

      if (response.ok) {
        const result = await response.json()
        
        // La réponse de l'API contient { checkout: waveData }
        const waveData = result.checkout || result
        
        toast.success('Lien de paiement généré avec succès')
        
        // Mettre à jour la facture avec le lien de paiement
        await fetch(`/api/invoices/${invoiceId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...invoice,
            paymentLink: waveData.wave_launch_url,
            waveCheckoutId: waveData.id
          })
        })
        
        // Mettre à jour l'état local
        const updatedInvoice = { ...invoice, paymentLink: waveData.wave_launch_url || '', waveCheckoutId: waveData.id }
        setInvoices(invoices.map(inv => inv.id === invoiceId ? updatedInvoice : inv))
        
        // Ouvrir le dialog de partage
        setSharePaymentData({
          paymentLink: waveData.wave_launch_url || '',
          invoice: updatedInvoice,
          amount: invoice.amount.toString(),
          description: `Paiement facture ${invoice.invoiceNumber}`
        })
        setShowSharePaymentDialog(true)
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors de la génération du lien de paiement')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la génération du lien de paiement')
    }
  }

  const handleRegeneratePaymentLink = async (invoiceId: string) => {
    confirm({
      title: "Régénérer le lien de paiement",
      description: "Êtes-vous sûr de vouloir régénérer le lien de paiement ? L'ancien lien ne fonctionnera plus.",
      variant: "default",
      confirmText: "Régénérer",
      onConfirm: async () => {
        try {
          // Récupérer les détails de la facture
          const invoice = invoices.find(inv => inv.id === invoiceId)
          if (!invoice) {
            toast.error('Facture non trouvée')
            return
          }

          // Créer une nouvelle session de checkout
          const response = await fetch('/api/wave/checkout/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: invoice.amount.toString(),
              currency: 'XOF',
              success_url: `${window.location.origin}/payment/success?invoice=${invoiceId}&amount=${invoice.amount}&currency=XOF`,
              error_url: `${window.location.origin}/payment/error?invoice=${invoiceId}&amount=${invoice.amount}&currency=XOF`,
              client_reference: `${invoice.invoiceNumber}-${Date.now()}`, // Ajouter timestamp pour unicité
              description: `Paiement facture ${invoice.invoiceNumber} (nouveau lien)`,
              projectId: invoice.project?.id,
              clientId: invoice.project?.client?.id
            })
          })

          if (response.ok) {
            const result = await response.json()
            
            // La réponse de l'API contient { checkout: waveData }
            const waveData = result.checkout || result
            
            toast.success('Lien de paiement régénéré avec succès')
            
            // Mettre à jour la facture avec le nouveau lien
            await fetch(`/api/invoices/${invoiceId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...invoice,
                paymentLink: waveData.wave_launch_url,
                waveCheckoutId: waveData.id
              })
            })
            
            fetchInvoices()
            
            // Optionnel: ouvrir le nouveau lien
            if (waveData.wave_launch_url) {
              window.open(waveData.wave_launch_url, '_blank')
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
    })
  }

  const copyPaymentLink = async (paymentLink: string) => {
    try {
      await navigator.clipboard.writeText(paymentLink)
      toast.success('Lien de paiement copié dans le presse-papiers')
    } catch (error) {
      toast.error('Erreur lors de la copie du lien')
    }
  }

  const sendViaWhatsApp = (paymentLink: string, invoice: Invoice) => {
    const clientPhone = invoice.clientPhone || invoice.project?.client?.email // Fallback sur email si pas de téléphone
    const clientName = invoice.clientName || invoice.project?.client?.name || 'Cher client'
    
    const message = `Bonjour ${clientName},

Voici le lien de paiement pour votre facture ${invoice.invoiceNumber} d'un montant de ${formatCurrency(invoice.amount)} :

${paymentLink}

Merci de procéder au paiement via Wave CI.

Cordialement`

    const encodedMessage = encodeURIComponent(message)
    const whatsappUrl = clientPhone 
      ? `https://wa.me/${clientPhone.replace(/[^0-9]/g, '')}?text=${encodedMessage}`
      : `https://wa.me/?text=${encodedMessage}`
    
    window.open(whatsappUrl, '_blank')
    toast.success('Message WhatsApp ouvert')
  }

  const sendViaEmail = (paymentLink: string, invoice: Invoice) => {
    const clientEmail = invoice.clientEmail || invoice.project?.client?.email
    const clientName = invoice.clientName || invoice.project?.client?.name || 'Cher client'
    
    const subject = `Facture ${invoice.invoiceNumber} - Lien de paiement`
    const body = `Bonjour ${clientName},

Veuillez trouver ci-dessous le lien de paiement pour votre facture ${invoice.invoiceNumber} d'un montant de ${formatCurrency(invoice.amount)} :

${paymentLink}

Vous pouvez régler cette facture en toute sécurité via Wave CI en cliquant sur le lien ci-dessus.

En cas de question, n'hésitez pas à nous contacter.

Cordialement`

    const mailtoUrl = `mailto:${clientEmail || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.location.href = mailtoUrl
    toast.success('Email de paiement ouvert')
  }

  // Nouvelle fonction pour ouvrir le dialog de partage
  const handleGetPaymentLink = (invoice: Invoice) => {
    if (invoice.paymentLink) {
      setSharePaymentData({
        paymentLink: invoice.paymentLink,
        invoice: invoice,
        amount: invoice.amount.toString(),
        description: `Paiement facture ${invoice.invoiceNumber}`
      })
      setShowSharePaymentDialog(true)
    } else {
      toast.error('Aucun lien de paiement disponible pour cette facture')
    }
  }

  const handleCreatePaymentLink = async () => {
    try {
      // Validation des montants selon la documentation Wave
      const amount = parseFloat(paymentLinkForm.amount)
      if (isNaN(amount) || amount <= 0) {
        toast.error('Le montant doit être un nombre positif')
        return
      }

      // Formatage du montant selon Wave (chaîne sans décimales pour XOF)
      const formattedAmount = Math.round(amount).toString()

      let requestData: any = {
        amount: formattedAmount,
        currency: paymentLinkForm.currency,
        success_url: `${window.location.origin}/payment/success?type=payment_link&amount=${formattedAmount}&currency=${paymentLinkForm.currency}`,
        error_url: `${window.location.origin}/payment/error?type=payment_link&amount=${formattedAmount}&currency=${paymentLinkForm.currency}`,
        description: paymentLinkForm.description,
        client_reference: paymentLinkForm.client_reference || undefined
      }

      // Préparation des informations du destinataire
      let recipientInfo = ''
      
      // Ajouter les informations du destinataire selon le type
      if (paymentLinkForm.recipient_type === 'client' && paymentLinkForm.clientId) {
        const client = clients.find(c => c.id === paymentLinkForm.clientId)
        if (client) {
          requestData.clientId = paymentLinkForm.clientId
          requestData.restrict_payer_mobile = client.phone
          recipientInfo = `Client: ${client.name}${client.company ? ` (${client.company})` : ''}${client.phone ? ` - ${client.phone}` : ''}`
        }
      } else if (paymentLinkForm.recipient_type === 'provider' && paymentLinkForm.providerId) {
        const provider = providers.find(p => p.id === paymentLinkForm.providerId)
        if (provider) {
          requestData.providerId = paymentLinkForm.providerId
          requestData.restrict_payer_mobile = provider.phone
          recipientInfo = `Prestataire: ${provider.name}${provider.role ? ` (${provider.role})` : ''}${provider.phone ? ` - ${provider.phone}` : ''}`
        }
      } else if (paymentLinkForm.recipient_type === 'custom') {
        requestData.restrict_payer_mobile = paymentLinkForm.recipient_phone
        recipientInfo = `Personnalisé: ${paymentLinkForm.recipient_name || 'Non spécifié'}${paymentLinkForm.recipient_phone ? ` - ${paymentLinkForm.recipient_phone}` : ''}`
      }

      const response = await fetch('/api/wave/checkout/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      if (response.ok) {
        const result = await response.json()
        
        // Sauvegarder le lien créé dans l'état local
        const newPaymentLink = {
          id: result.checkout?.id || Date.now().toString(),
          amount: formattedAmount,
          currency: paymentLinkForm.currency,
          description: paymentLinkForm.description,
          wave_launch_url: result.checkout?.wave_launch_url,
          client_reference: paymentLinkForm.client_reference,
          created_at: new Date().toISOString(),
          recipient_info: recipientInfo
        }
        
        setCreatedPaymentLinks(prev => [newPaymentLink, ...prev])
        setLastCreatedLink(result.checkout?.wave_launch_url)
        
        toast.success('Lien de paiement créé avec succès !')
        
        // Ouvrir l'URL Wave dans un nouvel onglet (comme dans wave-transactions)
        if (result.checkout?.wave_launch_url) {
          window.open(result.checkout.wave_launch_url, '_blank')
        }
        
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors de la création du lien de paiement')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la création du lien de paiement')
    }
  }

  const resetPaymentLinkForm = () => {
    setPaymentLinkForm({
      amount: "",
      currency: "XOF",
      recipient_type: "client",
      description: "",
      client_reference: ""
    })
    setLastCreatedLink(null)
  }

  const copyPaymentLinkToClipboard = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link)
      toast.success('Lien copié dans le presse-papiers')
    } catch (error) {
      toast.error('Erreur lors de la copie du lien')
    }
  }

  const deletePaymentLink = (linkId: string) => {
    confirm({
      title: "Supprimer le lien de paiement",
      description: "Êtes-vous sûr de vouloir supprimer ce lien de la liste ? Le lien restera actif sur Wave.",
      variant: "destructive",
      confirmText: "Supprimer",
      onConfirm: () => {
        setCreatedPaymentLinks(prev => prev.filter(link => link.id !== linkId))
        toast.success('Lien supprimé de la liste')
      }
    })
  }

  const handleConvertToInvoice = (proforma: Invoice) => {
    setConvertingInvoice(proforma)
    setShowConvertDialog(true)
  }

  const handlePartialConvert = (proforma: Invoice) => {
    setPartialConvertingInvoice(proforma)
    setShowPartialConvertDialog(true)
  }

  const handleConfirmConversion = async () => {
    if (!convertingInvoice) return

    try {
      const response = await fetch(`/api/invoices/${convertingInvoice.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generatePaymentLink: convertForm.generatePaymentLink,
          paymentMethod: convertForm.paymentMethod,
          markAsPaid: convertForm.markAsPaid,
          paidDate: convertForm.markAsPaid ? convertForm.paidDate : undefined
        })
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(result.message || 'Proforma converti en facture avec succès')
        setShowConvertDialog(false)
        setConvertingInvoice(null)
        fetchInvoices()
        
        if (result.paymentLink) {
          window.open(result.paymentLink, '_blank')
        }
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors de la conversion')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la conversion')
    }
  }

  const handleSendEmail = (invoice: Invoice) => {
    setEmailInvoiceId(invoice.id)
    setEmailInvoiceType(invoice.type)
    setShowEmailDialog(true)
  }

  const handleDownloadPDF = async (invoice: Invoice) => {
    try {
      const endpoint = invoice.type === 'PROFORMA' 
        ? `/api/proformas/${invoice.id}/pdf`
        : `/api/invoices/${invoice.id}/pdf`
      
      const response = await fetch(endpoint)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${invoice.type.toLowerCase()}-${invoice.invoiceNumber}.pdf`
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

  const openEditDialog = (invoice: Invoice) => {
    setEditingInvoice(invoice)
    setFormData({
      type: invoice.type,
      amount: invoice.amount,
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : undefined,
      paidDate: invoice.paidDate ? new Date(invoice.paidDate).toISOString().split('T')[0] : undefined,
      notes: invoice.notes || "",
      clientName: invoice.clientName || "",
      clientEmail: invoice.clientEmail || "",
      clientAddress: invoice.clientAddress || "",
      clientPhone: invoice.clientPhone || "",
      projectId: invoice.project?.id || "",
      generatePaymentLink: !!invoice.paymentLink
    })
    setShowEditDialog(true)
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      PAID: "default",
      PENDING: "secondary", 
      OVERDUE: "destructive",
      CANCELLED: "outline",
      CONVERTED: "default"
    } as const

    const labels = {
      PAID: "Payé",
      PENDING: "En attente",
      OVERDUE: "En retard", 
      CANCELLED: "Annulé",
      CONVERTED: "Convertie"
    }

    return (
      <Badge variant={variants[status as keyof typeof variants] || "outline"}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    )
  }

  const getTypeIcon = (type: string) => {
    return type === 'PROFORMA' ? (
      <FileText className="h-4 w-4 text-blue-600" />
    ) : (
      <DollarSign className="h-4 w-4 text-green-600" />
    )
  }

  // Filtrer les factures
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.project?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.project?.client?.name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter
    const matchesType = typeFilter === "all" || invoice.type === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Chargement des factures...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Factures & Proformas</h1>
          <p className="text-muted-foreground">
            Gérez vos factures et proformas, envoyez-les par email avec PDF
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={() => setShowPaymentLinksDialog(true)}
            disabled={createdPaymentLinks.length === 0}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Mes liens Wave ({createdPaymentLinks.length})
          </Button>
          <Button 
            variant="outline"
            onClick={() => {
              resetPaymentLinkForm()
              setShowPaymentLinkDialog(true)
            }}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Lien de paiement Wave
          </Button>
          <Button onClick={() => {
            setFormData({
              type: "INVOICE",
              amount: 0,
              generatePaymentLink: false
            })
            setShowCreateDialog(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle facture
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.totalAmount)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payées</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.paidAmount)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.pendingAmount)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En retard</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <p className="text-xs text-muted-foreground">
              Nécessitent une attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et recherche */}
      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par numéro, client, projet..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="PENDING">En attente</SelectItem>
                <SelectItem value="PAID">Payé</SelectItem>
                <SelectItem value="OVERDUE">En retard</SelectItem>
                <SelectItem value="CANCELLED">Annulé</SelectItem>
                <SelectItem value="CONVERTED">Convertie</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="INVOICE">Factures</SelectItem>
                <SelectItem value="PROFORMA">Proformas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Liste des factures */}
      <Card>
        <CardHeader>
          <CardTitle>
            Factures ({filteredInvoices.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold">Aucune facture</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchTerm || statusFilter !== "all" || typeFilter !== "all"
                  ? "Aucune facture ne correspond aux critères de recherche."
                  : "Commencez par créer votre première facture."}
              </p>
              {(!searchTerm && statusFilter === "all" && typeFilter === "all") && (
                <Button 
                  className="mt-4" 
                  onClick={() => setShowCreateDialog(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Créer une facture
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    {getTypeIcon(invoice.type)}
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">{invoice.invoiceNumber}</h3>
                        {getStatusBadge(invoice.status)}
                        {invoice.paymentLink && (
                          <div className="flex items-center text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            <CreditCard className="h-3 w-3 mr-1" />
                            Wave
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {invoice.clientName || invoice.project?.client?.name || 'Client non défini'}
                        {invoice.project && (
                          <span className="ml-2">• {invoice.project.name}</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Créé le {formatDate(invoice.createdAt)}
                        {invoice.dueDate && (
                          <span className="ml-2">• Échéance: {formatDate(invoice.dueDate)}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(invoice.amount)}</div>
                      {invoice.paymentLink && (
                        <div className="text-xs text-blue-600">Lien de paiement</div>
                      )}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => window.location.href = `/invoices/${invoice.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Voir détails
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem onClick={() => handleSendEmail(invoice)}>
                          <Mail className="mr-2 h-4 w-4" />
                          Envoyer par email
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownloadPDF(invoice)}>
                          <Download className="mr-2 h-4 w-4" />
                          Télécharger PDF
                        </DropdownMenuItem>

                        {invoice.type === 'PROFORMA' && invoice.status !== 'CONVERTED' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleConvertToInvoice(invoice)}>
                              <ArrowRight className="mr-2 h-4 w-4" />
                              Convertir en facture
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePartialConvert(invoice)}>
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Conversion partielle
                            </DropdownMenuItem>
                          </>
                        )}

                        <DropdownMenuSeparator />

                        {invoice.status !== 'PAID' && invoice.type === 'INVOICE' && (
                          <DropdownMenuItem onClick={() => handleMarkAsPaid(invoice.id)}>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Marquer comme payée
                          </DropdownMenuItem>
                        )}

                        {invoice.type === 'INVOICE' && invoice.status !== 'PAID' && (
                          <DropdownMenuItem onClick={() => handleGeneratePaymentLink(invoice.id)}>
                            <Link className="mr-2 h-4 w-4" />
                            {invoice.paymentLink ? 'Regénérer lien Wave' : 'Générer lien Wave'}
                          </DropdownMenuItem>
                        )}

                        {invoice.paymentLink && (
                          <DropdownMenuItem onClick={() => handleRegeneratePaymentLink(invoice.id)}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Nouveau lien Wave
                          </DropdownMenuItem>
                        )}

                        {invoice.paymentLink && (
                          <>
                            <DropdownMenuItem onClick={() => window.open(invoice.paymentLink, '_blank')}>
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Ouvrir lien de paiement
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => copyPaymentLink(invoice.paymentLink!)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Copier lien de paiement
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleGetPaymentLink(invoice)}>
                              <CreditCard className="mr-2 h-4 w-4" />
                              Obtenir le lien de paiement
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => sendViaWhatsApp(invoice.paymentLink!, invoice)}>
                              <MessageCircle className="mr-2 h-4 w-4" />
                              Envoyer via WhatsApp
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => sendViaEmail(invoice.paymentLink!, invoice)}>
                              <Mail className="mr-2 h-4 w-4" />
                              Envoyer par email
                            </DropdownMenuItem>
                          </>
                        )}

                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem onClick={() => openEditDialog(invoice)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteInvoice(invoice.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de création */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Créer une nouvelle facture</DialogTitle>
            <DialogDescription>
              Créez une facture ou une proforma pour vos clients
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 overflow-y-auto flex-1 pr-2">
            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value: "INVOICE" | "PROFORMA") => 
                  setFormData({...formData, type: value})
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INVOICE">Facture</SelectItem>
                  <SelectItem value="PROFORMA">Proforma</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="project">Projet (optionnel)</Label>
              <Select 
                value={formData.projectId || "none"} 
                onValueChange={(value) => {
                  if (value === "none") {
                    setFormData({
                      ...formData, 
                      projectId: undefined
                    })
                    return
                  }
                  const project = projects.find(p => p.id === value)
                  setFormData({
                    ...formData, 
                    projectId: value || undefined,
                    amount: project ? project.amount : formData.amount,
                    clientName: project?.client?.name || formData.clientName,
                    clientEmail: project?.client?.email || formData.clientEmail
                  })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un projet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun projet</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name} - {formatCurrency(project.amount)}
                      {project.client && ` (${project.client.name})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="amount">Montant</Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                  placeholder="0"
                  className={formData.amount <= 0 ? "border-red-500" : ""}
                />
                {formData.amount <= 0 && (
                  <FormError message="Le montant doit être supérieur à 0" />
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dueDate">Date d'échéance</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate || ""}
                  onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="clientName">Nom du client</Label>
                <Input
                  id="clientName"
                  value={formData.clientName || ""}
                  onChange={(e) => setFormData({...formData, clientName: e.target.value})}
                  placeholder="Nom du client"
                  className={!formData.projectId && !formData.clientName ? "border-red-500" : ""}
                />
                {!formData.projectId && !formData.clientName && (
                  <FormError message="Le nom du client est requis si aucun projet n'est sélectionné" />
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="clientEmail">Email du client</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  value={formData.clientEmail || ""}
                  onChange={(e) => setFormData({...formData, clientEmail: e.target.value})}
                  placeholder="email@client.com"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="clientAddress">Adresse du client</Label>
              <Input
                id="clientAddress"
                value={formData.clientAddress || ""}
                onChange={(e) => setFormData({...formData, clientAddress: e.target.value})}
                placeholder="Adresse complète"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="clientPhone">Téléphone du client</Label>
              <Input
                id="clientPhone"
                value={formData.clientPhone || ""}
                onChange={(e) => setFormData({...formData, clientPhone: e.target.value})}
                placeholder="+225 XX XX XX XX"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes || ""}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Notes additionnelles..."
                rows={3}
              />
            </div>

            {formData.type === "INVOICE" && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="generatePaymentLink"
                  checked={formData.generatePaymentLink}
                  onCheckedChange={(checked) => 
                    setFormData({...formData, generatePaymentLink: checked as boolean})
                  }
                />
                <Label htmlFor="generatePaymentLink">
                  Générer un lien de paiement Wave
                </Label>
              </div>
            )}
          </div>

          <DialogFooter className="flex-shrink-0 mt-4">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleCreateInvoice}
              disabled={!formData.amount || formData.amount <= 0}
            >
              Créer la {formData.type === 'PROFORMA' ? 'proforma' : 'facture'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de modification */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Modifier la facture</DialogTitle>
            <DialogDescription>
              Modifiez les informations de la facture
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 overflow-y-auto flex-1 pr-2">
            <div className="grid gap-2">
              <Label htmlFor="edit-type">Type</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value: "INVOICE" | "PROFORMA") => 
                  setFormData({...formData, type: value})
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INVOICE">Facture</SelectItem>
                  <SelectItem value="PROFORMA">Proforma</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-client">Client (optionnel)</Label>
              <Select 
                value="" 
                onValueChange={(value) => {
                  if (value === "manual") {
                    // Reset to manual entry
                    return
                  }
                  const client = clients.find(c => c.id === value)
                  if (client) {
                    setFormData({
                      ...formData, 
                      projectId: "",
                      clientName: client.name,
                      clientEmail: client.email || "",
                      clientPhone: client.phone || "",
                      clientAddress: client.address || ""
                    })
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Saisie manuelle</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                      {client.company && ` - ${client.company}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-project">Projet (optionnel)</Label>
              <Select 
                value={formData.projectId || "none"} 
                onValueChange={(value) => {
                  if (value === "none") {
                    setFormData({
                      ...formData, 
                      projectId: undefined
                    })
                    return
                  }
                  const project = projects.find(p => p.id === value)
                  setFormData({
                    ...formData, 
                    projectId: value || undefined,
                    amount: project ? project.amount : formData.amount,
                    clientName: project?.client?.name || formData.clientName,
                    clientEmail: project?.client?.email || formData.clientEmail
                  })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un projet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun projet</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name} - {formatCurrency(project.amount)}
                      {project.client && ` (${project.client.name})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-amount">Montant</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-dueDate">Date d'échéance</Label>
                <Input
                  id="edit-dueDate"
                  type="date"
                  value={formData.dueDate || ""}
                  onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-paidDate">Date de paiement (optionnel)</Label>
              <Input
                id="edit-paidDate"
                type="date"
                value={formData.paidDate || ""}
                onChange={(e) => setFormData({...formData, paidDate: e.target.value})}
                placeholder="Date de paiement si la facture est payée"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-clientName">Nom du client</Label>
                <Input
                  id="edit-clientName"
                  value={formData.clientName || ""}
                  onChange={(e) => setFormData({...formData, clientName: e.target.value})}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-clientEmail">Email du client</Label>
                <Input
                  id="edit-clientEmail"
                  type="email"
                  value={formData.clientEmail || ""}
                  onChange={(e) => setFormData({...formData, clientEmail: e.target.value})}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-clientAddress">Adresse du client</Label>
              <Input
                id="edit-clientAddress"
                value={formData.clientAddress || ""}
                onChange={(e) => setFormData({...formData, clientAddress: e.target.value})}
                placeholder="Adresse complète"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-clientPhone">Téléphone du client</Label>
              <Input
                id="edit-clientPhone"
                value={formData.clientPhone || ""}
                onChange={(e) => setFormData({...formData, clientPhone: e.target.value})}
                placeholder="+225 XX XX XX XX"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes || ""}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 mt-4">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleEditInvoice}>
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog d'envoi d'email */}
      <EmailPreviewDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        invoiceId={emailInvoiceId}
        invoiceType={emailInvoiceType}
        onEmailSent={() => {
          setShowEmailDialog(false)
          toast.success('Email envoyé avec succès !')
        }}
      />

      {/* Dialog de création de lien de paiement Wave */}
      <Dialog open={showPaymentLinkDialog} onOpenChange={setShowPaymentLinkDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {lastCreatedLink ? 'Lien de paiement créé !' : 'Créer un lien de paiement Wave'}
            </DialogTitle>
            <DialogDescription>
              {lastCreatedLink 
                ? 'Votre lien de paiement a été créé avec succès. Vous pouvez le copier ou créer un nouveau lien.'
                : 'Générez un lien de paiement Wave pour un client, prestataire ou numéro personnalisé'
              }
            </DialogDescription>
          </DialogHeader>

          {lastCreatedLink ? (
            /* Affichage du lien créé */
            <div className="space-y-4 py-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800">Lien créé avec succès !</span>
                </div>
                <div className="bg-white rounded p-3 mb-3">
                  <p className="text-sm text-muted-foreground mb-1">Lien de paiement :</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-gray-100 p-2 rounded break-all">
                      {lastCreatedLink}
                    </code>
                    <Button 
                      size="sm" 
                      onClick={() => copyPaymentLinkToClipboard(lastCreatedLink)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => window.open(lastCreatedLink, '_blank')}
                    className="flex-1"
                  >
                    <ExternalLink className="mr-2 h-3 w-3" />
                    Ouvrir le lien
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => copyPaymentLinkToClipboard(lastCreatedLink)}
                    className="flex-1"
                  >
                    <Copy className="mr-2 h-3 w-3" />
                    Copier
                  </Button>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setLastCreatedLink(null)
                    resetPaymentLinkForm()
                  }}
                  className="flex-1"
                >
                  Créer un nouveau lien
                </Button>
                <Button 
                  onClick={() => {
                    setShowPaymentLinkDialog(false)
                    resetPaymentLinkForm()
                  }}
                  className="flex-1"
                >
                  Fermer
                </Button>
              </div>
            </div>
          ) : (
            /* Formulaire de création */
            <>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="payment-amount">Montant (XOF)</Label>
                    <Input
                      id="payment-amount"
                      type="number"
                      value={paymentLinkForm.amount}
                      onChange={(e) => setPaymentLinkForm({...paymentLinkForm, amount: e.target.value})}
                      placeholder="Ex: 50000"
                    />
                    <p className="text-xs text-muted-foreground">
                      Les montants en XOF ne peuvent pas avoir de décimales
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="recipient-type">Type de destinataire</Label>
                    <Select 
                      value={paymentLinkForm.recipient_type} 
                      onValueChange={(value: "client" | "provider" | "custom") => 
                        setPaymentLinkForm({
                          ...paymentLinkForm, 
                          recipient_type: value,
                          clientId: "",
                          providerId: "",
                          recipient_name: "",
                          recipient_phone: ""
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client">Client existant</SelectItem>
                        <SelectItem value="provider">Prestataire existant</SelectItem>
                        <SelectItem value="custom">Numéro personnalisé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {paymentLinkForm.recipient_type === 'client' && (
                  <div className="grid gap-2">
                    <Label htmlFor="client-select">Client</Label>
                    <Select 
                      value={paymentLinkForm.clientId || ""} 
                      onValueChange={(value) => setPaymentLinkForm({...paymentLinkForm, clientId: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un client..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.filter(client => client.id && client.id.trim() !== '').map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                            {client.company && ` - ${client.company}`}
                            {client.phone && ` (${client.phone})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {paymentLinkForm.recipient_type === 'provider' && (
                  <div className="grid gap-2">
                    <Label htmlFor="provider-select">Prestataire</Label>
                    <Select 
                      value={paymentLinkForm.providerId || ""} 
                      onValueChange={(value) => setPaymentLinkForm({...paymentLinkForm, providerId: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un prestataire..." />
                      </SelectTrigger>
                      <SelectContent>
                        {providers.filter(provider => provider.id && provider.id.trim() !== '').map((provider) => (
                          <SelectItem key={provider.id} value={provider.id}>
                            {provider.name}
                            {provider.role && ` - ${provider.role}`}
                            {provider.phone && ` (${provider.phone})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {paymentLinkForm.recipient_type === 'custom' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="recipient-name">Nom du destinataire</Label>
                      <Input
                        id="recipient-name"
                        value={paymentLinkForm.recipient_name || ""}
                        onChange={(e) => setPaymentLinkForm({...paymentLinkForm, recipient_name: e.target.value})}
                        placeholder="Nom complet"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="recipient-phone">Numéro de téléphone</Label>
                      <Input
                        id="recipient-phone"
                        value={paymentLinkForm.recipient_phone || ""}
                        onChange={(e) => setPaymentLinkForm({...paymentLinkForm, recipient_phone: e.target.value})}
                        placeholder="+225XXXXXXXX"
                      />
                      <p className="text-xs text-muted-foreground">
                        Format E.164 avec indicatif pays (+225 pour CI)
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="payment-description">Description du paiement</Label>
                  <Textarea
                    id="payment-description"
                    value={paymentLinkForm.description}
                    onChange={(e) => setPaymentLinkForm({...paymentLinkForm, description: e.target.value})}
                    placeholder="Ex: Paiement pour services de développement web"
                    rows={3}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="client-reference">Référence client (optionnel)</Label>
                  <Input
                    id="client-reference"
                    value={paymentLinkForm.client_reference || ""}
                    onChange={(e) => setPaymentLinkForm({...paymentLinkForm, client_reference: e.target.value})}
                    placeholder="Ex: PROJ-2024-001"
                  />
                  <p className="text-xs text-muted-foreground">
                    Référence unique pour corréler ce paiement dans votre système (max 255 caractères)
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowPaymentLinkDialog(false)}>
                  Annuler
                </Button>
                <Button 
                  onClick={handleCreatePaymentLink}
                  disabled={!paymentLinkForm.amount || !paymentLinkForm.description}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Créer le lien de paiement
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      {/* Dialog de conversion */}
      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Convertir en facture</DialogTitle>
            <DialogDescription>
              Convertir le proforma {convertingInvoice?.invoiceNumber} en facture
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="markAsPaid"
                  checked={convertForm.markAsPaid}
                  onCheckedChange={(checked) => 
                    setConvertForm({...convertForm, markAsPaid: checked as boolean})
                  }
                />
                <Label htmlFor="markAsPaid">
                  Marquer comme payée immédiatement
                </Label>
              </div>

              {convertForm.markAsPaid && (
                <div className="grid gap-2">
                  <Label htmlFor="paidDate">Date de paiement</Label>
                  <Input
                    id="paidDate"
                    type="date"
                    value={convertForm.paidDate}
                    onChange={(e) => 
                      setConvertForm({...convertForm, paidDate: e.target.value})
                    }
                  />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="generatePaymentLink"
                  checked={convertForm.generatePaymentLink}
                  onCheckedChange={(checked) => 
                    setConvertForm({...convertForm, generatePaymentLink: checked as boolean})
                  }
                />
                <Label htmlFor="generatePaymentLink">
                  Générer un lien de paiement Wave
                </Label>
              </div>

              {convertForm.generatePaymentLink && (
                <div className="grid gap-2">
                  <Label htmlFor="paymentMethod">Méthode de paiement</Label>
                  <Select 
                    value={convertForm.paymentMethod} 
                    onValueChange={(value: "WAVE" | "CASH" | "BANK_TRANSFER") => 
                      setConvertForm({...convertForm, paymentMethod: value})
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WAVE">Wave</SelectItem>
                      <SelectItem value="CASH">Espèces</SelectItem>
                      <SelectItem value="BANK_TRANSFER">Virement bancaire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm">
                  <strong>Montant:</strong> {convertingInvoice && formatCurrency(convertingInvoice.amount)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Une nouvelle facture sera créée avec ce montant et le proforma sera marqué comme "Convertie".
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConvertDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleConfirmConversion}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Convertir en facture
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de conversion partielle */}
      {partialConvertingInvoice && (
        <PartialInvoiceConversion
          proformaId={partialConvertingInvoice.id}
          isOpen={showPartialConvertDialog}
          onClose={() => {
            setShowPartialConvertDialog(false)
            setPartialConvertingInvoice(null)
          }}
          onSuccess={() => {
            fetchInvoices()
          }}
        />
      )}

      {/* Dialog pour voir tous les liens de paiement créés */}
      <Dialog open={showPaymentLinksDialog} onOpenChange={setShowPaymentLinksDialog}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Mes liens de paiement Wave</DialogTitle>
            <DialogDescription>
              Gérez tous vos liens de paiement Wave créés ({createdPaymentLinks.length} liens)
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2">
            {createdPaymentLinks.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Aucun lien de paiement</h3>
                <p className="text-muted-foreground mb-4">
                  Vous n'avez pas encore créé de liens de paiement Wave.
                </p>
                <Button onClick={() => {
                  setShowPaymentLinksDialog(false)
                  setShowPaymentLinkDialog(true)
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Créer un lien
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {createdPaymentLinks.map((link) => (
                  <Card key={link.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium truncate">{link.description}</h4>
                          <Badge variant="outline">
                            {formatCurrency(parseFloat(link.amount))}
                          </Badge>
                        </div>
                        
                        {link.recipient_info && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {link.recipient_info}
                          </p>
                        )}
                        
                        {link.client_reference && (
                          <p className="text-xs text-muted-foreground mb-2">
                            Réf: {link.client_reference}
                          </p>
                        )}
                        
                        <div className="bg-gray-50 rounded p-2 mb-2">
                          <code className="text-xs break-all">
                            {link.wave_launch_url}
                          </code>
                        </div>
                        
                        <p className="text-xs text-muted-foreground">
                          Créé le {new Date(link.created_at).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      
                      <div className="flex flex-col gap-2 ml-4">
                        <Button 
                          size="sm" 
                          onClick={() => window.open(link.wave_launch_url, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Ouvrir
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => copyPaymentLinkToClipboard(link.wave_launch_url)}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copier
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => deletePaymentLink(link.id)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Suppr.
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="flex-shrink-0 mt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowPaymentLinksDialog(false)
                resetPaymentLinkForm()
                setShowPaymentLinkDialog(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nouveau lien
            </Button>
            <Button onClick={() => setShowPaymentLinksDialog(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de partage de lien de paiement */}
      <Dialog open={showSharePaymentDialog} onOpenChange={setShowSharePaymentDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Partager le lien de paiement</DialogTitle>
            <DialogDescription>
              {sharePaymentData?.invoice
                ? `Partagez le lien de paiement pour la facture ${sharePaymentData.invoice.invoiceNumber}`
                : "Partagez votre lien de paiement Wave"
              }
            </DialogDescription>
          </DialogHeader>

          {sharePaymentData && (
            <div className="space-y-4 py-4">
              {/* Informations sur le paiement */}
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Montant:</span>
                  <span className="font-semibold text-lg">
                    {sharePaymentData.invoice 
                      ? formatCurrency(sharePaymentData.invoice.amount)
                      : `${sharePaymentData.amount} XOF`
                    }
                  </span>
                </div>
                {sharePaymentData.invoice && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Facture:</span>
                      <span className="text-sm">{sharePaymentData.invoice.invoiceNumber}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Client:</span>
                      <span className="text-sm">
                        {sharePaymentData.invoice.clientName || sharePaymentData.invoice.project?.client?.name || 'Non défini'}
                      </span>
                    </div>
                  </>
                )}
                <div className="border-t pt-2 mt-2">
                  <p className="text-xs text-muted-foreground mb-2">Lien de paiement:</p>
                  <div className="bg-white rounded p-2">
                    <code className="text-xs break-all text-wrap">
                      {sharePaymentData.paymentLink}
                    </code>
                  </div>
                </div>
              </div>

              {/* Actions de partage */}
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => copyPaymentLink(sharePaymentData.paymentLink)}
                  className="w-full"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copier le lien
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => window.open(sharePaymentData.paymentLink, '_blank')}
                  className="w-full"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Ouvrir le lien
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {sharePaymentData.invoice && (
                  <>
                    <Button 
                      variant="default"
                      onClick={() => {
                        sendViaWhatsApp(sharePaymentData.paymentLink, sharePaymentData.invoice!)
                        setShowSharePaymentDialog(false)
                      }}
                      className="w-full"
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Envoyer via WhatsApp
                    </Button>
                    
                    <Button 
                      variant="default"
                      onClick={() => {
                        sendViaEmail(sharePaymentData.paymentLink, sharePaymentData.invoice!)
                        setShowSharePaymentDialog(false)
                      }}
                      className="w-full"
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      Envoyer par Email
                    </Button>
                  </>
                )}
              </div>

              {/* Instructions pour le client */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Instructions pour le client:</p>
                    <ul className="text-xs space-y-1 text-blue-700">
                      <li>• Cliquer sur le lien pour accéder au paiement Wave</li>
                      <li>• Suivre les instructions sur la page Wave CI</li>
                      <li>• Le paiement sera confirmé automatiquement</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowSharePaymentDialog(false)}
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation */}
      <ConfirmDialog />
    </div>
  )
}
