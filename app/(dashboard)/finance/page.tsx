"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Plus,
  Receipt,
  PieChart,
  BarChart3,
  Calendar,
  Filter,
  Download,
  Eye,
  AlertTriangle,
  CheckCircle
} from "lucide-react"
import { motion } from "motion/react"
import { toast } from "sonner"

interface FinanceData {
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  pendingInvoices: number
  paidInvoices: number
  overdueInvoices: number
  monthlyData: Array<{
    month: string
    revenue: number
    expenses: number
    profit: number
  }>
  expensesByCategory: Array<{
    category: string
    amount: number
    count: number
  }>
  recentTransactions: Array<{
    id: string
    type: 'revenue' | 'expense'
    description: string
    amount: number
    date: string
    status: string
    category?: string
  }>
}

interface ExpenseFormData {
  description: string
  amount: string
  category: string
  date: string
  notes: string
  projectId?: string
}

const expenseCategories = [
  { value: 'EQUIPMENT', label: 'Équipement' },
  { value: 'SOFTWARE', label: 'Logiciels' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'TRANSPORT', label: 'Transport' },
  { value: 'OFFICE', label: 'Bureau' },
  { value: 'FORMATION', label: 'Formation' },
  { value: 'COMMUNICATION', label: 'Communication' },
  { value: 'BANKING', label: 'Frais bancaires' },
  { value: 'TAXES', label: 'Taxes' },
  { value: 'OTHER', label: 'Autres' }
]

export default function FinancePage() {
  const [financeData, setFinanceData] = useState<FinanceData | null>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('thisYear')
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false)
  const [expenseForm, setExpenseForm] = useState<ExpenseFormData>({
    description: '',
    amount: '',
    category: 'OTHER',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  })

  useEffect(() => {
    fetchFinanceData()
    fetchProjects()
  }, [period])

  const fetchFinanceData = async () => {
    try {
      const response = await fetch(`/api/finance?period=${period}`)
      if (response.ok) {
        const data = await response.json()
        setFinanceData(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données financières:', error)
      toast.error('Erreur lors du chargement des données')
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

  const handleCreateExpense = async () => {
    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...expenseForm,
          amount: parseFloat(expenseForm.amount),
          projectId: expenseForm.projectId || null
        })
      })

      if (response.ok) {
        toast.success('Dépense créée avec succès')
        setIsExpenseDialogOpen(false)
        setExpenseForm({
          description: '',
          amount: '',
          category: 'OTHER',
          date: new Date().toISOString().split('T')[0],
          notes: ''
        })
        fetchFinanceData()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors de la création de la dépense')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la création de la dépense')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'text-green-600'
      case 'PENDING': return 'text-yellow-600'
      case 'OVERDUE': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID': return CheckCircle
      case 'PENDING': return Calendar
      case 'OVERDUE': return AlertTriangle
      default: return Receipt
    }
  }

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return 0
    return ((current - previous) / previous) * 100
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!financeData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-600">Impossible de charger les données financières</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Finances</h1>
          <p className="text-muted-foreground">
            Vue d'ensemble de vos revenus et dépenses
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="thisMonth">Ce mois</SelectItem>
              <SelectItem value="lastMonth">Mois dernier</SelectItem>
              <SelectItem value="thisYear">Cette année</SelectItem>
              <SelectItem value="lastYear">Année dernière</SelectItem>
            </SelectContent>
          </Select>
          
          <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle dépense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter une dépense</DialogTitle>
                <DialogDescription>
                  Enregistrez une nouvelle dépense
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="description">Description *</Label>
                  <Input
                    id="description"
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                    placeholder="Description de la dépense"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="amount">Montant *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={expenseForm.date}
                      onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="category">Catégorie</Label>
                  <Select value={expenseForm.category} onValueChange={(value) => setExpenseForm({ ...expenseForm, category: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="project">Projet (optionnel)</Label>
                  <Select value={expenseForm.projectId || ""} onValueChange={(value) => setExpenseForm({ ...expenseForm, projectId: value || undefined })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un projet" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Aucun projet</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={expenseForm.notes}
                    onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                    placeholder="Notes additionnelles"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsExpenseDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleCreateExpense} disabled={!expenseForm.description || !expenseForm.amount}>
                  Créer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Métriques principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenus totaux</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(financeData.totalRevenue)}
              </div>
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendingUp className="mr-1 h-3 w-3" />
                Factures payées
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
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(financeData.totalExpenses)}
              </div>
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendingDown className="mr-1 h-3 w-3" />
                Toutes catégories
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
              <CardTitle className="text-sm font-medium">Bénéfice net</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${financeData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(financeData.netProfit)}
              </div>
              <div className="flex items-center text-xs text-muted-foreground">
                {financeData.netProfit >= 0 ? (
                  <TrendingUp className="mr-1 h-3 w-3" />
                ) : (
                  <TrendingDown className="mr-1 h-3 w-3" />
                )}
                Revenus - Dépenses
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
              <CardTitle className="text-sm font-medium">Factures en attente</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {financeData.pendingInvoices}
              </div>
              <div className="flex items-center text-xs text-muted-foreground">
                <Calendar className="mr-1 h-3 w-3" />
                À encaisser
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Graphiques et tableaux */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Graphique des revenus/dépenses mensuels */}
        <Card>
          <CardHeader>
            <CardTitle>Évolution mensuelle</CardTitle>
            <CardDescription>
              Revenus, dépenses et bénéfices par mois
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {financeData.monthlyData.map((month, index) => (
                <motion.div
                  key={month.month}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="font-medium">{month.month}</div>
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="text-green-600">
                      +{formatCurrency(month.revenue)}
                    </div>
                    <div className="text-red-600">
                      -{formatCurrency(month.expenses)}
                    </div>
                    <div className={`font-bold ${month.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(month.profit)}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Dépenses par catégorie */}
        <Card>
          <CardHeader>
            <CardTitle>Dépenses par catégorie</CardTitle>
            <CardDescription>
              Répartition de vos dépenses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {financeData.expensesByCategory.map((category, index) => {
                const categoryLabel = expenseCategories.find(c => c.value === category.category)?.label || category.category
                const percentage = financeData.totalExpenses > 0 ? (category.amount / financeData.totalExpenses) * 100 : 0
                
                return (
                  <motion.div
                    key={category.category}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{categoryLabel}</span>
                      <div className="text-right">
                        <div className="text-sm font-bold">{formatCurrency(category.amount)}</div>
                        <div className="text-xs text-muted-foreground">{category.count} transaction{category.count !== 1 ? 's' : ''}</div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground text-right">
                      {percentage.toFixed(1)}%
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions récentes */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions récentes</CardTitle>
          <CardDescription>
            Vos dernières opérations financières
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {financeData.recentTransactions.map((transaction, index) => {
              const StatusIcon = getStatusIcon(transaction.status)
              const categoryLabel = transaction.category 
                ? expenseCategories.find(c => c.value === transaction.category)?.label || transaction.category
                : null
              
              return (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full ${transaction.type === 'revenue' ? 'bg-green-100' : 'bg-red-100'}`}>
                      <StatusIcon className={`h-4 w-4 ${getStatusColor(transaction.status)}`} />
                    </div>
                    <div>
                      <div className="font-medium">{transaction.description}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(transaction.date).toLocaleDateString('fr-FR')}
                        {categoryLabel && (
                          <span className="ml-2">• {categoryLabel}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${transaction.type === 'revenue' ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.type === 'revenue' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </div>
                    <Badge variant={transaction.status === 'PAID' ? 'default' : transaction.status === 'PENDING' ? 'secondary' : 'destructive'}>
                      {transaction.status === 'PAID' ? 'Payé' : transaction.status === 'PENDING' ? 'En attente' : 'En retard'}
                    </Badge>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 