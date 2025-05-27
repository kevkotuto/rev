"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  FolderOpen,
  CheckSquare,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  Download,
  RefreshCw,
  Filter,
  FileText,
  Eye,
  TrendingDown as TrendingDownIcon,
  AlertTriangle,
  Clock,
  Target,
  Zap
} from "lucide-react"
import { motion } from "motion/react"
import { toast } from "sonner"

interface Statistics {
  revenue: {
    total: number
    thisMonth: number
    lastMonth: number
    growth: number
    pending: number
    overdue: number
  }
  clients: {
    total: number
    active: number
    new: number
    topClients: Array<{
      name: string
      revenue: number
      projects: number
    }>
  }
  projects: {
    total: number
    completed: number
    inProgress: number
    onHold: number
    cancelled: number
    averageValue: number
    profitability: number
  }
  tasks: {
    total: number
    completed: number
    pending: number
    overdue: number
    completionRate: number
  }
  expenses: {
    total: number
    thisMonth: number
    lastMonth: number
    byCategory: Array<{
      category: string
      amount: number
      percentage: number
    }>
  }
  invoices: {
    total: number
    paid: number
    pending: number
    overdue: number
    cancelled: number
    averagePaymentDelay: number
  }
  monthlyRevenue: Array<{
    month: string
    revenue: number
    expenses: number
    profit: number
    invoicesCount: number
  }>
  projectsByType: Array<{
    type: string
    count: number
    revenue: number
    percentage: number
  }>
  performance: {
    profitMargin: number
    revenuePerClient: number
    projectSuccessRate: number
    paymentDelayTrend: number
  }
}

type DatePeriod = 'thisWeek' | 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'thisYear' | 'lastYear' | 'custom'

interface DateRange {
  startDate: string
  endDate: string
}

const predefinedPeriods = [
  { value: 'thisWeek', label: 'Cette semaine' },
  { value: 'thisMonth', label: 'Ce mois' },
  { value: 'lastMonth', label: 'Mois dernier' },
  { value: 'thisQuarter', label: 'Ce trimestre' },
  { value: 'thisYear', label: 'Cette année' },
  { value: 'lastYear', label: 'Année dernière' },
  { value: 'custom', label: 'Période personnalisée' }
]

export default function StatisticsPage() {
  const [stats, setStats] = useState<Statistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingPDF, setLoadingPDF] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<DatePeriod>("thisMonth")
  const [customDateRange, setCustomDateRange] = useState<DateRange>({
    startDate: '',
    endDate: ''
  })

  useEffect(() => {
    fetchStatistics()
  }, [selectedPeriod, customDateRange])

  // Fonction pour calculer les dates en fonction de la période
  const getDateRangeForPeriod = (period: DatePeriod): { startDate?: string, endDate?: string } => {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    
    switch (period) {
      case 'thisWeek':
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
        return { startDate: startOfWeek.toISOString().split('T')[0], endDate: today }
      case 'thisMonth':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        return { startDate: startOfMonth.toISOString().split('T')[0], endDate: today }
      case 'lastMonth':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
        return { 
          startDate: lastMonth.toISOString().split('T')[0], 
          endDate: endOfLastMonth.toISOString().split('T')[0] 
        }
      case 'thisQuarter':
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
        return { startDate: quarterStart.toISOString().split('T')[0], endDate: today }
      case 'thisYear':
        const yearStart = new Date(now.getFullYear(), 0, 1)
        return { startDate: yearStart.toISOString().split('T')[0], endDate: today }
      case 'lastYear':
        const lastYearStart = new Date(now.getFullYear() - 1, 0, 1)
        const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31)
        return { 
          startDate: lastYearStart.toISOString().split('T')[0], 
          endDate: lastYearEnd.toISOString().split('T')[0] 
        }
      case 'custom':
        return customDateRange.startDate && customDateRange.endDate 
          ? { startDate: customDateRange.startDate, endDate: customDateRange.endDate }
          : {}
      default:
        return {}
    }
  }

  const fetchStatistics = async () => {
    try {
      setLoading(true)
      const dateRange = getDateRangeForPeriod(selectedPeriod)
      const params = new URLSearchParams()
      
      if (dateRange.startDate) params.append('startDate', dateRange.startDate)
      if (dateRange.endDate) params.append('endDate', dateRange.endDate)
      params.append('period', selectedPeriod)
      
      const url = `/api/statistics${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url)
      
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      } else {
        toast.error("Erreur lors du chargement des statistiques")
      }
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error)
      toast.error("Erreur lors du chargement des statistiques")
    } finally {
      setLoading(false)
    }
  }

  const generatePDFReport = async () => {
    try {
      setLoadingPDF(true)
      const dateRange = getDateRangeForPeriod(selectedPeriod)
      const params = new URLSearchParams()
      
      if (dateRange.startDate) params.append('startDate', dateRange.startDate)
      if (dateRange.endDate) params.append('endDate', dateRange.endDate)
      params.append('period', selectedPeriod)
      
      const response = await fetch(`/api/statistics/pdf?${params.toString()}`)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `rapport-statistiques-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('Rapport PDF généré avec succès')
      } else {
        toast.error('Erreur lors de la génération du PDF')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la génération du PDF')
    } finally {
      setLoadingPDF(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return "text-green-600"
    if (growth < 0) return "text-red-600"
    return "text-gray-600"
  }

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return TrendingUp
    if (growth < 0) return TrendingDown
    return Activity
  }

  const getPeriodLabel = () => {
    const period = predefinedPeriods.find(p => p.value === selectedPeriod)
    if (selectedPeriod === 'custom' && customDateRange.startDate && customDateRange.endDate) {
      return `${customDateRange.startDate} → ${customDateRange.endDate}`
    }
    return period?.label || 'Période sélectionnée'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-sm font-semibold text-gray-900">Aucune donnée</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Les statistiques apparaîtront ici une fois que vous aurez des données.
        </p>
        <Button onClick={fetchStatistics} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header avec contrôles */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Statistiques</h1>
            <p className="text-muted-foreground">
              Analyse détaillée de votre activité freelance
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={generatePDFReport}
              disabled={loadingPDF}
            >
              {loadingPDF ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Rapport PDF
            </Button>
            <Button onClick={fetchStatistics} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Sélecteur de période */}
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Période d'analyse :</Label>
          </div>
          
          <Select
            value={selectedPeriod}
            onValueChange={(value: DatePeriod) => setSelectedPeriod(value)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {predefinedPeriods.map((period) => (
                <SelectItem key={period.value} value={period.value}>
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Dates personnalisées */}
          {selectedPeriod === 'custom' && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Label className="text-xs">Du :</Label>
                <Input
                  type="date"
                  value={customDateRange.startDate}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-auto"
                />
              </div>
              <div className="flex items-center gap-1">
                <Label className="text-xs">Au :</Label>
                <Input
                  type="date"
                  value={customDateRange.endDate}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-auto"
                />
              </div>
            </div>
          )}

          {/* Indicateur de période active */}
          <div className="flex items-center gap-2 ml-auto">
            <Badge variant="outline" className="flex items-center gap-1">
              <Filter className="h-3 w-3" />
              {getPeriodLabel()}
            </Badge>
          </div>
        </div>
      </div>

      {/* Métriques principales KPI */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chiffre d'affaires</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.revenue.total)}</div>
              <div className={`flex items-center text-xs ${getGrowthColor(stats.revenue.growth)}`}>
                {React.createElement(getGrowthIcon(stats.revenue.growth), { className: "mr-1 h-3 w-3" })}
                {formatPercentage(Math.abs(stats.revenue.growth))} vs période précédente
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                En attente: {formatCurrency(stats.revenue.pending)}
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
              <CardTitle className="text-sm font-medium">Marge bénéficiaire</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.performance.profitMargin >= 20 ? 'text-green-600' : stats.performance.profitMargin >= 10 ? 'text-orange-600' : 'text-red-600'}`}>
                {formatPercentage(stats.performance.profitMargin)}
              </div>
              <div className="text-xs text-muted-foreground">
                Bénéfice net: {formatCurrency(stats.revenue.total - stats.expenses.total)}
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
              <CardTitle className="text-sm font-medium">Taux de réussite projets</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.performance.projectSuccessRate >= 80 ? 'text-green-600' : stats.performance.projectSuccessRate >= 60 ? 'text-orange-600' : 'text-red-600'}`}>
                {formatPercentage(stats.performance.projectSuccessRate)}
              </div>
              <div className="text-xs text-muted-foreground">
                {stats.projects.completed}/{stats.projects.total} projets terminés
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
              <CardTitle className="text-sm font-medium">Délai de paiement moyen</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.invoices.averagePaymentDelay <= 30 ? 'text-green-600' : stats.invoices.averagePaymentDelay <= 60 ? 'text-orange-600' : 'text-red-600'}`}>
                {stats.invoices.averagePaymentDelay} j
              </div>
              <div className={`text-xs ${getGrowthColor(-stats.performance.paymentDelayTrend)}`}>
                {stats.performance.paymentDelayTrend > 0 ? '+' : ''}{stats.performance.paymentDelayTrend.toFixed(1)}j vs précédente
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Métriques secondaires */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.clients.total}</div>
              <div className="text-xs text-muted-foreground">
                {stats.clients.active} actifs • {stats.clients.new} nouveaux
              </div>
              <div className="text-xs text-muted-foreground">
                CA/client: {formatCurrency(stats.performance.revenuePerClient)}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Projets</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.projects.total}</div>
              <div className="text-xs text-muted-foreground">
                {stats.projects.inProgress} en cours • {stats.projects.completed} terminés
              </div>
              <div className="text-xs text-muted-foreground">
                Valeur moy.: {formatCurrency(stats.projects.averageValue)}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tâches</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.tasks.total}</div>
              <div className="text-xs text-muted-foreground">
                {formatPercentage(stats.tasks.completionRate)} complétées
              </div>
              {stats.tasks.overdue > 0 && (
                <div className="text-xs text-red-600">
                  {stats.tasks.overdue} en retard
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Factures</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.invoices.total}</div>
              <div className="text-xs text-muted-foreground">
                {stats.invoices.paid} payées • {stats.invoices.pending} en attente
              </div>
              {stats.invoices.overdue > 0 && (
                <div className="text-xs text-red-600">
                  {stats.invoices.overdue} en retard
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Graphiques et analyses détaillées */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Évolution financière */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="mr-2 h-5 w-5" />
                Évolution financière
              </CardTitle>
              <CardDescription>
                Revenus, dépenses et profit par mois
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.monthlyRevenue.slice(-6).map((monthData, index) => (
                  <div key={monthData.month} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{monthData.month}</span>
                      <span className={`font-bold ${monthData.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(monthData.profit)}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      {/* Barre revenus */}
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{
                            width: `${Math.max(5, (monthData.revenue / Math.max(...stats.monthlyRevenue.map(m => m.revenue))) * 100)}%`
                          }}
                        />
                      </div>
                      {/* Barre dépenses */}
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full"
                          style={{
                            width: `${Math.max(5, (monthData.expenses / Math.max(...stats.monthlyRevenue.map(m => m.expenses))) * 100)}%`
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>R: {formatCurrency(monthData.revenue)}</span>
                      <span>D: {formatCurrency(monthData.expenses)}</span>
                      <span>{monthData.invoicesCount} factures</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Projets par type */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <PieChart className="mr-2 h-5 w-5" />
                Analyse des projets
              </CardTitle>
              <CardDescription>
                Répartition par type et performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.projectsByType.map((type, index) => {
                  const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500']
                  const color = colors[index % colors.length]
                  
                  return (
                    <div key={type.type} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${color}`} />
                          <span className="text-sm font-medium">{type.type}</span>
                          <Badge variant="outline">{formatPercentage(type.percentage)}</Badge>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold">{type.count} projet{type.count !== 1 ? 's' : ''}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatCurrency(type.revenue)}
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${color}`}
                          style={{ width: `${type.percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* État des factures détaillé */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>État des factures</CardTitle>
              <CardDescription>
                Suivi détaillé des paiements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{stats.invoices.paid}</div>
                    <div className="text-xs text-muted-foreground">Payées</div>
                    <div className="text-xs text-green-600">
                      {((stats.invoices.paid / stats.invoices.total) * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{stats.invoices.pending}</div>
                    <div className="text-xs text-muted-foreground">En attente</div>
                    <div className="text-xs text-orange-600">
                      {((stats.invoices.pending / stats.invoices.total) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
                
                {stats.invoices.overdue > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium text-red-800">
                        {stats.invoices.overdue} factures en retard
                      </span>
                    </div>
                    <div className="text-xs text-red-600 mt-1">
                      Délai moyen: {stats.invoices.averagePaymentDelay} jours
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t">
                  <div className="flex justify-between text-sm">
                    <span>Taux de recouvrement</span>
                    <span className="font-medium">
                      {((stats.invoices.paid / (stats.invoices.paid + stats.invoices.pending + stats.invoices.overdue)) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Top clients */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Top clients</CardTitle>
              <CardDescription>
                Clients les plus rentables
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.clients.topClients.slice(0, 5).map((client, index) => (
                  <div key={client.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-blue-600">#{index + 1}</span>
                      </div>
                      <div>
                        <div className="font-medium text-sm">{client.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {client.projects} projet{client.projects !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm">{formatCurrency(client.revenue)}</div>
                      <div className="text-xs text-muted-foreground">
                        {((client.revenue / stats.revenue.total) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Dépenses par catégorie */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Dépenses par catégorie</CardTitle>
              <CardDescription>
                Répartition des coûts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.expenses.byCategory.map((category, index) => {
                  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500']
                  const color = colors[index % colors.length]
                  
                  return (
                    <div key={category.category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${color}`} />
                          <span className="text-sm font-medium">{category.category}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold">{formatCurrency(category.amount)}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatPercentage(category.percentage)}
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${color}`}
                          style={{ width: `${category.percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Indicateurs de performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="mr-2 h-5 w-5" />
                Indicateurs de performance
              </CardTitle>
              <CardDescription>
                Métriques clés de votre activité
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Rentabilité</div>
                    <div className={`text-lg font-bold ${stats.projects.profitability >= 20 ? 'text-green-600' : stats.projects.profitability >= 10 ? 'text-orange-600' : 'text-red-600'}`}>
                      {formatPercentage(stats.projects.profitability)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">CA par client</div>
                    <div className="text-lg font-bold">{formatCurrency(stats.performance.revenuePerClient)}</div>
                  </div>
                </div>
                
                <div className="pt-2 border-t">
                  <div className="text-sm text-muted-foreground mb-2">Tendances</div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs">Croissance CA</span>
                      <div className={`flex items-center ${getGrowthColor(stats.revenue.growth)}`}>
                        {React.createElement(getGrowthIcon(stats.revenue.growth), { className: "h-3 w-3 mr-1" })}
                        <span className="text-xs font-medium">{formatPercentage(Math.abs(stats.revenue.growth))}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs">Délais de paiement</span>
                      <div className={`flex items-center ${getGrowthColor(-stats.performance.paymentDelayTrend)}`}>
                        {React.createElement(getGrowthIcon(-stats.performance.paymentDelayTrend), { className: "h-3 w-3 mr-1" })}
                        <span className="text-xs font-medium">{Math.abs(stats.performance.paymentDelayTrend).toFixed(0)}j</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
} 