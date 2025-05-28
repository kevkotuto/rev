"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  BarChart3, 
  Users, 
  FolderOpen, 
  FileText, 
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  Brain,
  RefreshCw,
  Zap,
  UserCheck,
  CheckSquare,
  Clock,
  AlertTriangle,
  Calendar,
  Filter
} from "lucide-react"
import { motion } from "motion/react"
import { QuickTaskEditor } from "@/components/quick-task-editor"
import { AIDashboardInsights } from "@/components/ai-dashboard-insights"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import WaveConflictsList from "@/components/wave-conflicts-list"



interface DashboardStats {
  overview: {
    totalClients: number
    totalProjects: number
    totalInvoices: number
    totalExpenses: number
    activeProjects: number
    completedProjects: number
    pendingInvoices: number
    paidInvoices: number
    totalProviders: number
    totalTasks: number
    totalFiles: number
  }
  projectAnalysis: {
    projectsByType: Record<string, number>
    delayAnalysis: {
      onTime: number
      delayed: number
      upcoming: number
      averageDuration: number
    }
    averageProjectValue: number
  }
  financial: {
    totalRevenue: number
    totalExpenses: number
    netProfit: number
    revenueByMonth: Array<{
      month: string
      revenue: number
    }>
  }
  wave?: {
    totalTransactions: number
    totalRevenue: number
    totalExpenses: number
    netAmount: number
    recentTransactions: Array<{
      id: string
      transactionId: string
      type: string
      description: string
      amount: number
      currency: string
      timestamp: string
      counterpartyName?: string
      project?: { id: string; name: string }
      client?: { id: string; name: string }
    }>
  }
  recentActivities: {
    invoices: Array<{
      id: string
      invoiceNumber: string
      amount: number
      status: string
      createdAt: string
      type: string
    }>
    projects: Array<{
      id: string
      name: string
      status: string
      updatedAt: string
      client?: {
        name: string
      }
    }>
  }
}

// Types pour les périodes
type DatePeriod = 'global' | '7d' | '30d' | '90d' | '1y' | 'custom'

interface DateRange {
  startDate: string
  endDate: string
}

const predefinedPeriods = [
  { value: 'global', label: 'Toutes les données' },
  { value: '7d', label: '7 derniers jours' },
  { value: '30d', label: '30 derniers jours' },
  { value: '90d', label: '3 derniers mois' },
  { value: '1y', label: '12 derniers mois' },
  { value: 'custom', label: 'Période personnalisée' }
]

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [waveBalance, setWaveBalance] = useState<{balance: number, currency: string} | null>(null)
  const [waveStats, setWaveStats] = useState<any>(null)
  const [loadingBalance, setLoadingBalance] = useState(false)
  const [loadingWaveStats, setLoadingWaveStats] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState<any>(null)
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)
  
  // États pour les filtres de période
  const [selectedPeriod, setSelectedPeriod] = useState<DatePeriod>('30d')
  const [customDateRange, setCustomDateRange] = useState<DateRange>({
    startDate: '',
    endDate: ''
  })
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false)
  
  // États pour le dialog de création de projet
  const [isCreateProjectDialogOpen, setIsCreateProjectDialogOpen] = useState(false)
  const [clients, setClients] = useState<Array<{id: string, name: string}>>([])
  const [projectFormData, setProjectFormData] = useState({
    name: "",
    description: "",
    status: "IN_PROGRESS",
    type: "CLIENT",
    amount: "",
    clientId: "",
    startDate: "",
    endDate: ""
  })

  useEffect(() => {
    fetchStats()
    fetchWaveBalance()
    fetchWaveStats()
  }, [selectedPeriod, customDateRange])

  useEffect(() => {
    fetchClients()
  }, [])

  // Fonction pour calculer les dates en fonction de la période
  const getDateRangeForPeriod = (period: DatePeriod): { startDate?: string, endDate?: string } => {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    
    switch (period) {
      case 'global':
        return {}
      case '7d':
        const week = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        return { startDate: week.toISOString().split('T')[0], endDate: today }
      case '30d':
        const month = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        return { startDate: month.toISOString().split('T')[0], endDate: today }
      case '90d':
        const quarter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        return { startDate: quarter.toISOString().split('T')[0], endDate: today }
      case '1y':
        const year = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        return { startDate: year.toISOString().split('T')[0], endDate: today }
      case 'custom':
        return customDateRange.startDate && customDateRange.endDate 
          ? { startDate: customDateRange.startDate, endDate: customDateRange.endDate }
          : {}
      default:
        return {}
    }
  }

  const fetchStats = async () => {
    try {
      setLoading(true)
      const dateRange = getDateRangeForPeriod(selectedPeriod)
      const params = new URLSearchParams()
      
      if (dateRange.startDate) params.append('startDate', dateRange.startDate)
      if (dateRange.endDate) params.append('endDate', dateRange.endDate)
      
      const url = `/api/dashboard/stats${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url)
      
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchWaveBalance = async () => {
    setLoadingBalance(true)
    try {
      const response = await fetch('/api/wave/balance')
      if (response.ok) {
        const data = await response.json()
        setWaveBalance(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement du solde Wave:', error)
    } finally {
      setLoadingBalance(false)
    }
  }

  const fetchWaveStats = async () => {
    setLoadingWaveStats(true)
    try {
      const dateRange = getDateRangeForPeriod(selectedPeriod)
      const params = new URLSearchParams()
      
      if (dateRange.startDate) params.append('startDate', dateRange.startDate)
      if (dateRange.endDate) params.append('endDate', dateRange.endDate)
      
      const url = `/api/wave/stats${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url)
      
      if (response.ok) {
        const data = await response.json()
        setWaveStats(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques Wave:', error)
    } finally {
      setLoadingWaveStats(false)
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

  const generateAIAnalysis = async () => {
    setLoadingAnalysis(true)
    try {
      const response = await fetch('/api/ai/business-analysis', {
        method: 'POST'
      })
      if (response.ok) {
        const data = await response.json()
        setAiAnalysis(data)
      }
    } catch (error) {
      console.error('Erreur lors de l\'analyse IA:', error)
    } finally {
      setLoadingAnalysis(false)
    }
  }

  const handleCreateProject = async () => {
    try {
      const projectData = {
        ...projectFormData,
        amount: parseFloat(projectFormData.amount) || 0,
        clientId: projectFormData.clientId === "none" ? null : projectFormData.clientId || null,
        startDate: projectFormData.startDate || null,
        endDate: projectFormData.endDate || null
      }

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
      })

      if (response.ok) {
        toast.success('Projet créé avec succès')
        setIsCreateProjectDialogOpen(false)
        resetProjectForm()
        // Rafraîchir les stats pour voir le nouveau projet
        fetchStats()
      } else {
        toast.error('Erreur lors de la création du projet')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la création du projet')
    }
  }

  const resetProjectForm = () => {
    setProjectFormData({
      name: "",
      description: "",
      status: "IN_PROGRESS",
      type: "CLIENT",
      amount: "",
      clientId: "",
      startDate: "",
      endDate: ""
    })
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
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Erreur lors du chargement des données</p>
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'PENDING': { label: 'En attente', variant: 'secondary' as const },
      'PAID': { label: 'Payé', variant: 'default' as const },
      'OVERDUE': { label: 'En retard', variant: 'destructive' as const },
      'IN_PROGRESS': { label: 'En cours', variant: 'secondary' as const },
      'COMPLETED': { label: 'Terminé', variant: 'default' as const },
      'ON_HOLD': { label: 'En pause', variant: 'outline' as const },
    }
    
    return statusMap[status as keyof typeof statusMap] || { label: status, variant: 'outline' as const }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">Dashboard</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Vue d'ensemble de votre activité freelance
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <Button variant="outline" onClick={generateAIAnalysis} disabled={loadingAnalysis} className="w-full sm:w-auto">
              {loadingAnalysis ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Brain className="mr-2 h-4 w-4" />
              )}
              <span className="hidden sm:inline">Analyse IA</span>
              <span className="sm:hidden">IA</span>
            </Button>
            <Button 
              className="w-full sm:w-auto"
              onClick={() => {
                resetProjectForm()
                setIsCreateProjectDialogOpen(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Nouveau projet</span>
              <span className="sm:hidden">Nouveau</span>
            </Button>
          </div>
        </div>

        {/* Sélecteur de période */}
        <div className="flex flex-col gap-4 p-3 sm:p-4 bg-muted/50 rounded-lg">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Période :</Label>
            </div>
            
            <Select
              value={selectedPeriod}
              onValueChange={(value: DatePeriod) => {
                setSelectedPeriod(value)
                if (value !== 'custom') {
                  setShowCustomDatePicker(false)
                } else {
                  setShowCustomDatePicker(true)
                }
              }}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
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

            {/* Raccourcis rapides */}
            <div className="hidden lg:flex items-center gap-1 flex-wrap">
              {['global', '7d', '30d', '1y'].map((period) => (
                <Button
                  key={period}
                  variant={selectedPeriod === period ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setSelectedPeriod(period as DatePeriod)
                    setShowCustomDatePicker(false)
                  }}
                  className="text-xs h-7"
                >
                  {predefinedPeriods.find(p => p.value === period)?.label}
                </Button>
              ))}
            </div>

            {/* Indicateur de période active */}
            <div className="flex items-center gap-2 sm:ml-auto">
              <Badge variant="outline" className="flex items-center gap-1 text-xs">
                <Filter className="h-3 w-3" />
                <span className="hidden sm:inline">
                  {(() => {
                    const period = predefinedPeriods.find(p => p.value === selectedPeriod)
                    if (selectedPeriod === 'custom' && customDateRange.startDate && customDateRange.endDate) {
                      return `${customDateRange.startDate} → ${customDateRange.endDate}`
                    }
                    return period?.label || 'Période sélectionnée'
                  })()}
                </span>
                <span className="sm:hidden">
                  {(() => {
                    const period = predefinedPeriods.find(p => p.value === selectedPeriod)
                    if (selectedPeriod === 'custom') return 'Custom'
                    return period?.value.toUpperCase() || 'ALL'
                  })()}
                </span>
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchStats()}
                disabled={loading}
                className="h-7 px-2"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Dates personnalisées */}
          {selectedPeriod === 'custom' && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2 border-t">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Label className="text-xs shrink-0">Du :</Label>
                  <Input
                    type="date"
                    value={customDateRange.startDate}
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full sm:w-auto"
                  />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Label className="text-xs shrink-0">Au :</Label>
                  <Input
                    type="date"
                    value={customDateRange.endDate}
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full sm:w-auto"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Informations sur la période */}
      {(selectedPeriod !== 'global' && stats) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    Période active : {predefinedPeriods.find(p => p.value === selectedPeriod)?.label}
                  </span>
                  {selectedPeriod === 'custom' && customDateRange.startDate && customDateRange.endDate && (
                    <span className="text-xs text-blue-700">
                      ({customDateRange.startDate} → {customDateRange.endDate})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-blue-700">
                  <span>{stats.recentActivities.invoices.length} factures</span>
                  <span>{stats.recentActivities.projects.length} projets</span>
                  <span className="font-medium">{formatCurrency(stats.financial.totalRevenue)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.overview.totalClients}</div>
              <p className="text-xs text-muted-foreground">
                Total des clients
              </p>
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
              <CardTitle className="text-sm font-medium">Projets</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.overview.activeProjects}</div>
              <p className="text-xs text-muted-foreground">
                {stats.overview.totalProjects} au total
              </p>
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
              <CardTitle className="text-sm font-medium">Revenus</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.financial.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                Total des revenus
              </p>
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
              <CardTitle className="text-sm font-medium">Bénéfice</CardTitle>
              {stats.financial.netProfit >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.financial.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(stats.financial.netProfit)}
              </div>
              <p className="text-xs text-muted-foreground">
                Revenus - Dépenses
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Carte Solde Wave */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Solde Wave</CardTitle>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-orange-500" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    fetchWaveBalance()
                    fetchWaveStats()
                  }}
                  disabled={loadingBalance || loadingWaveStats}
                  className="h-6 w-6 p-0"
                >
                  <RefreshCw className={`h-3 w-3 ${loadingBalance || loadingWaveStats ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {waveBalance ? (
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: waveBalance.currency,
                      minimumFractionDigits: 0,
                    }).format(waveBalance.balance)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Solde disponible • Mis à jour: {new Date().toLocaleTimeString('fr-FR')}
                  </p>
                </div>
              ) : (
                <div>
                  <div className="text-lg text-muted-foreground">-</div>
                  <p className="text-xs text-muted-foreground">
                    {loadingBalance ? 'Chargement...' : 'Configurer Wave CI'}
                  </p>
                  {!loadingBalance && (
                    <button 
                      onClick={() => {
                        fetchWaveBalance()
                        fetchWaveStats()
                      }}
                      className="text-xs text-orange-600 hover:text-orange-700 mt-1"
                    >
                      Tester la connexion
                    </button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Section Analyse IA */}
      {aiAnalysis && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-600" />
                Analyse intelligente de votre activité
              </CardTitle>
              <CardDescription>
                {aiAnalysis.analysis.summary}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-medium mb-2">🔍 Insights</h4>
                  <ul className="space-y-1 text-sm">
                    {aiAnalysis.analysis.insights.map((insight: string, index: number) => (
                      <li key={index} className="text-muted-foreground">{insight}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">💡 Recommandations</h4>
                  <ul className="space-y-1 text-sm">
                    {aiAnalysis.analysis.recommendations.map((rec: string, index: number) => (
                      <li key={index} className="text-muted-foreground">{rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Stats secondaires et analyse de projets */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Prestataires</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.overview.totalProviders}</div>
              <p className="text-xs text-muted-foreground">
                Collaborateurs actifs
              </p>
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
              <CardTitle className="text-sm font-medium">Tâches</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.overview.totalTasks}</div>
              <p className="text-xs text-muted-foreground">
                Tâches créées
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fichiers</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.overview.totalFiles}</div>
              <p className="text-xs text-muted-foreground">
                Documents stockés
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Délais</CardTitle>
              {stats.projectAnalysis.delayAnalysis.delayed > 0 ? (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              ) : (
                <Clock className="h-4 w-4 text-green-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.projectAnalysis.delayAnalysis.delayed > 0 ? 'text-red-500' : 'text-green-500'}`}>
                {stats.projectAnalysis.delayAnalysis.delayed}
              </div>
              <p className="text-xs text-muted-foreground">
                Projets en retard
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Analyse détaillée des projets */}
      <div className="grid gap-4 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Analyse des projets</CardTitle>
              <CardDescription>
                Répartition et performance de vos projets
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Valeur moyenne par projet</span>
                  <span className="font-medium">{formatCurrency(stats.projectAnalysis.averageProjectValue)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Durée moyenne (terminés)</span>
                  <span className="font-medium">{stats.projectAnalysis.delayAnalysis.averageDuration} jours</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Répartition par type</h4>
                {Object.entries(stats.projectAnalysis.projectsByType).map(([type, count]) => (
                  <div key={type} className="flex justify-between text-sm">
                    <span>{type === 'CLIENT' ? 'Projets clients' : 'Projets personnels'}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">État des délais</h4>
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">À temps / Terminés</span>
                  <span className="font-medium">{stats.projectAnalysis.delayAnalysis.onTime}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-orange-600">À venir</span>
                  <span className="font-medium">{stats.projectAnalysis.delayAnalysis.upcoming}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-red-600">En retard</span>
                  <span className="font-medium">{stats.projectAnalysis.delayAnalysis.delayed}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Tendances financières</CardTitle>
              <CardDescription>
                Évolution de vos revenus sur 6 mois
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.financial.revenueByMonth.map((monthData, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{monthData.month}</span>
                    <span className="font-medium">{formatCurrency(monthData.revenue)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Section Wave Analytics */}
      {waveStats && waveStats.totalTransactions > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3 }}
        >
          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-orange-600" />
                Analytics Wave
                <Badge variant="outline" className="ml-auto">
                  {waveStats.totalTransactions} transactions assignées
                </Badge>
              </CardTitle>
              <CardDescription>
                Analyse de vos transactions Wave assignées pour la période sélectionnée
                {waveStats.period?.totalDays && (
                  <span className="ml-2 text-orange-600">
                    • {waveStats.period.totalDays} jours
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Métriques principales */}
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-4">
                <div className="text-center p-3 sm:p-4 bg-white rounded-lg border">
                  <div className="text-xl sm:text-2xl font-bold text-green-600">
                    {formatCurrency(waveStats.totalRevenue)}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Revenus Wave</p>
                  <p className="text-xs text-green-600 mt-1">
                    {waveStats.transactionsByType.revenue} transactions
                  </p>
                </div>
                <div className="text-center p-3 sm:p-4 bg-white rounded-lg border">
                  <div className="text-xl sm:text-2xl font-bold text-red-600">
                    {formatCurrency(waveStats.totalExpenses)}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Dépenses Wave</p>
                  <p className="text-xs text-red-600 mt-1">
                    {waveStats.transactionsByType.expense} transactions
                  </p>
                </div>
                <div className="text-center p-3 sm:p-4 bg-white rounded-lg border">
                  <div className={`text-xl sm:text-2xl font-bold ${waveStats.netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(waveStats.netAmount)}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Net Wave</p>
                  <p className={`text-xs mt-1 ${waveStats.netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {waveStats.netAmount >= 0 ? 'Bénéfice' : 'Déficit'}
                  </p>
                </div>
                <div className="text-center p-3 sm:p-4 bg-white rounded-lg border">
                  <div className="text-xl sm:text-2xl font-bold text-blue-600">
                    {waveStats.period?.totalDays ? 
                      Math.round(waveStats.totalTransactions / waveStats.period.totalDays * 7) : 
                      waveStats.totalTransactions
                    }
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {waveStats.period?.totalDays ? 'Transactions/semaine' : 'Total transactions'}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Moyenne calculée
                  </p>
                </div>
              </div>

              {/* Top projets et clients */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Top projets */}
                {waveStats.projectStats.length > 0 && (
                  <div className="bg-white rounded-lg border p-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-blue-600" />
                      Top projets Wave
                    </h4>
                    <div className="space-y-2">
                      {waveStats.projectStats.slice(0, 3).map((project: any, index: number) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{project.projectName}</p>
                            <p className="text-xs text-muted-foreground">
                              {project.transactionCount} transactions
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`font-medium text-sm ${project.totalAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(Math.abs(project.totalAmount))}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Net: {formatCurrency(project.revenue - project.expenses)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top clients */}
                {waveStats.clientStats.length > 0 && (
                  <div className="bg-white rounded-lg border p-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4 text-green-600" />
                      Top clients Wave
                    </h4>
                    <div className="space-y-2">
                      {waveStats.clientStats.slice(0, 3).map((client: any, index: number) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{client.clientName}</p>
                            <p className="text-xs text-muted-foreground">
                              {client.transactionCount} transactions
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-sm text-green-600">
                              {formatCurrency(client.revenue)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Revenus
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top prestataires */}
                {waveStats.providerStats.length > 0 && (
                  <div className="bg-white rounded-lg border p-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-purple-600" />
                      Top prestataires Wave
                    </h4>
                    <div className="space-y-2">
                      {waveStats.providerStats.slice(0, 3).map((provider: any, index: number) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{provider.providerName}</p>
                            <p className="text-xs text-muted-foreground">
                              {provider.transactionCount} paiements
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-sm text-red-600">
                              {formatCurrency(provider.expenses)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Payé
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Évolution temporelle */}
                {Object.keys(waveStats.timeSeriesData).length > 0 && (
                  <div className="bg-white rounded-lg border p-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-orange-600" />
                      Évolution Wave
                    </h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {Object.entries(waveStats.timeSeriesData)
                        .sort(([a], [b]) => b.localeCompare(a))
                        .slice(0, 5)
                        .map(([period, data]: [string, any]) => (
                        <div key={period} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {new Date(period).toLocaleDateString('fr-FR')}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-green-600">+{formatCurrency(data.revenue)}</span>
                            <span className="text-red-600">-{formatCurrency(data.expenses)}</span>
                            <span className={`font-medium ${data.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              = {formatCurrency(Math.abs(data.net))}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions rapides */}
              <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.location.href = '/wave-transactions'}
                  className="flex items-center gap-2"
                >
                  <Zap className="h-4 w-4" />
                  Gérer les transactions Wave
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    fetchWaveBalance()
                    fetchWaveStats()
                  }}
                  disabled={loadingWaveStats}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingWaveStats ? 'animate-spin' : ''}`} />
                  Actualiser les données
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Message si pas de données Wave */}
      {waveStats && waveStats.totalTransactions === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3 }}
        >
          <Card className="border-orange-200 bg-orange-50/50">
            <CardContent className="text-center py-8">
              <Zap className="mx-auto h-12 w-12 text-orange-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucune transaction Wave assignée</h3>
              <p className="text-muted-foreground mb-4">
                {selectedPeriod === 'global' 
                  ? 'Vous n\'avez pas encore assigné de transactions Wave à votre comptabilité.'
                  : `Aucune transaction Wave assignée pour la période sélectionnée (${predefinedPeriods.find(p => p.value === selectedPeriod)?.label}).`
                }
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button 
                  onClick={() => window.location.href = '/wave-transactions'}
                  className="flex items-center gap-2"
                >
                  <Zap className="h-4 w-4" />
                  Assigner des transactions Wave
                </Button>
                {selectedPeriod !== 'global' && (
                  <Button 
                    variant="outline"
                    onClick={() => setSelectedPeriod('global')}
                    className="flex items-center gap-2"
                  >
                    <Calendar className="h-4 w-4" />
                    Voir toutes les données
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Section IA et Tâches */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Insights IA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <AIDashboardInsights 
            selectedPeriod={selectedPeriod}
            customDateRange={customDateRange}
          />
        </motion.div>

        {/* Tâches rapides */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <QuickTaskEditor maxTasks={8} />
        </motion.div>
      </div>

      {/* Recent Activities */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Factures récentes</CardTitle>
              <CardDescription>
                Vos dernières factures créées
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.recentActivities.invoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{invoice.invoiceNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(invoice.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(invoice.amount)}</p>
                      <Badge variant={getStatusBadge(invoice.status).variant}>
                        {getStatusBadge(invoice.status).label}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Projets récents</CardTitle>
              <CardDescription>
                Vos derniers projets mis à jour
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.recentActivities.projects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{project.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {project.client?.name || 'Projet personnel'}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={getStatusBadge(project.status).variant}>
                        {getStatusBadge(project.status).label}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(project.updatedAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Wave Conflicts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Conflits de transactions</CardTitle>
            <CardDescription>
              Liste des transactions suspectes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WaveConflictsList />
          </CardContent>
        </Card>
      </motion.div>

      {/* Dialog de création de projet */}
      <Dialog open={isCreateProjectDialogOpen} onOpenChange={setIsCreateProjectDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Nouveau projet</DialogTitle>
            <DialogDescription>
              Créez un nouveau projet pour votre portefeuille.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[65vh] px-1">
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="project-name">Nom du projet *</Label>
                <Input
                  id="project-name"
                  value={projectFormData.name}
                  onChange={(e) => setProjectFormData({...projectFormData, name: e.target.value})}
                  placeholder="Nom du projet"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="project-description">Description</Label>
                <Textarea
                  id="project-description"
                  value={projectFormData.description}
                  onChange={(e) => setProjectFormData({...projectFormData, description: e.target.value})}
                  placeholder="Description du projet"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="project-status">Statut</Label>
                  <Select value={projectFormData.status} onValueChange={(value) => setProjectFormData({...projectFormData, status: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                      <SelectItem value="COMPLETED">Terminé</SelectItem>
                      <SelectItem value="ON_HOLD">En pause</SelectItem>
                      <SelectItem value="CANCELLED">Annulé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="project-type">Type</Label>
                  <Select value={projectFormData.type} onValueChange={(value) => setProjectFormData({...projectFormData, type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERSONAL">Personnel</SelectItem>
                      <SelectItem value="CLIENT">Client</SelectItem>
                      <SelectItem value="DEVELOPMENT">Développement</SelectItem>
                      <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                      <SelectItem value="CONSULTING">Conseil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="project-amount">Montant (XOF)</Label>
                  <Input
                    id="project-amount"
                    type="number"
                    value={projectFormData.amount}
                    onChange={(e) => setProjectFormData({...projectFormData, amount: e.target.value})}
                    placeholder="0"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="project-client">Client</Label>
                  <Select value={projectFormData.clientId} onValueChange={(value) => setProjectFormData({...projectFormData, clientId: value})}>
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="project-startDate">Date de début</Label>
                  <Input
                    id="project-startDate"
                    type="date"
                    value={projectFormData.startDate}
                    onChange={(e) => setProjectFormData({...projectFormData, startDate: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="project-endDate">Date de fin</Label>
                  <Input
                    id="project-endDate"
                    type="date"
                    value={projectFormData.endDate}
                    onChange={(e) => setProjectFormData({...projectFormData, endDate: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsCreateProjectDialogOpen(false)} className="w-full sm:w-auto">
              Annuler
            </Button>
            <Button onClick={handleCreateProject} disabled={!projectFormData.name} className="w-full sm:w-auto">
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
} 