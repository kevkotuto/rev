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
  AlertTriangle
} from "lucide-react"
import { motion } from "motion/react"
import { QuickTaskEditor } from "@/components/quick-task-editor"
import { AIDashboardInsights } from "@/components/ai-dashboard-insights"


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

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [waveBalance, setWaveBalance] = useState<{balance: number, currency: string} | null>(null)
  const [loadingBalance, setLoadingBalance] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState<any>(null)
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)

  useEffect(() => {
    fetchStats()
    fetchWaveBalance()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats')
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Vue d'ensemble de votre activité freelance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={generateAIAnalysis} disabled={loadingAnalysis}>
            {loadingAnalysis ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Brain className="mr-2 h-4 w-4" />
            )}
            Analyse IA
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau projet
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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
                {loadingBalance && <RefreshCw className="h-3 w-3 animate-spin" />}
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
                    Solde disponible • Mis à jour: {new Date(waveBalance.lastUpdated).toLocaleTimeString('fr-FR')}
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
                      onClick={fetchWaveBalance}
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

      {/* Section IA et Tâches */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Insights IA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <AIDashboardInsights />
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
      <div className="grid gap-4 md:grid-cols-2">
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

    </div>
  )
} 