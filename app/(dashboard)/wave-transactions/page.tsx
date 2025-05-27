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
  amount: number
  recipient_mobile: string
  recipient_name: string
  payment_reason: string
  type: 'provider_payment' | 'client_refund' | 'general_payment'
  providerId: string
  clientId: string
  projectId: string
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
    amount: 0,
    recipient_mobile: '',
    recipient_name: '',
    payment_reason: '',
    type: 'general_payment',
    providerId: '',
    clientId: '',
    projectId: ''
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
      amount: 0,
      recipient_mobile: '',
      recipient_name: '',
      payment_reason: '',
      type,
      providerId: '',
      clientId: '',
      projectId: ''
    })
    setIsSendMoneyDialogOpen(true)
  }

  const resetSendMoneyForm = () => {
    setSendMoneyForm({
      amount: 0,
      recipient_mobile: '',
      recipient_name: '',
      payment_reason: '',
      type: 'general_payment',
      providerId: '',
      clientId: '',
      projectId: ''
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
      const response = await fetch('/api/wave/send-money', {
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
                variant="destructive"
                onClick={() => {
                  // Logique pour annuler un paiement prestataire
                  toast.info('Sélectionnez un paiement prestataire dans la liste pour l\'annuler')
                }}
                className="flex items-center gap-1"
              >
                <Ban className="h-3 w-3" />
                Annuler paiement
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
                        {transaction.is_reversal && (
                          <Badge variant="outline" className="text-xs bg-purple-50 text-purple-600">
                            Annulation
                          </Badge>
                        )}
                        {transaction.localAssignment && (
                          <Badge variant="default" className="text-xs">
                            Assignée
                          </Badge>
                        )}
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
                      {!transaction.localAssignment ? (
                        <Button
                          size="sm"
                          onClick={() => openAssignDialog(transaction)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Assigner
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUnassignTransaction(transaction.transaction_id)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Supprimer
                        </Button>
                      )}

                      {parseFloat(transaction.amount) > 0 && !transaction.is_reversal && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRefundTransaction(transaction.transaction_id, transaction.amount)}
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          Rembourser
                        </Button>
                      )}
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
                <Input
                  id="amount"
                  type="number"
                  value={sendMoneyForm.amount || ''}
                  onChange={(e) => setSendMoneyForm({...sendMoneyForm, amount: parseFloat(e.target.value) || 0})}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipient_mobile">Numéro de téléphone</Label>
                <Input
                  id="recipient_mobile"
                  value={sendMoneyForm.recipient_mobile}
                  onChange={(e) => setSendMoneyForm({...sendMoneyForm, recipient_mobile: e.target.value})}
                  placeholder="+221761234567"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipient_name">Nom du destinataire (optionnel)</Label>
              <Input
                id="recipient_name"
                value={sendMoneyForm.recipient_name}
                onChange={(e) => setSendMoneyForm({...sendMoneyForm, recipient_name: e.target.value})}
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
                  onValueChange={(value) => setSendMoneyForm({...sendMoneyForm, providerId: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un prestataire..." />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.filter(provider => provider.id && provider.id.trim() !== '').map((provider) => (
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
                <Select 
                  value={sendMoneyForm.clientId} 
                  onValueChange={(value) => setSendMoneyForm({...sendMoneyForm, clientId: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.filter(client => client.id && client.id.trim() !== '').map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
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
                onValueChange={(value) => setSendMoneyForm({...sendMoneyForm, projectId: value === "none" ? "" : value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un projet..." />
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSendMoneyDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleSendMoney}
              disabled={!sendMoneyForm.amount || !sendMoneyForm.recipient_mobile}
            >
              <Send className="w-4 h-4 mr-2" />
              Envoyer {sendMoneyForm.amount ? formatCurrency(sendMoneyForm.amount) : ''}
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
    </div>
  )
} 