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
  Phone
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
    category: 'WAVE_PAYMENT'
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

  useEffect(() => {
    fetchTransactions()
    fetchBalance()
    fetchSelectData()
  }, [selectedDate])

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
      const [projectsRes, clientsRes, providersRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/clients'),
        fetch('/api/providers')
      ])

      if (projectsRes.ok) setProjects(await projectsRes.json())
      if (clientsRes.ok) setClients(await clientsRes.json())
      if (providersRes.ok) setProviders(await providersRes.json())
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error)
    }
  }

  const handleAssignTransaction = async () => {
    if (!selectedTransaction) return

    try {
      const response = await fetch(`/api/wave/transactions/${selectedTransaction.transaction_id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...assignmentForm,
          waveTransactionData: selectedTransaction
        })
      })

      if (response.ok) {
        toast.success('Transaction assignée avec succès')
        setIsAssignDialogOpen(false)
        resetAssignmentForm()
        fetchTransactions() // Recharger pour voir l'assignation
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
      category: suggestedType === 'expense' ? 'WAVE_PAYMENT' : ''
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
      category: 'WAVE_PAYMENT'
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

    const isAssigned = !!transaction.localAssignment
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
        body: JSON.stringify(sendMoneyForm)
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

  // Fonction pour obtenir les actions disponibles pour une transaction
  const getAvailableActions = (transaction: WaveTransaction) => {
    const actions = []
    const amount = parseFloat(transaction.amount)
    const isRefunded = isTransactionRefunded(transaction.transaction_id)
    const isRefund = isRefundTransaction(transaction)
    
    // Action d'assignation
    if (!transaction.localAssignment) {
      actions.push({
        type: 'assign',
        label: 'Assigner',
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
    
    // Action de remboursement
    if (amount > 0 && !transaction.is_reversal && !isRefunded && !isRefund) {
      actions.push({
        type: 'refund',
        label: 'Rembourser',
        icon: 'RotateCcw',
        variant: 'destructive' as const
      })
    }
    
    return actions
  }

  // Fonction pour obtenir le statut d'une transaction
  const getTransactionStatus = (transaction: WaveTransaction) => {
    const amount = parseFloat(transaction.amount)
    const isRefunded = isTransactionRefunded(transaction.transaction_id)
    const isRefund = isRefundTransaction(transaction)
    
    if (transaction.is_reversal) return { label: 'Annulation', color: 'purple' }
    if (isRefunded) return { label: 'Remboursée', color: 'red' }
    if (isRefund) return { label: 'Remboursement', color: 'orange' }
    
    // Détection spécifique des paiements prestataires
    if (transaction.localAssignment?.provider || 
        transaction.payment_reason?.toLowerCase().includes('prestataire') ||
        transaction.payment_reason?.toLowerCase().includes('provider')) {
      return { label: 'Paiement prestataire', color: 'blue' }
    }
    
    // Détection des paiements clients
    if (transaction.localAssignment?.client ||
        transaction.payment_reason?.toLowerCase().includes('client')) {
      return amount > 0 ? { label: 'Paiement reçu', color: 'green' } : { label: 'Paiement client', color: 'blue' }
    }
    
    if (transaction.localAssignment) return { label: 'Assignée', color: 'blue' }
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
            {filteredTransactions.map((transaction, index) => (
              <motion.div
                key={`${transaction.transaction_id}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getTransactionColor(transaction)}`}>
                      {getTransactionIcon(transaction)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{transaction.transaction_id}</span>
                        {(() => {
                          const status = getTransactionStatus(transaction)
                          const colorClasses = {
                            purple: "bg-purple-50 text-purple-600 border-purple-200",
                            red: "bg-red-50 text-red-600 border-red-200",
                            orange: "bg-orange-50 text-orange-600 border-orange-200",
                            blue: "bg-blue-50 text-blue-600 border-blue-200",
                            green: "bg-green-50 text-green-600 border-green-200",
                            gray: "bg-gray-50 text-gray-600 border-gray-200"
                          }
                          return (
                            <Badge variant="outline" className={`text-xs ${colorClasses[status.color as keyof typeof colorClasses]}`}>
                              {status.label}
                            </Badge>
                          )
                        })()}
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        {transaction.counterparty_name && (
                          <span>{transaction.counterparty_name}</span>
                        )}
                        {transaction.counterparty_mobile && (
                          <span className="ml-2">({transaction.counterparty_mobile})</span>
                        )}
                        {transaction.payment_reason && (
                          <span className="block">{transaction.payment_reason}</span>
                        )}
                      </div>

                      {transaction.localAssignment && (
                        <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                          <div className="font-medium text-blue-800">
                            {transaction.localAssignment.description}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {transaction.localAssignment.project && (
                              <Badge variant="secondary" className="text-xs">
                                <FolderOpen className="w-3 h-3 mr-1" />
                                {transaction.localAssignment.project.name}
                              </Badge>
                            )}
                            {transaction.localAssignment.client && (
                              <Badge variant="outline" className="text-xs">
                                <User className="w-3 h-3 mr-1" />
                                {transaction.localAssignment.client.name}
                              </Badge>
                            )}
                            {transaction.localAssignment.provider && (
                              <Badge variant="outline" className="text-xs">
                                <Users className="w-3 h-3 mr-1" />
                                {transaction.localAssignment.provider.name}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className={`text-lg font-semibold ${
                        parseFloat(transaction.amount) > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {parseFloat(transaction.amount) > 0 ? '+' : ''}
                        {formatCurrency(Math.abs(parseFloat(transaction.amount)))}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Frais: {formatCurrency(parseFloat(transaction.fee))}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateTime(transaction.timestamp)}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {getAvailableActions(transaction).map((action, actionIndex) => {
                        const IconComponent = action.icon === 'Plus' ? Plus : 
                                            action.icon === 'Trash2' ? Trash2 : 
                                            action.icon === 'RotateCcw' ? RotateCcw : Plus
                        
                        const handleClick = () => {
                          if (action.type === 'assign') {
                            openAssignDialog(transaction)
                          } else if (action.type === 'unassign') {
                            handleUnassignTransaction(transaction.transaction_id)
                          } else if (action.type === 'refund') {
                            handleRefundTransaction(transaction.transaction_id, transaction.amount)
                          }
                        }

                        return (
                          <Button
                            key={actionIndex}
                            size="sm"
                            variant={action.variant}
                            onClick={handleClick}
                          >
                            <IconComponent className="w-4 h-4 mr-1" />
                            {action.label}
                          </Button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {filteredTransactions.length === 0 && !loading && (
              <div className="text-center py-12">
                <CreditCard className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold">Aucune transaction</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Aucune transaction trouvée pour cette date avec les filtres actuels.
                </p>
              </div>
            )}

            {/* Pagination */}
            {pageInfo?.has_next_page && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => fetchTransactions(pageInfo.end_cursor)}
                  disabled={loading}
                >
                  <ChevronRight className="w-4 h-4 mr-2" />
                  Charger plus
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog d'envoi d'argent */}
      <Dialog open={isSendMoneyDialogOpen} onOpenChange={setIsSendMoneyDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {sendMoneyForm.type === 'provider_payment' && 'Payer un prestataire'}
              {sendMoneyForm.type === 'client_refund' && 'Rembourser un client'}
              {sendMoneyForm.type === 'general_payment' && 'Envoyer de l\'argent'}
            </DialogTitle>
            <DialogDescription>
              Envoyez de l'argent via Wave vers un numéro de téléphone
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Montant (XOF)</Label>
                <div className="relative">
                  <Input
                    id="amount"
                    type="number"
                    value={sendMoneyForm.receive_amount || ''}
                    onChange={(e) => setSendMoneyForm({...sendMoneyForm, receive_amount: parseFloat(e.target.value) || 0})}
                    placeholder="0"
                    className={sendMoneyForm.receive_amount > 0 ? "border-green-300" : ""}
                  />
                  {sendMoneyForm.receive_amount > 0 && (
                    <div className="absolute right-2 top-2 text-xs text-green-600">
                      {formatCurrency(sendMoneyForm.receive_amount)}
                    </div>
                  )}
                </div>
                {sendMoneyForm.receive_amount > 1000000 && (
                  <p className="text-xs text-orange-600">⚠️ Montant élevé - Vérifiez les limites de votre compte</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipient_mobile">Numéro de téléphone</Label>
                <div className="relative">
                  <Input
                    id="recipient_mobile"
                    value={sendMoneyForm.mobile}
                    onChange={(e) => setSendMoneyForm({...sendMoneyForm, mobile: e.target.value})}
                    placeholder="+221761234567"
                    className={sendMoneyForm.mobile.startsWith('+221') ? "border-green-300" : ""}
                  />
                  {sendMoneyForm.mobile && !sendMoneyForm.mobile.startsWith('+221') && (
                    <div className="absolute right-2 top-2 text-xs text-orange-600">
                      ⚠️
                    </div>
                  )}
                </div>
                {sendMoneyForm.mobile && !sendMoneyForm.mobile.startsWith('+221') && (
                  <p className="text-xs text-orange-600">Format recommandé: +221XXXXXXXXX</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipient_name">Nom du destinataire (optionnel)</Label>
              <Input
                id="recipient_name"
                value={sendMoneyForm.name}
                onChange={(e) => setSendMoneyForm({...sendMoneyForm, name: e.target.value})}
                placeholder="Nom du destinataire"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_reason">Motif du paiement</Label>
              <Input
                id="payment_reason"
                value={sendMoneyForm.payment_reason}
                onChange={(e) => setSendMoneyForm({...sendMoneyForm, payment_reason: e.target.value})}
                placeholder="Motif du paiement..."
              />
            </div>

            {sendMoneyForm.type === 'provider_payment' && (
              <div className="space-y-2">
                <Label htmlFor="provider">Prestataire</Label>
                <Select 
                  value={sendMoneyForm.providerId} 
                  onValueChange={handleProviderSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un prestataire..." />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.filter(provider => provider.id && provider.id.trim() !== '').map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{provider.name}</span>
                          {provider.phone && (
                            <span className="text-xs text-muted-foreground">{provider.phone}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {sendMoneyForm.type === 'client_refund' && (
              <div className="space-y-2">
                <Label htmlFor="client">Client</Label>
                <Select 
                  value={sendMoneyForm.clientId} 
                  onValueChange={(value) => handleClientSelect(value, 'sendMoney')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.filter(client => client.id && client.id.trim() !== '').map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{client.name}</span>
                          {client.phone && (
                            <span className="text-xs text-muted-foreground">{client.phone}</span>
                          )}
                          {client.email && (
                            <span className="text-xs text-muted-foreground">{client.email}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="project">Projet (optionnel)</Label>
              <Select 
                value={sendMoneyForm.projectId || "none"} 
                onValueChange={(value) => {
                  if (value === "none") {
                    setSendMoneyForm({...sendMoneyForm, projectId: ""})
                  } else {
                    handleProjectSelect(value, 'sendMoney')
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un projet..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun projet</SelectItem>
                  {projects.filter(project => project.id && project.id.trim() !== '').map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{project.name}</span>
                        {project.description && (
                          <span className="text-xs text-muted-foreground">{project.description}</span>
                        )}
                      </div>
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
            <Button 
              onClick={handleSendMoney}
              disabled={!sendMoneyForm.receive_amount || !sendMoneyForm.mobile}
            >
              <Send className="w-4 h-4 mr-2" />
              Envoyer {sendMoneyForm.receive_amount ? formatCurrency(sendMoneyForm.receive_amount) : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog d'assignation */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Assigner la transaction Wave</DialogTitle>
            <DialogDescription>
              Assignez cette transaction à votre comptabilité en créant une facture ou une dépense.
            </DialogDescription>
          </DialogHeader>

          {selectedTransaction && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{selectedTransaction.transaction_id}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedTransaction.counterparty_name} • {formatDateTime(selectedTransaction.timestamp)}
                  </p>
                </div>
                <div className={`text-lg font-semibold ${
                  parseFloat(selectedTransaction.amount) > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {parseFloat(selectedTransaction.amount) > 0 ? '+' : ''}
                  {formatCurrency(Math.abs(parseFloat(selectedTransaction.amount)))}
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type de transaction</Label>
                <Select 
                  value={assignmentForm.type} 
                  onValueChange={(value) => setAssignmentForm({...assignmentForm, type: value as any})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revenue">Revenu (facture)</SelectItem>
                    <SelectItem value="expense">Dépense</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {assignmentForm.type === 'expense' && (
                <div className="space-y-2">
                  <Label htmlFor="category">Catégorie</Label>
                  <Select 
                    value={assignmentForm.category} 
                    onValueChange={(value) => setAssignmentForm({...assignmentForm, category: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WAVE_PAYMENT">Paiement Wave</SelectItem>
                      <SelectItem value="PROVIDER_PAYMENT">Paiement prestataire</SelectItem>
                      <SelectItem value="HOSTING">Hébergement</SelectItem>
                      <SelectItem value="SOFTWARE">Logiciels</SelectItem>
                      <SelectItem value="OTHER">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={assignmentForm.description}
                onChange={(e) => setAssignmentForm({...assignmentForm, description: e.target.value})}
                placeholder="Description de la transaction..."
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project">Projet (optionnel)</Label>
                <Select 
                  value={assignmentForm.projectId || "none"} 
                  onValueChange={(value) => setAssignmentForm({...assignmentForm, projectId: value === "none" ? "" : value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun projet</SelectItem>
                    {projects.filter(project => project.id && project.id.trim() !== '').map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="client">Client (optionnel)</Label>
                <Select 
                  value={assignmentForm.clientId || "none"} 
                  onValueChange={(value) => setAssignmentForm({...assignmentForm, clientId: value === "none" ? "" : value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun client</SelectItem>
                    {clients.filter(client => client.id && client.id.trim() !== '').map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="provider">Prestataire (optionnel)</Label>
                <Select 
                  value={assignmentForm.providerId || "none"} 
                  onValueChange={(value) => setAssignmentForm({...assignmentForm, providerId: value === "none" ? "" : value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun prestataire</SelectItem>
                    {providers.filter(provider => provider.id && provider.id.trim() !== '').map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        {provider.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optionnel)</Label>
              <Textarea
                id="notes"
                value={assignmentForm.notes}
                onChange={(e) => setAssignmentForm({...assignmentForm, notes: e.target.value})}
                placeholder="Notes supplémentaires..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleAssignTransaction}
              disabled={!assignmentForm.description}
            >
              Assigner la transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de création de session checkout */}
      <Dialog open={isCheckoutDialogOpen} onOpenChange={setIsCheckoutDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Créer une session checkout Wave</DialogTitle>
            <DialogDescription>
              Créez un lien de paiement Wave que vos clients peuvent utiliser pour payer
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="checkout_amount">Montant (XOF)</Label>
                <div className="relative">
                  <Input
                    id="checkout_amount"
                    type="number"
                    value={checkoutForm.amount}
                    onChange={(e) => setCheckoutForm({...checkoutForm, amount: e.target.value})}
                    placeholder="1000"
                    className={parseFloat(checkoutForm.amount) > 0 ? "border-green-300" : ""}
                  />
                  {parseFloat(checkoutForm.amount) > 0 && (
                    <div className="absolute right-2 top-2 text-xs text-green-600">
                      {formatCurrency(parseFloat(checkoutForm.amount))}
                    </div>
                  )}
                </div>
                {parseFloat(checkoutForm.amount) > 0 && parseFloat(checkoutForm.amount) < 100 && (
                  <p className="text-xs text-orange-600">⚠️ Montant très faible</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="checkout_currency">Devise</Label>
                <Select 
                  value={checkoutForm.currency} 
                  onValueChange={(value) => setCheckoutForm({...checkoutForm, currency: value})}
                >
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
              <Label htmlFor="checkout_description">Description</Label>
              <Input
                id="checkout_description"
                value={checkoutForm.description}
                onChange={(e) => setCheckoutForm({...checkoutForm, description: e.target.value})}
                placeholder="Description du paiement..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="checkout_success_url">URL de succès</Label>
                <Input
                  id="checkout_success_url"
                  value={checkoutForm.success_url}
                  onChange={(e) => setCheckoutForm({...checkoutForm, success_url: e.target.value})}
                  placeholder="https://example.com/success"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="checkout_error_url">URL d'erreur</Label>
                <Input
                  id="checkout_error_url"
                  value={checkoutForm.error_url}
                  onChange={(e) => setCheckoutForm({...checkoutForm, error_url: e.target.value})}
                  placeholder="https://example.com/error"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="checkout_client_reference">Référence client (optionnel)</Label>
                <Input
                  id="checkout_client_reference"
                  value={checkoutForm.client_reference}
                  onChange={(e) => setCheckoutForm({...checkoutForm, client_reference: e.target.value})}
                  placeholder="REF-12345"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="checkout_restrict_mobile">Restreindre au mobile (optionnel)</Label>
                <div className="relative">
                  <Input
                    id="checkout_restrict_mobile"
                    value={checkoutForm.restrict_payer_mobile}
                    onChange={(e) => setCheckoutForm({...checkoutForm, restrict_payer_mobile: e.target.value})}
                    placeholder="+221761234567"
                    className={checkoutForm.restrict_payer_mobile.startsWith('+221') ? "border-green-300" : ""}
                  />
                  {checkoutForm.restrict_payer_mobile && !checkoutForm.restrict_payer_mobile.startsWith('+221') && (
                    <div className="absolute right-2 top-2 text-xs text-orange-600">
                      ⚠️
                    </div>
                  )}
                </div>
                {checkoutForm.restrict_payer_mobile && (
                  <p className="text-xs text-blue-600">🔒 Seul ce numéro pourra effectuer le paiement</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="checkout_project">Projet (optionnel)</Label>
                <Select 
                  value={checkoutForm.projectId || "none"} 
                  onValueChange={(value) => {
                    if (value === "none") {
                      setCheckoutForm({...checkoutForm, projectId: ""})
                    } else {
                      handleProjectSelect(value, 'checkout')
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un projet..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun projet</SelectItem>
                    {projects.filter(project => project.id && project.id.trim() !== '').map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{project.name}</span>
                          {project.description && (
                            <span className="text-xs text-muted-foreground">{project.description}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="checkout_client">Client (optionnel)</Label>
                <Select 
                  value={checkoutForm.clientId || "none"} 
                  onValueChange={(value) => {
                    if (value === "none") {
                      setCheckoutForm({...checkoutForm, clientId: ""})
                    } else {
                      handleClientSelect(value, 'checkout')
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un client..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun client</SelectItem>
                    {clients.filter(client => client.id && client.id.trim() !== '').map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{client.name}</span>
                          {client.phone && (
                            <span className="text-xs text-muted-foreground">{client.phone}</span>
                          )}
                          {client.email && (
                            <span className="text-xs text-muted-foreground">{client.email}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCheckoutDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleCreateCheckout}
              disabled={!checkoutForm.amount || !checkoutForm.success_url || !checkoutForm.error_url}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Créer session checkout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 