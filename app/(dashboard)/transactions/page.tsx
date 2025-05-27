"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  Search,
  Calendar,
  FileText,
  Receipt,
  Users,
  FolderOpen,
  Eye,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  CreditCard,
  Minus,
  RotateCcw
} from "lucide-react"
import { motion } from "motion/react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface Transaction {
  id: string
  type: 'invoice' | 'expense'
  description: string
  amount: number
  date: string
  status: string
  category?: string
  dateLabel?: string
  relatedType?: 'project' | 'expense' | 'invoice'
  relatedId?: string
  relatedData?: {
    projectName?: string
    clientName?: string
    invoiceNumber?: string
  }
  waveId?: string
  isWavePayment?: boolean
  isReversal?: boolean
}

interface TransactionStats {
  totalRevenue: number
  totalExpenses: number
  netFlow: number
  transactionCount: number
  pendingAmount: number
}

const typeFilters = [
  { value: 'all', label: 'Tous les types' },
  { value: 'revenue', label: 'Revenus' },
  { value: 'expense', label: 'Dépenses' }
]

const statusFilters = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'PAID', label: 'Payé' },
  { value: 'PENDING', label: 'En attente' },
  { value: 'OVERDUE', label: 'En retard' }
]

const periodFilters = [
  { value: 'all', label: 'Toute la période' },
  { value: 'today', label: 'Aujourd\'hui' },
  { value: 'thisWeek', label: 'Cette semaine' },
  { value: 'thisMonth', label: 'Ce mois' },
  { value: 'lastMonth', label: 'Mois dernier' },
  { value: 'thisYear', label: 'Cette année' }
]

export default function TransactionsPage() {
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [stats, setStats] = useState<TransactionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<"all" | "invoice" | "expense">("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [periodFilter, setPeriodFilter] = useState("thisMonth")

  useEffect(() => {
    fetchTransactions()
  }, [periodFilter])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (periodFilter !== 'all') params.append('period', periodFilter)
      
      const response = await fetch(`/api/transactions?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setTransactions(data.transactions || [])
        setStats(data.stats || null)
      } else {
        toast.error('Erreur lors du chargement des transactions')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors du chargement des transactions')
    } finally {
      setLoading(false)
    }
  }

  const handleRowClick = (transaction: Transaction) => {
    if (transaction.isWavePayment && transaction.waveId) {
      // Navigation vers la page de détail du paiement Wave
      router.push(`/wave-payment/${transaction.waveId}`)
    } else if (transaction.relatedType === 'project' && transaction.relatedId) {
      router.push(`/projects/${transaction.relatedId}`)
    } else if (transaction.relatedType === 'invoice' && transaction.relatedId) {
      router.push(`/invoices/${transaction.relatedId}`)
    } else if (transaction.relatedType === 'expense' && transaction.relatedId) {
      router.push(`/expenses`)
    }
  }

  const getTransactionIcon = (transaction: Transaction) => {
    if (transaction.type === 'invoice') {
      return <ArrowUpRight className="h-4 w-4 text-green-600" />
    }
    if (transaction.isReversal) {
      return <RotateCcw className="h-4 w-4 text-purple-600" />
    }
    return <ArrowDownLeft className="h-4 w-4 text-red-600" />
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'OVERDUE':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      default:
        return <Receipt className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
      case 'completed':
        return { className: 'bg-green-100 text-green-800', label: 'Payé' }
      case 'PENDING':
        return { className: 'bg-yellow-100 text-yellow-800', label: 'En attente' }
      case 'OVERDUE':
        return { className: 'bg-red-100 text-red-800', label: 'En retard' }
      case 'DRAFT':
        return { className: 'bg-gray-100 text-gray-800', label: 'Brouillon' }
      default:
        return { className: 'bg-gray-100 text-gray-800', label: status }
    }
  }

  const getRelatedTypeIcon = (type?: string) => {
    switch (type) {
      case 'invoice':
        return <FileText className="h-4 w-4 text-blue-600" />
      case 'expense':
        return <Receipt className="h-4 w-4 text-red-600" />
      case 'project':
        return <FolderOpen className="h-4 w-4 text-purple-600" />
      case 'provider':
        return <Users className="h-4 w-4 text-orange-600" />
      default:
        return null
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredTransactions = transactions.filter(transaction => {
    const searchQuery = searchTerm.toLowerCase()
    const matchesSearch = !searchQuery || 
      transaction.description.toLowerCase().includes(searchQuery) ||
      (transaction.relatedData?.projectName?.toLowerCase().includes(searchQuery)) ||
      (transaction.relatedData?.clientName?.toLowerCase().includes(searchQuery)) ||
      (transaction.relatedData?.invoiceNumber?.toLowerCase().includes(searchQuery))

    const matchesType = typeFilter === "all" || transaction.type === typeFilter
    const matchesStatus = statusFilter === "all" || transaction.status === statusFilter

    return matchesSearch && matchesType && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">
            Historique complet de toutes vos transactions financières
          </p>
        </div>
        <Button onClick={fetchTransactions} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenus totaux</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats.totalRevenue)}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Dépenses totales</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(stats.totalExpenses)}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Flux net</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stats.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(stats.netFlow)}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total transactions</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.transactionCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  En attente: {formatCurrency(stats.pendingAmount)}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label htmlFor="search">Rechercher</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Description, projet, client..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="period">Période</Label>
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periodFilters.map((filter) => (
                    <SelectItem key={filter.value} value={filter.value}>
                      {filter.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as "all" | "invoice" | "expense")}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="invoice">Factures</SelectItem>
                  <SelectItem value="expense">Dépenses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Statut</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusFilters.map((filter) => (
                    <SelectItem key={filter.value} value={filter.value}>
                      {filter.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("")
                  setTypeFilter("all")
                  setStatusFilter("all")
                  setPeriodFilter("thisMonth")
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
          <CardTitle>Transactions ({filteredTransactions.length})</CardTitle>
          <CardDescription>
            Cliquez sur une transaction pour accéder à la page associée
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredTransactions.map((transaction) => (
              <motion.tr 
                key={transaction.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ backgroundColor: "rgba(0, 0, 0, 0.02)" }}
                className="cursor-pointer transition-colors"
                onClick={() => handleRowClick(transaction)}
              >
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      transaction.type === 'invoice' 
                        ? 'bg-green-100 text-green-600' 
                        : transaction.isReversal
                        ? 'bg-purple-100 text-purple-600'
                        : transaction.isWavePayment
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-red-100 text-red-600'
                    }`}>
                      {transaction.type === 'invoice' ? (
                        <Receipt className="w-4 h-4" />
                      ) : transaction.isReversal ? (
                        <RotateCcw className="w-4 h-4" />
                      ) : transaction.isWavePayment ? (
                        <CreditCard className="w-4 h-4" />
                      ) : (
                        <Minus className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {transaction.isReversal && (
                          <Badge variant="outline" className="text-xs bg-purple-50 text-purple-600 border-purple-200">
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Annulation Wave
                          </Badge>
                        )}
                        {transaction.isWavePayment && !transaction.isReversal && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
                            <CreditCard className="w-3 h-3 mr-1" />
                            Paiement Wave
                          </Badge>
                        )}
                        {transaction.relatedData?.projectName && (
                          <Badge variant="secondary" className="text-xs">
                            {transaction.relatedData.projectName}
                          </Badge>
                        )}
                        {transaction.relatedData?.clientName && (
                          <Badge variant="outline" className="text-xs">
                            {transaction.relatedData.clientName}
                          </Badge>
                        )}
                        {transaction.relatedData?.invoiceNumber && (
                          <Badge variant="outline" className="text-xs">
                            {transaction.relatedData.invoiceNumber}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <Badge className={getStatusBadge(transaction.status).className}>
                    {getStatusBadge(transaction.status).label}
                  </Badge>
                </td>
                <td className="p-4">
                  <span className={`font-semibold ${
                    transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(transaction.amount))}
                  </span>
                </td>
                <td className="p-4 text-muted-foreground">
                  {new Date(transaction.date).toLocaleDateString('fr-FR')}
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    {transaction.isWavePayment ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/wave-payment/${transaction.waveId}`)
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Détails Wave
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRowClick(transaction)
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Voir
                      </Button>
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}
            
            {filteredTransactions.length === 0 && (
              <div className="text-center py-12">
                <Receipt className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">Aucune transaction</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Aucune transaction trouvée avec les filtres actuels.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 