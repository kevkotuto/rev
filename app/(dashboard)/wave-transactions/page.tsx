"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { 
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  Search,
  Calendar,
  RefreshCw,
  CreditCard,
  RotateCcw,
  Plus,
  Eye,
  Trash2,
  DollarSign,
  Users,
  FolderOpen,
  User,
  Building,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Wallet,
  Send,
  UserCheck,
  Ban,
  Phone,
  StopCircle
} from "lucide-react"
import { motion } from "motion/react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface WaveTransaction {
  timestamp: string
  transaction_id: string
  amount: string
  fee: string
  currency: string
  counterparty_name?: string
  counterparty_mobile?: string
  is_reversal?: boolean
  client_reference?: string
  payment_reason?: string
  localAssignment?: {
    id: string
    type: 'revenue' | 'expense'
    description: string
    notes?: string
    project?: { id: string; name: string }
    client?: { id: string; name: string }
    provider?: { id: string; name: string }
    assignedAt: string
  }
}

interface WaveTransactionsResponse {
  page_info: {
    start_cursor: string | null
    end_cursor: string
    has_next_page: boolean
  }
  date: string
  items: WaveTransaction[]
}

interface AssignmentFormData {
  type: 'revenue' | 'expense'
  description: string
  notes: string
  projectId: string
  clientId: string
  providerId: string
  category: string
  invoiceId: string
}

interface WaveBalance {
  balance: string
  currency: string
  account_name: string | null
  account_mobile: string | null
}

interface SendMoneyFormData {
  receive_amount: number
  mobile: string
  name: string
  payment_reason: string
  type: 'provider_payment' | 'client_refund' | 'general_payment'
  providerId: string
  clientId: string
  projectId: string
}

interface CheckoutSessionFormData {
  amount: string
  currency: string
  success_url: string
  error_url: string
  client_reference: string
  restrict_payer_mobile: string
  description: string
  projectId: string
  clientId: string
}

export default function WaveTransactionsPage() {
  const router = useRouter()
  const [transactions, setTransactions] = useState<WaveTransaction[]>([])
  const [pageInfo, setPageInfo] = useState<any>(null)
  const [balance, setBalance] = useState<WaveBalance | null>(null)
  const [loading, setLoading] = useState(false)
  const [balanceLoading, setBalanceLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<"all" | "revenue" | "expense">("all")
  const [assignmentFilter, setAssignmentFilter] = useState<"all" | "assigned" | "unassigned">("all")

  // États pour l'assignation
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<WaveTransaction | null>(null)
  const [assignmentForm, setAssignmentForm] = useState<AssignmentFormData>({
    type: 'revenue',
    description: '',
    notes: '',
    projectId: '',
    clientId: '',
    providerId: '',
    category: 'WAVE_PAYMENT',
    invoiceId: ''
  })

  // États pour l'envoi d'argent
  const [isSendMoneyDialogOpen, setIsSendMoneyDialogOpen] = useState(false)
  const [sendMoneyForm, setSendMoneyForm] = useState<SendMoneyFormData>({
    receive_amount: 0,
    mobile: '',
    name: '',
    payment_reason: '',
    type: 'general_payment',
    providerId: '',
    clientId: '',
    projectId: ''
  })

  // États pour les sessions checkout
  const [isCheckoutDialogOpen, setIsCheckoutDialogOpen] = useState(false)
  const [checkoutForm, setCheckoutForm] = useState<CheckoutSessionFormData>({
    amount: '',
    currency: 'XOF',
    success_url: '',
    error_url: '',
    client_reference: '',
    restrict_payer_mobile: '',
    description: '',
    projectId: '',
    clientId: ''
  })

  // Données pour les selects
  const [projects, setProjects] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [providers, setProviders] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])

  // États pour le suivi des statuts de paiements
  const [paymentStatuses, setPaymentStatuses] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchTransactions()
    fetchBalance()
    fetchSelectData()
  }, [selectedDate])

  // Charger les statuts des paiements récents
  useEffect(() => {
    const loadRecentPaymentStatuses = async () => {
      const recentPayments = transactions.filter(transaction => {
        const amount = parseFloat(transaction.amount)
        if (amount >= 0) return false // Seulement les paiements sortants
        
        const paymentDate = new Date(transaction.timestamp)
        const now = new Date()
        const hoursDiff = (now.getTime() - paymentDate.getTime()) / (1000 * 60 * 60)
        
        // Charger le statut pour les paiements des dernières 24 heures
        return hoursDiff <= 24
      })

      for (const payment of recentPayments) {
        if (!paymentStatuses[payment.transaction_id]) {
          await fetchPaymentStatus(payment.transaction_id)
        }
      }
    }

    if (transactions.length > 0) {
      loadRecentPaymentStatuses()
    }
  }, [transactions])

  const fetchTransactions = async (cursor?: string) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append('date', selectedDate)
      params.append('first', '50')
      if (cursor) params.append('after', cursor)

      const response = await fetch(`/api/wave/transactions?${params.toString()}`)
      if (response.ok) {
        const data: WaveTransactionsResponse = await response.json()
        
        if (cursor) {
          // Pagination - ajouter aux transactions existantes
          setTransactions(prev => [...prev, ...data.items])
        } else {
          // Nouvelle recherche
          setTransactions(data.items)
        }
        
        setPageInfo(data.page_info)
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors du chargement des transactions')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors du chargement des transactions')
    } finally {
      setLoading(false)
    }
  }

  const fetchBalance = async () => {
    try {
      setBalanceLoading(true)
      const response = await fetch('/api/wave/balance')
      if (response.ok) {
        const data = await response.json()
        setBalance(data)
      } else {
        const error = await response.json()
        console.error('Erreur solde:', error)
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setBalanceLoading(false)
    }
  }

  const fetchSelectData = async () => {
    try {
      const [projectsRes, clientsRes, providersRes, invoicesRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/clients'),
        fetch('/api/providers'),
        fetch('/api/invoices?status=PENDING') // Seulement les factures en attente
      ])

      if (projectsRes.ok) setProjects(await projectsRes.json())
      if (clientsRes.ok) setClients(await clientsRes.json())
      if (providersRes.ok) setProviders(await providersRes.json())
      if (invoicesRes.ok) {
        const invoicesData = await invoicesRes.json()
        setInvoices(invoicesData.filter((inv: any) => inv.status === 'PENDING'))
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error)
    }
  }

  const handleAssignTransaction = async () => {
    if (!selectedTransaction) return

    try {
      const requestBody = {
        ...assignmentForm,
        waveTransactionData: selectedTransaction
      }

      // Si une facture est sélectionnée, l'ajouter à la requête
      if (assignmentForm.invoiceId) {
        requestBody.invoiceId = assignmentForm.invoiceId
      }

      const response = await fetch(`/api/wave/transactions/${selectedTransaction.transaction_id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (response.ok) {
        toast.success('Transaction assignée avec succès')
        setIsAssignDialogOpen(false)
        resetAssignmentForm()
        fetchTransactions() // Recharger pour voir l'assignation
        fetchSelectData() // Recharger les factures pour mettre à jour la liste
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors de l\'assignation')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de l\'assignation')
    }
  }

  const handleUnassignTransaction = async (transactionId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette assignation ?')) return

    try {
      const response = await fetch(`/api/wave/transactions/${transactionId}/assign`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Assignation supprimée avec succès')
        fetchTransactions()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la suppression')
    }
  }

  const handleRefundTransaction = async (transactionId: string, amount: string) => {
    const confirmMessage = `Êtes-vous sûr de vouloir rembourser cette transaction de ${formatCurrency(parseFloat(amount))} ?\n\nCette action est irréversible.`
    
    if (!confirm(confirmMessage)) return

    try {
      const response = await fetch(`/api/wave/transactions/${transactionId}/refund`, {
        method: 'POST'
      })

      if (response.ok) {
        toast.success('Transaction remboursée avec succès')
        fetchTransactions()
        fetchBalance() // Mettre à jour le solde
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors du remboursement')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors du remboursement')
    }
  }

  const openAssignDialog = (transaction: WaveTransaction) => {
    setSelectedTransaction(transaction)
    
    // Pré-remplir le formulaire selon le montant
    const amount = parseFloat(transaction.amount)
    const suggestedType = amount > 0 ? 'revenue' : 'expense'
    
    setAssignmentForm({
      type: suggestedType,
      description: transaction.counterparty_name 
        ? `${suggestedType === 'revenue' ? 'Paiement reçu de' : 'Paiement envoyé à'} ${transaction.counterparty_name}`
        : `Transaction Wave ${transaction.transaction_id}`,
      notes: transaction.payment_reason || '',
      projectId: '',
      clientId: '',
      providerId: '',
      category: suggestedType === 'expense' ? 'WAVE_PAYMENT' : '',
      invoiceId: ''
    })
    
    setIsAssignDialogOpen(true)
  }

  const resetAssignmentForm = () => {
    setAssignmentForm({
      type: 'revenue',
      description: '',
      notes: '',
      projectId: '',
      clientId: '',
      providerId: '',
      category: 'WAVE_PAYMENT',
      invoiceId: ''
    })
    setSelectedTransaction(null)
  }

  const openSendMoneyDialog = (type: 'provider_payment' | 'client_refund' | 'general_payment' = 'general_payment') => {
    setSendMoneyForm({
      receive_amount: 0,
      mobile: '',
      name: '',
      payment_reason: type === 'provider_payment' ? 'Paiement prestataire' : 
                     type === 'client_refund' ? 'Remboursement client' : '',
      type,
      providerId: '',
      clientId: '',
      projectId: ''
    })
    setIsSendMoneyDialogOpen(true)
  }

  const resetSendMoneyForm = () => {
    setSendMoneyForm({
      receive_amount: 0,
      mobile: '',
      name: '',
      payment_reason: '',
      type: 'general_payment',
      providerId: '',
      clientId: '',
      projectId: ''
    })
  }

  const openCheckoutDialog = () => {
    const timestamp = Date.now()
    const baseUrl = window.location.origin
    setCheckoutForm({
      amount: '',
      currency: 'XOF',
      success_url: `${baseUrl}/wave-checkout/success?ref=${timestamp}`,
      error_url: `${baseUrl}/wave-checkout/error?ref=${timestamp}`,
      client_reference: `CHK-${timestamp}`,
      restrict_payer_mobile: '',
      description: 'Paiement via Wave Checkout',
      projectId: '',
      clientId: ''
    })
    setIsCheckoutDialogOpen(true)
  }

  const resetCheckoutForm = () => {
    setCheckoutForm({
      amount: '',
      currency: 'XOF',
      success_url: '',
      error_url: '',
      client_reference: '',
      restrict_payer_mobile: '',
      description: '',
      projectId: '',
      clientId: ''
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount)
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

  const getTransactionIcon = (transaction: WaveTransaction) => {
    if (transaction.is_reversal) {
      return <RotateCcw className="h-4 w-4 text-purple-600" />
    }
    const amount = parseFloat(transaction.amount)
    return amount > 0 
      ? <ArrowUpRight className="h-4 w-4 text-green-600" />
      : <ArrowDownLeft className="h-4 w-4 text-red-600" />
  }

  const getTransactionColor = (transaction: WaveTransaction) => {
    if (transaction.is_reversal) return 'bg-purple-100 text-purple-600'
    const amount = parseFloat(transaction.amount)
    return amount > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
  }

  const filteredTransactions = transactions.filter(transaction => {
    const searchQuery = searchTerm.toLowerCase()
    const matchesSearch = !searchQuery || 
      transaction.transaction_id.toLowerCase().includes(searchQuery) ||
      (transaction.counterparty_name?.toLowerCase().includes(searchQuery)) ||
      (transaction.counterparty_mobile?.includes(searchQuery)) ||
      (transaction.localAssignment?.description?.toLowerCase().includes(searchQuery))

    const amount = parseFloat(transaction.amount)
    const transactionType = amount > 0 ? 'revenue' : 'expense'
    const matchesType = typeFilter === "all" || transactionType === typeFilter

    // Une transaction est vraiment assignée seulement si elle a un client ou prestataire
    const isAssigned = !!(transaction.localAssignment?.client || transaction.localAssignment?.provider)
    const matchesAssignment = assignmentFilter === "all" || 
      (assignmentFilter === "assigned" && isAssigned) ||
      (assignmentFilter === "unassigned" && !isAssigned)

    return matchesSearch && matchesType && matchesAssignment
  })

  const handleSendMoney = async () => {
    try {
      const response = await fetch('/api/wave/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...sendMoneyForm,
          receive_amount: Number(sendMoneyForm.receive_amount) // Conversion explicite en nombre
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message)
        setIsSendMoneyDialogOpen(false)
        resetSendMoneyForm()
        fetchTransactions()
        fetchBalance() // Mettre à jour le solde
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors de l\'envoi')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de l\'envoi')
    }
  }

  const handleCancelProviderPayment = async (paymentId: string, providerName: string) => {
    const reason = prompt(`Pourquoi annuler le paiement à ${providerName} ?`)
    if (reason === null) return // Utilisateur a annulé

    try {
      const response = await fetch('/api/wave/cancel-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, reason })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message)
        fetchTransactions()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors de l\'annulation')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de l\'annulation')
    }
  }

  const handleReversePayment = async (transactionId: string, amount: string, timestamp: string, recipientName?: string) => {
    // Vérifier si le paiement est dans la limite de 3 jours
    const paymentDate = new Date(timestamp)
    const now = new Date()
    const daysDiff = (now.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24)
    
    if (daysDiff > 3) {
      toast.error('Le délai de 3 jours pour annuler ce paiement est dépassé')
      return
    }

    const remainingHours = Math.max(0, Math.ceil((3 * 24) - (daysDiff * 24)))
    const confirmMessage = `Êtes-vous sûr de vouloir annuler ce paiement de ${formatCurrency(Math.abs(parseFloat(amount)))} ?\n\n` +
                          `Destinataire: ${recipientName || 'Non spécifié'}\n` +
                          `Temps restant pour l'annulation: ${remainingHours}h\n\n` +
                          `Cette action est irréversible et remboursera le montant + frais.`
    
    if (!confirm(confirmMessage)) return

    try {
      const response = await fetch(`/api/wave/payout/${transactionId}/reverse`, {
        method: 'POST'
      })

      if (response.ok) {
        toast.success('Paiement annulé avec succès. Le remboursement sera traité.')
        fetchTransactions()
        fetchBalance() // Mettre à jour le solde
      } else {
        const error = await response.json()
        
        // Gestion des erreurs spécifiques Wave
        let errorMessage = 'Erreur lors de l\'annulation du paiement'
        switch (error.error_code) {
          case 'insufficient-funds':
            errorMessage = 'Le destinataire n\'a pas suffisamment de fonds pour couvrir l\'annulation'
            break
          case 'payout-reversal-time-limit-exceeded':
            errorMessage = 'Le délai de 3 jours pour annuler ce paiement est dépassé'
            break
          case 'payout-reversal-account-terminated':
            errorMessage = 'Le compte du destinataire a été fermé dans le système Wave'
            break
          case 'not-found':
            errorMessage = 'Paiement non trouvé ou déjà annulé'
            break
          default:
            errorMessage = error.message || error.error_message || errorMessage
        }
        
        toast.error(errorMessage)
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de l\'annulation du paiement')
    }
  }

  const handleCancelPendingPayment = async (transactionId: string, amount: string, recipientName?: string) => {
    const confirmMessage = `Êtes-vous sûr de vouloir renoncer à ce paiement de ${formatCurrency(Math.abs(parseFloat(amount)))} ?\n\n` +
                          `Destinataire: ${recipientName || 'Non spécifié'}\n\n` +
                          `Cette action annulera le paiement en cours de traitement.`
    
    if (!confirm(confirmMessage)) return

    try {
      const response = await fetch(`/api/wave/payout/${transactionId}/cancel`, {
        method: 'POST'
      })

      if (response.ok) {
        toast.success('Paiement annulé avec succès.')
        fetchTransactions()
        fetchBalance() // Mettre à jour le solde
      } else {
        const error = await response.json()
        
        // Gestion des erreurs spécifiques
        let errorMessage = 'Erreur lors de l\'annulation du paiement'
        switch (error.error_code) {
          case 'payout-already-processed':
            errorMessage = 'Le paiement a déjà été traité et ne peut plus être annulé'
            break
          case 'payout-not-cancellable':
            errorMessage = 'Ce paiement ne peut plus être annulé'
            break
          case 'not-found':
            errorMessage = 'Paiement non trouvé'
            break
          default:
            errorMessage = error.message || error.error_message || errorMessage
        }
        
        toast.error(errorMessage)
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de l\'annulation du paiement')
    }
  }

  const handleCreateCheckout = async () => {
    try {
      const response = await fetch('/api/wave/checkout/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkoutForm)
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message)
        
        // Ouvrir l'URL Wave dans un nouvel onglet
        if (data.checkout?.wave_launch_url) {
          window.open(data.checkout.wave_launch_url, '_blank')
        }
        
        setIsCheckoutDialogOpen(false)
        resetCheckoutForm()
        fetchTransactions()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors de la création de la session checkout')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la création de la session checkout')
    }
  }

  // Fonctions d'auto-remplissage
  const handleProviderSelect = (providerId: string) => {
    if (providerId === "none") {
      setSendMoneyForm(prev => ({ ...prev, providerId: "" }))
      return
    }

    const provider = providers.find(p => p.id === providerId)
    if (provider) {
      setSendMoneyForm(prev => ({
        ...prev,
        providerId,
        mobile: provider.phone || prev.mobile,
        name: provider.name || prev.name,
        payment_reason: `Paiement à ${provider.name}`
      }))
    }
  }

  const handleClientSelect = (clientId: string, formType: 'sendMoney' | 'checkout') => {
    if (clientId === "none") {
      if (formType === 'sendMoney') {
        setSendMoneyForm(prev => ({ ...prev, clientId: "" }))
      } else if (formType === 'checkout') {
        setCheckoutForm(prev => ({ ...prev, clientId: "" }))
      }
      return
    }

    const client = clients.find(c => c.id === clientId)
    if (client) {
      if (formType === 'sendMoney') {
        setSendMoneyForm(prev => ({
          ...prev,
          clientId,
          mobile: client.phone || prev.mobile,
          name: client.name || prev.name,
          payment_reason: `Remboursement à ${client.name}`
        }))
      } else if (formType === 'checkout') {
        setCheckoutForm(prev => ({
          ...prev,
          clientId,
          restrict_payer_mobile: client.phone || prev.restrict_payer_mobile,
          description: `Paiement de ${client.name}`,
          client_reference: `${client.name.replace(/\s+/g, '-').toUpperCase()}-${Date.now()}`
        }))
      }
    }
  }

  const handleProjectSelect = (projectId: string, formType: 'sendMoney' | 'checkout') => {
    if (projectId === "none") {
      if (formType === 'sendMoney') {
        setSendMoneyForm(prev => ({ ...prev, projectId: "" }))
      } else if (formType === 'checkout') {
        setCheckoutForm(prev => ({ ...prev, projectId: "" }))
      }
      return
    }

    const project = projects.find(p => p.id === projectId)
    if (project) {
      if (formType === 'sendMoney') {
        setSendMoneyForm(prev => ({
          ...prev,
          projectId,
          payment_reason: prev.payment_reason ? 
            `${prev.payment_reason} - Projet: ${project.name}` : 
            `Paiement pour projet ${project.name}`
        }))
      } else if (formType === 'checkout') {
        setCheckoutForm(prev => ({
          ...prev,
          projectId,
          description: `Paiement pour projet ${project.name}`,
          client_reference: `${project.name.replace(/\s+/g, '-').toUpperCase()}-${Date.now()}`
        }))
      }
    }
  }

  // Fonction pour détecter si une transaction a déjà été remboursée
  const isTransactionRefunded = (transactionId: string) => {
    return transactions.some(t => 
      t.client_reference?.includes(transactionId) && 
      t.payment_reason?.toLowerCase().includes('remboursement')
    )
  }

  // Fonction pour détecter les transactions de remboursement
  const isRefundTransaction = (transaction: WaveTransaction) => {
    // Vérifier d'abord les mots-clés explicites de remboursement
    const hasRefundKeywords = transaction.payment_reason?.toLowerCase().includes('remboursement') ||
                             transaction.payment_reason?.toLowerCase().includes('refund')
    
    // Si c'est explicitement marqué comme remboursement, c'est un remboursement
    if (hasRefundKeywords) return true
    
    // Si c'est une assignation locale de type expense avec des mots-clés de remboursement
    if (transaction.localAssignment?.type === 'expense' && 
        (transaction.localAssignment.description?.toLowerCase().includes('remboursement') ||
         transaction.localAssignment.description?.toLowerCase().includes('refund'))) {
      return true
    }
    
    // Ne pas considérer les paiements prestataires comme des remboursements
    if (transaction.payment_reason?.toLowerCase().includes('paiement') ||
        transaction.payment_reason?.toLowerCase().includes('prestataire') ||
        transaction.payment_reason?.toLowerCase().includes('provider') ||
        transaction.localAssignment?.provider) {
      return false
    }
    
    // Les montants négatifs seuls ne suffisent plus à déterminer un remboursement
    return false
  }

  // Fonction pour vérifier si un paiement peut être annulé
  const canReversePayment = (transaction: WaveTransaction) => {
    const amount = parseFloat(transaction.amount)
    if (amount >= 0) return false // Seulement les paiements sortants (montants négatifs)
    
    if (transaction.is_reversal) return false // Déjà une annulation
    if (isRefundTransaction(transaction)) return false // C'est déjà un remboursement
    
    // Vérifier la limite de 3 jours
    const paymentDate = new Date(transaction.timestamp)
    const now = new Date()
    const daysDiff = (now.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24)
    
    return daysDiff <= 3
  }

  // Fonction pour vérifier si un paiement peut être renoncé (en cours)
  const canCancelPendingPayment = (transaction: WaveTransaction) => {
    const amount = parseFloat(transaction.amount)
    if (amount >= 0) return false // Seulement les paiements sortants
    
    if (transaction.is_reversal) return false // Déjà une annulation
    if (isRefundTransaction(transaction)) return false // C'est déjà un remboursement
    
    // Vérifier si c'est un paiement récent (moins de 30 minutes) qui pourrait être en cours
    const paymentDate = new Date(transaction.timestamp)
    const now = new Date()
    const minutesDiff = (now.getTime() - paymentDate.getTime()) / (1000 * 60)
    
    // Considérer comme potentiellement "en cours" si c'est très récent
    // et que ce n'est pas explicitement marqué comme réussi ou échoué
    const isRecent = minutesDiff <= 30
    const hasProcessingKeywords = transaction.payment_reason?.toLowerCase().includes('traitement') ||
                                 transaction.payment_reason?.toLowerCase().includes('processing') ||
                                 transaction.payment_reason?.toLowerCase().includes('en cours')
    
    // Si on a le statut en cache, l'utiliser
    const cachedStatus = paymentStatuses[transaction.transaction_id]
    if (cachedStatus) {
      return cachedStatus === 'processing'
    }
    
    // Sinon, utiliser l'heuristique : récent ET pas de mots-clés de succès
    return isRecent && !transaction.payment_reason?.toLowerCase().includes('réussi') && 
           !transaction.payment_reason?.toLowerCase().includes('succès') &&
           !transaction.payment_reason?.toLowerCase().includes('completed')
  }

  // Fonction pour récupérer le statut d'un paiement
  const fetchPaymentStatus = async (transactionId: string) => {
    try {
      const response = await fetch(`/api/wave/payout/${transactionId}`)
      if (response.ok) {
        const data = await response.json()
        setPaymentStatuses(prev => ({
          ...prev,
          [transactionId]: data.status
        }))
        return data.status
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du statut:', error)
    }
    return null
  }

  // Fonction pour obtenir le temps restant pour l'annulation
  const getReverseTimeRemaining = (timestamp: string) => {
    const paymentDate = new Date(timestamp)
    const now = new Date()
    const daysDiff = (now.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24)
    const remainingHours = Math.max(0, Math.ceil((3 * 24) - (daysDiff * 24)))
    
    if (remainingHours > 24) {
      return `${Math.ceil(remainingHours / 24)}j`
    } else if (remainingHours > 0) {
      return `${remainingHours}h`
    }
    return 'Expiré'
  }

  // Fonction pour obtenir les actions disponibles pour une transaction
  const getAvailableActions = (transaction: WaveTransaction) => {
    const actions = []
    const amount = parseFloat(transaction.amount)
    const isRefunded = isTransactionRefunded(transaction.transaction_id)
    const isRefund = isRefundTransaction(transaction)
    
    // Vérifier s'il y a plusieurs transactions avec le même transaction_id
    const duplicateTransactions = transactions.filter(t => t.transaction_id === transaction.transaction_id)
    const hasDuplicates = duplicateTransactions.length > 1
    
    // Action d'assignation
    // Une transaction peut être assignée manuellement si elle n'a pas d'assignation du tout,
    // ou si elle a seulement une assignation basique (description seulement) sans client/prestataire
    const hasAnyAssignment = !!transaction.localAssignment
    const hasSpecificAssignment = !!(transaction.localAssignment?.client || transaction.localAssignment?.provider)
    const hasConflict = transaction.localAssignment?.notes === 'CONFLIT_NON_RESOLU' || 
                       (transaction.localAssignment && 
                        typeof transaction.localAssignment === 'object' && 
                        'waveData' in transaction.localAssignment &&
                        (transaction.localAssignment as any).waveData?.conflict?.needsResolution)
    
    if (!hasAnyAssignment || (hasAnyAssignment && !hasSpecificAssignment && !hasConflict)) {
      actions.push({
        type: 'assign',
        label: hasAnyAssignment ? 'Réassigner' : 'Assigner',
        icon: 'Plus',
        variant: 'default' as const
      })
    } else {
      actions.push({
        type: 'unassign',
        label: 'Supprimer',
        icon: 'Trash2',
        variant: 'outline' as const
      })
    }
    
    // Action de remboursement pour les revenus - SEULEMENT si pas de doublons
    if (amount > 0 && !transaction.is_reversal && !isRefunded && !isRefund && !hasDuplicates) {
      actions.push({
        type: 'refund',
        label: 'Rembourser',
        icon: 'RotateCcw',
        variant: 'destructive' as const
      })
    }
    
    // Action de renonciation pour les paiements en cours - SEULEMENT si pas de doublons
    if (canCancelPendingPayment(transaction) && !hasDuplicates) {
      actions.push({
        type: 'cancel_pending',
        label: 'Renoncer',
        icon: 'StopCircle',
        variant: 'destructive' as const
      })
    }
    // Action d'annulation pour les paiements sortants - SEULEMENT si pas de doublons
    else if (canReversePayment(transaction) && !hasDuplicates) {
      const timeRemaining = getReverseTimeRemaining(transaction.timestamp)
      actions.push({
        type: 'reverse',
        label: `Annuler (${timeRemaining})`,
        icon: 'Ban',
        variant: 'destructive' as const
      })
    }
    
    return actions
  }

  // Fonction pour obtenir le statut d'une transaction
  const getTransactionStatus = (transaction: WaveTransaction) => {
    const amount = parseFloat(transaction.amount)
    
    // Vérifier si c'est un remboursement
    if (isRefundTransaction(transaction)) {
      return { label: 'Remboursement', color: 'orange' }
    }
    
    // Vérifier s'il y a plusieurs transactions avec le même transaction_id
    const duplicateTransactions = transactions.filter(t => t.transaction_id === transaction.transaction_id)
    const hasDuplicates = duplicateTransactions.length > 1
    
    // Si il y a des doublons, c'est probablement une transaction annulée/remboursée
    if (hasDuplicates) {
      if (amount > 0) {
        return { label: 'Remboursé', color: 'purple' }
      } else {
        return { label: 'Annulé', color: 'purple' }
      }
    }
    
    // Vérifier si un paiement sortant a été refund (méthode existante)
    if (amount < 0 && isTransactionRefunded(transaction.transaction_id)) {
      return { label: 'Remboursé', color: 'purple' }
    }
    
    // Vérifier les autres statuts spéciaux
    if (transaction.localAssignment?.provider ||
       (transaction.localAssignment?.client && transaction.localAssignment?.project)) {
      return { label: 'Prestataire assigné', color: 'green' }
    }
    
    if (transaction.localAssignment?.client ||
       (transaction.localAssignment?.project && !transaction.localAssignment?.provider)) {
      return { label: 'Client assigné', color: 'blue' }
    }
    
    // Vérifier si le paiement semble être en cours
    if (canCancelPendingPayment(transaction)) {
      return { label: 'En attente', color: 'yellow' }
    }
    
    // Transaction avec assignation basique (description seulement) - pas vraiment assignée
    if (transaction.localAssignment && !transaction.localAssignment.client && !transaction.localAssignment.provider) {
      if (amount > 0) return { label: 'Reçu (non assigné)', color: 'gray' }
      return { label: 'Envoyé (non assigné)', color: 'gray' }
    }
    
    if (amount > 0) return { label: 'Reçu', color: 'green' }
    return { label: 'Envoyé', color: 'gray' }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions Wave</h1>
          <p className="text-muted-foreground">
            Gérez votre portefeuille Wave, effectuez des paiements et assignez vos transactions
          </p>
        </div>
        <Button onClick={() => fetchTransactions()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Solde Wave et Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Solde Wave */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-blue-600" />
              Solde Wave
            </CardTitle>
          </CardHeader>
          <CardContent>
            {balanceLoading ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Chargement...</span>
              </div>
            ) : balance ? (
              <div>
                <div className="text-3xl font-bold text-blue-600">
                  {formatCurrency(parseFloat(balance.balance))}
                </div>
                {(balance.account_name || balance.account_mobile) ? (
                  <div className="text-sm text-muted-foreground mt-1">
                    {balance.account_name && balance.account_mobile 
                      ? `${balance.account_name} • ${balance.account_mobile}`
                      : balance.account_name || balance.account_mobile
                    }
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground mt-1">
                    Solde Wave • {balance.currency}
                  </div>
                )}
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={fetchBalance}
                  className="mt-2"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Actualiser
                </Button>
              </div>
            ) : (
              <div className="text-muted-foreground">
                Impossible de charger le solde
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions rapides */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-green-600" />
              Actions rapides
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                size="sm" 
                onClick={() => openSendMoneyDialog('general_payment')}
                className="flex items-center gap-1"
              >
                <Phone className="h-3 w-3" />
                Payer un numéro
              </Button>
              
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => openSendMoneyDialog('provider_payment')}
                className="flex items-center gap-1"
              >
                <UserCheck className="h-3 w-3" />
                Payer prestataire
              </Button>
              
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => openSendMoneyDialog('client_refund')}
                className="flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                Rembourser client
              </Button>
              
              <Button 
                size="sm" 
                variant="secondary"
                onClick={openCheckoutDialog}
                className="flex items-center gap-1"
              >
                <CreditCard className="h-3 w-3" />
                Créer checkout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtres et recherche
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="search">Rechercher</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="ID, nom, téléphone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="revenue">Revenus (reçus)</SelectItem>
                  <SelectItem value="expense">Dépenses (envoyés)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignment">Assignation</Label>
              <Select value={assignmentFilter} onValueChange={(value) => setAssignmentFilter(value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value="assigned">Assignées</SelectItem>
                  <SelectItem value="unassigned">Non assignées</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("")
                  setTypeFilter("all")
                  setAssignmentFilter("all")
                }}
              >
                Réinitialiser
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des transactions */}
      <Card>
        <CardHeader>
          <CardTitle>
            Transactions du {new Date(selectedDate).toLocaleDateString('fr-FR')} 
            ({filteredTransactions.length})
          </CardTitle>
          <CardDescription>
            Cliquez sur "Assigner" pour lier une transaction à votre comptabilité
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                <span>Chargement des transactions...</span>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucune transaction trouvée pour cette date</p>
              </div>
            ) : (
              filteredTransactions.map((transaction, index) => {
                const amount = parseFloat(transaction.amount)
                const status = getTransactionStatus(transaction)
                const actions = getAvailableActions(transaction)
                
                return (
                  <motion.div
                    key={`${transaction.transaction_id}-${index}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="group relative bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 hover:border-gray-300"
                  >
                    {/* Header de la transaction */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${getTransactionColor(transaction)}`}>
                          {getTransactionIcon(transaction)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {transaction.transaction_id}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatDateTime(transaction.timestamp)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`text-lg font-bold ${amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {amount > 0 ? '+' : ''}{formatCurrency(amount)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {transaction.fee && parseFloat(transaction.fee) > 0 && (
                            <span>Frais: {formatCurrency(parseFloat(transaction.fee))}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Informations de la contrepartie */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-700">
                          {transaction.counterparty_name || transaction.counterparty_mobile || 'Non spécifié'}
                        </span>
                        {transaction.counterparty_mobile && transaction.counterparty_name && (
                          <span className="text-sm text-gray-500">
                            ({transaction.counterparty_mobile})
                          </span>
                        )}
                      </div>
                      
                      <Badge 
                        variant={
                          status.color === 'green' ? 'default' : 
                          status.color === 'red' ? 'destructive' : 
                          status.color === 'yellow' ? 'secondary' :
                          status.color === 'blue' ? 'outline' :
                          status.color === 'purple' ? 'secondary' :
                          'secondary'
                        }
                        className="text-xs"
                      >
                        {status.label}
                      </Badge>
                    </div>

                    {/* Raison du paiement */}
                    {transaction.payment_reason && (
                      <div className="mb-3 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        <strong>Raison:</strong> {transaction.payment_reason}
                      </div>
                    )}

                    {/* Référence client */}
                    {transaction.client_reference && (
                      <div className="mb-3 text-sm text-gray-600">
                        <strong>Référence:</strong> {transaction.client_reference}
                      </div>
                    )}

                    {/* Détails de l'assignation */}
                    {transaction.localAssignment && (
                      <div className="mb-3 p-3 bg-blue-50 border-l-4 border-blue-200 rounded-r">
                        <div className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                          <div className="flex-1">
                            <div className="font-medium text-blue-900">
                              {transaction.localAssignment.description}
                            </div>
                            <div className="flex flex-wrap gap-3 mt-1 text-sm text-blue-700">
                              {transaction.localAssignment.project && (
                                <div className="flex items-center gap-1">
                                  <FolderOpen className="h-3 w-3" />
                                  {transaction.localAssignment.project.name}
                                </div>
                              )}
                              {transaction.localAssignment.client && (
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {transaction.localAssignment.client.name}
                                </div>
                              )}
                              {transaction.localAssignment.provider && (
                                <div className="flex items-center gap-1">
                                  <Building className="h-3 w-3" />
                                  {transaction.localAssignment.provider.name}
                                </div>
                              )}
                            </div>
                            {transaction.localAssignment.notes && (
                              <div className="mt-1 text-sm text-gray-600">
                                <em>{transaction.localAssignment.notes}</em>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                      {actions.map((action, actionIndex) => {
                        const IconComponent = action.icon === 'Plus' ? Plus :
                                            action.icon === 'Trash2' ? Trash2 :
                                            action.icon === 'RotateCcw' ? RotateCcw :
                                            action.icon === 'StopCircle' ? StopCircle :
                                            action.icon === 'Ban' ? Ban : Plus

                        return (
                          <Button
                            key={`${transaction.transaction_id}-${actionIndex}-${action.type}`}
                            size="sm"
                            variant={action.variant}
                            onClick={() => {
                              if (action.type === 'assign') openAssignDialog(transaction)
                              if (action.type === 'unassign') handleUnassignTransaction(transaction.transaction_id)
                              if (action.type === 'refund') handleRefundTransaction(transaction.transaction_id, transaction.amount)
                              if (action.type === 'cancel_pending') handleCancelPendingPayment(transaction.transaction_id, transaction.amount, transaction.counterparty_name)
                              if (action.type === 'reverse') handleReversePayment(transaction.transaction_id, transaction.amount, transaction.timestamp, transaction.counterparty_name)
                            }}
                            className="flex items-center gap-1 transition-all duration-200"
                          >
                            <IconComponent className="h-3 w-3" />
                            {action.label}
                          </Button>
                        )
                      })}
                      
                      {/* Bouton de détails */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          // Ici on pourrait ouvrir un modal de détails
                          console.log('Détails de la transaction:', transaction)
                        }}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  </motion.div>
                )
              })
            )}
          </div>

          {/* Pagination */}
          {pageInfo?.has_next_page && (
            <div className="flex justify-center pt-6">
              <Button
                onClick={() => fetchTransactions(pageInfo.end_cursor)}
                disabled={loading}
                variant="outline"
                className="flex items-center gap-2"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                Charger plus de transactions
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog d'assignation */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assigner la transaction</DialogTitle>
            <DialogDescription>
              Liez cette transaction Wave à votre comptabilité interne
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4">
              {/* Informations de la transaction */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{selectedTransaction.transaction_id}</div>
                    <div className="text-sm text-gray-500">
                      {formatDateTime(selectedTransaction.timestamp)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${parseFloat(selectedTransaction.amount) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(parseFloat(selectedTransaction.amount))}
                    </div>
                    <div className="text-sm text-gray-500">
                      {selectedTransaction.counterparty_name || selectedTransaction.counterparty_mobile}
                    </div>
                  </div>
                </div>
              </div>

              {/* Formulaire d'assignation */}
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Type *</Label>
                    <Select value={assignmentForm.type} onValueChange={(value) => setAssignmentForm({...assignmentForm, type: value as any})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="revenue">Revenu</SelectItem>
                        <SelectItem value="expense">Dépense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Input
                      id="description"
                      value={assignmentForm.description}
                      onChange={(e) => setAssignmentForm({...assignmentForm, description: e.target.value})}
                      placeholder="Description de la transaction"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project">Projet</Label>
                  <Select value={assignmentForm.projectId} onValueChange={(value) => setAssignmentForm({...assignmentForm, projectId: value === "none" ? "" : value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un projet" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun projet</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {assignmentForm.type === 'revenue' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="invoice">Assigner à une facture existante (optionnel)</Label>
                      <Select value={assignmentForm.invoiceId} onValueChange={(value) => setAssignmentForm({...assignmentForm, invoiceId: value === "none" ? "" : value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une facture" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nouvelle assignation</SelectItem>
                          {invoices.filter(inv => inv.type === 'INVOICE' && parseFloat(selectedTransaction?.amount || '0') > 0 ? Math.abs(parseFloat(selectedTransaction.amount)) <= inv.amount * 1.1 : true).map((invoice) => (
                            <SelectItem key={invoice.id} value={invoice.id}>
                              {invoice.invoiceNumber} - {formatCurrency(invoice.amount)} 
                              {invoice.clientName && ` (${invoice.clientName})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {assignmentForm.invoiceId && (
                        <p className="text-sm text-blue-600">
                          💡 Cette transaction sera associée à la facture sélectionnée et marquera automatiquement la facture comme payée.
                        </p>
                      )}
                    </div>

                    {!assignmentForm.invoiceId && (
                      <div className="space-y-2">
                        <Label htmlFor="client">Client</Label>
                        <Select value={assignmentForm.clientId} onValueChange={(value) => setAssignmentForm({...assignmentForm, clientId: value === "none" ? "" : value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un client" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Aucun client</SelectItem>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </>
                )}

                {assignmentForm.type === 'expense' && (
                  <div className="space-y-2">
                    <Label htmlFor="provider">Prestataire</Label>
                    <Select value={assignmentForm.providerId} onValueChange={(value) => setAssignmentForm({...assignmentForm, providerId: value === "none" ? "" : value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un prestataire" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucun prestataire</SelectItem>
                        {providers.map((provider) => (
                          <SelectItem key={provider.id} value={provider.id}>
                            {provider.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={assignmentForm.notes}
                    onChange={(e) => setAssignmentForm({...assignmentForm, notes: e.target.value})}
                    placeholder="Notes additionnelles"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAssignTransaction} disabled={!assignmentForm.description}>
              Assigner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog d'envoi d'argent */}
      <Dialog open={isSendMoneyDialogOpen} onOpenChange={setIsSendMoneyDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Envoyer de l'argent</DialogTitle>
            <DialogDescription>
              Effectuer un paiement via Wave
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Montant *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={sendMoneyForm.receive_amount}
                  onChange={(e) => setSendMoneyForm({...sendMoneyForm, receive_amount: parseFloat(e.target.value) || 0})}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobile">Numéro de téléphone *</Label>
                <Input
                  id="mobile"
                  value={sendMoneyForm.mobile}
                  onChange={(e) => setSendMoneyForm({...sendMoneyForm, mobile: e.target.value})}
                  placeholder="+221xxxxxxxxx"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nom du destinataire</Label>
              <Input
                id="name"
                value={sendMoneyForm.name}
                onChange={(e) => setSendMoneyForm({...sendMoneyForm, name: e.target.value})}
                placeholder="Nom du destinataire"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Raison du paiement</Label>
              <Input
                id="reason"
                value={sendMoneyForm.payment_reason}
                onChange={(e) => setSendMoneyForm({...sendMoneyForm, payment_reason: e.target.value})}
                placeholder="Raison du paiement"
              />
            </div>

            {sendMoneyForm.type === 'provider_payment' && (
              <div className="space-y-2">
                <Label htmlFor="provider">Prestataire</Label>
                <Select value={sendMoneyForm.providerId} onValueChange={handleProviderSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un prestataire" />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        {provider.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {sendMoneyForm.type === 'client_refund' && (
              <div className="space-y-2">
                <Label htmlFor="client">Client</Label>
                <Select value={sendMoneyForm.clientId} onValueChange={(value) => handleClientSelect(value, 'sendMoney')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="project">Projet</Label>
              <Select value={sendMoneyForm.projectId} onValueChange={(value) => handleProjectSelect(value, 'sendMoney')}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un projet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun projet</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSendMoneyDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSendMoney} disabled={!sendMoneyForm.receive_amount || !sendMoneyForm.mobile}>
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de création de checkout */}
      <Dialog open={isCheckoutDialogOpen} onOpenChange={setIsCheckoutDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Créer une session checkout</DialogTitle>
            <DialogDescription>
              Créer un lien de paiement Wave pour recevoir de l'argent
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Montant *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={checkoutForm.amount}
                  onChange={(e) => setCheckoutForm({...checkoutForm, amount: e.target.value})}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Devise</Label>
                <Select value={checkoutForm.currency} onValueChange={(value) => setCheckoutForm({...checkoutForm, currency: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="XOF">XOF (Franc CFA)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={checkoutForm.description}
                onChange={(e) => setCheckoutForm({...checkoutForm, description: e.target.value})}
                placeholder="Description du paiement"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_reference">Référence</Label>
              <Input
                id="client_reference"
                value={checkoutForm.client_reference}
                onChange={(e) => setCheckoutForm({...checkoutForm, client_reference: e.target.value})}
                placeholder="Référence unique"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="restrict_payer">Numéro autorisé (optionnel)</Label>
              <Input
                id="restrict_payer"
                value={checkoutForm.restrict_payer_mobile}
                onChange={(e) => setCheckoutForm({...checkoutForm, restrict_payer_mobile: e.target.value})}
                placeholder="+221xxxxxxxxx"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client">Client</Label>
              <Select value={checkoutForm.clientId} onValueChange={(value) => handleClientSelect(value, 'checkout')}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun client</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project">Projet</Label>
              <Select value={checkoutForm.projectId} onValueChange={(value) => handleProjectSelect(value, 'checkout')}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un projet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun projet</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCheckoutDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateCheckout} disabled={!checkoutForm.amount || !checkoutForm.description}>
              Créer le checkout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}