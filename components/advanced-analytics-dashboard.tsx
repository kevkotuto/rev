"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Users,
  FolderOpen,
  Clock,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Target,
  Zap,
  PieChart
} from "lucide-react"
import { motion } from "motion/react"
import { toast } from "sonner"

interface AdvancedAnalytics {
  kpis: {
    revenueGrowth: number
    profitMargin: number
    taskCompletionRate: number
    averageProjectValue: number
    activeProjectsCount: number
    monthlyRevenueAverage: number
  }
  financial: {
    currentRevenue: number
    previousRevenue: number
    revenueGrowth: number
    totalRevenue: number
    pendingRevenue: number
    currentExpenses: number
    profitMargin: number
    monthlyRevenue: Array<{
      month: string
      revenue: number
      monthName: string
    }>
    expensesByCategory: Array<{
      category: string
      amount: number
    }>
  }
  projects: {
    total: number
    active: number
    completed: number
    averageValue: number
    completionRate: number
  }
  tasks: {
    total: number
    completed: number
    overdue: number
    urgent: number
    completionRate: number
  }
  trends: {
    projectsThisMonth: number
    tasksCompletedThisMonth: number
    revenueGrowthTrend: 'up' | 'down' | 'stable'
  }
  alerts: string[]
}

interface AdvancedAnalyticsDashboardProps {
  className?: string
}

export function AdvancedAnalyticsDashboard({ className }: AdvancedAnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<AdvancedAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/analytics/dashboard')
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
        setLastUpdated(new Date(data.generatedAt))
      } else {
        toast.error("Erreur lors du chargement des analytics")
      }
    } catch (error) {
      console.error('Erreur analytics:', error)
      toast.error("Erreur de connexion aux analytics")
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' XOF'
  }

  const getGrowthIcon = (growth: number, trend?: string) => {
    if (trend === 'up' || growth > 0) {
      return <TrendingUp className="h-4 w-4 text-green-500" />
    }
    if (trend === 'down' || growth < 0) {
      return <TrendingDown className="h-4 w-4 text-red-500" />
    }
    return <BarChart3 className="h-4 w-4 text-gray-500" />
  }

  const getGrowthColor = (growth: number) => {
    if (growth > 10) return "text-green-600"
    if (growth > 0) return "text-green-500"
    if (growth < -10) return "text-red-600"
    if (growth < 0) return "text-red-500"
    return "text-gray-600"
  }

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span>Chargement des analytics avancées...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <AlertTriangle className="h-8 w-8 text-orange-500 mx-auto mb-2" />
              <p className="text-muted-foreground mb-4">
                Impossible de charger les analytics
              </p>
              <Button onClick={fetchAnalytics} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Réessayer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header avec bouton refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics Avancées</h2>
          <p className="text-muted-foreground">
            Vue détaillée de vos performances business
          </p>
        </div>
        <Button onClick={fetchAnalytics} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Alertes importantes */}
      {analytics.alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-lg p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h3 className="font-semibold text-red-800">Alertes Importantes</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {analytics.alerts.map((alert, index) => (
              <Badge key={index} variant="destructive">
                {alert}
              </Badge>
            ))}
          </div>
        </motion.div>
      )}

      {/* KPIs principaux */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Croissance CA</CardTitle>
              {getGrowthIcon(analytics.kpis.revenueGrowth)}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getGrowthColor(analytics.kpis.revenueGrowth)}`}>
                {analytics.kpis.revenueGrowth > 0 ? '+' : ''}{analytics.kpis.revenueGrowth.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                vs mois précédent
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Marge Bénéficiaire</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${analytics.kpis.profitMargin > 20 ? 'text-green-600' : analytics.kpis.profitMargin > 10 ? 'text-orange-500' : 'text-red-500'}`}>
                {analytics.kpis.profitMargin.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.kpis.profitMargin > 20 ? 'Excellente' : analytics.kpis.profitMargin > 10 ? 'Correcte' : 'À améliorer'}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Tâches</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${analytics.kpis.taskCompletionRate > 80 ? 'text-green-600' : analytics.kpis.taskCompletionRate > 60 ? 'text-orange-500' : 'text-red-500'}`}>
                {analytics.kpis.taskCompletionRate.toFixed(0)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.tasks.completed}/{analytics.tasks.total} tâches
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Revenus et finances */}
      <div className="grid gap-4 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Performance Financière
              </CardTitle>
              <CardDescription>Revenus et tendances</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Revenus actuels</span>
                <span className="font-semibold">{formatCurrency(analytics.financial.currentRevenue)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">En attente</span>
                <span className="font-semibold text-orange-600">{formatCurrency(analytics.financial.pendingRevenue)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Dépenses</span>
                <span className="font-semibold text-red-600">{formatCurrency(analytics.financial.currentExpenses)}</span>
              </div>
              
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Profit</span>
                  <span className={`font-bold ${(analytics.financial.currentRevenue - analytics.financial.currentExpenses) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(analytics.financial.currentRevenue - analytics.financial.currentExpenses)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-blue-600" />
                Projets & Tâches
              </CardTitle>
              <CardDescription>Vue d'ensemble de l'activité</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{analytics.projects.active}</div>
                  <p className="text-xs text-muted-foreground">Projets actifs</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{analytics.projects.completed}</div>
                  <p className="text-xs text-muted-foreground">Projets terminés</p>
                </div>
              </div>
              
              <div className="pt-2">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Taux de réussite</span>
                  <span className="font-semibold">{analytics.projects.completionRate.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${analytics.projects.completionRate}%` }}
                  ></div>
                </div>
              </div>

              {analytics.tasks.overdue > 0 && (
                <div className="bg-red-50 border border-red-200 rounded p-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-red-700">
                      {analytics.tasks.overdue} tâche(s) en retard
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Dépenses par catégorie */}
      {analytics.financial.expensesByCategory.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-purple-600" />
                Répartition des Dépenses
              </CardTitle>
              <CardDescription>Top catégories de dépenses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.financial.expensesByCategory.slice(0, 5).map((category, index) => {
                  const percentage = (category.amount / analytics.financial.currentExpenses) * 100
                  return (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-3 h-3 bg-blue-500 rounded-full" style={{ 
                          backgroundColor: `hsl(${index * 60}, 65%, 55%)` 
                        }}></div>
                        <span className="text-sm font-medium">{category.category}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">{formatCurrency(category.amount)}</div>
                        <div className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Footer */}
      {lastUpdated && (
        <div className="text-center pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Dernière mise à jour : {lastUpdated.toLocaleString('fr-FR')}
          </p>
        </div>
      )}
    </div>
  )
} 