"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Sparkles,
  Target,
  BarChart3,
  Lightbulb,
  Zap,
  Play
} from "lucide-react"
import { motion } from "motion/react"
import { toast } from "sonner"

interface AIInsight {
  resumeExecutif?: string
  insightsStrategiques?: string[]
  recommendationsPrioritaires?: string[]
  metriquesClés?: string[]
}

interface RawData {
  financial: {
    currentRevenue: number
    revenueGrowth: number
    profit: number
    pendingRevenue: number
  }
  projects: {
    total: number
    active: number
    completed: number
    completionRate: number
  }
  tasks: {
    total: number
    overdue: number
    urgent: number
    completionRate: number
  }
  clients: {
    total: number
  }
  alerts?: string[]
}

type DatePeriod = 'global' | '7d' | '30d' | '90d' | '1y' | 'custom'

interface DateRange {
  startDate: string
  endDate: string
}

interface AIDashboardInsightsProps {
  className?: string
  selectedPeriod?: DatePeriod
  customDateRange?: DateRange
}

export function AIDashboardInsights({ 
  className, 
  selectedPeriod = '30d',
  customDateRange 
}: AIDashboardInsightsProps) {
  const [insights, setInsights] = useState<AIInsight | null>(null)
  const [rawData, setRawData] = useState<RawData | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)

  const fetchInsights = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      
      if (selectedPeriod === 'custom' && customDateRange?.startDate && customDateRange?.endDate) {
        params.append('startDate', customDateRange.startDate)
        params.append('endDate', customDateRange.endDate)
        params.append('period', 'custom')
      } else if (selectedPeriod !== 'global') {
        params.append('period', selectedPeriod)
      }
      
      const url = `/api/ai/analyze${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url)
      
      if (response.ok) {
        const data = await response.json()
        setInsights(data.analysis)
        setRawData(data.rawData)
        setLastUpdated(new Date(data.generatedAt))
        setHasInitialized(true)
        toast.success("Analyse IA mise à jour avec succès")
      } else {
        toast.error("Erreur lors du chargement des insights IA")
      }
    } catch (error) {
      console.error('Erreur insights IA:', error)
      toast.error("Erreur de connexion à l'IA")
    } finally {
      setLoading(false)
    }
  }

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <TrendingUp className="h-4 w-4 text-green-500" />
    if (growth < 0) return <TrendingDown className="h-4 w-4 text-red-500" />
    return <BarChart3 className="h-4 w-4 text-gray-500" />
  }

  const getGrowthColor = (growth: number) => {
    if (growth > 10) return "text-green-600"
    if (growth > 0) return "text-green-500"
    if (growth < -10) return "text-red-600"
    if (growth < 0) return "text-red-500"
    return "text-gray-600"
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' XOF'
  }

  const getPeriodLabel = () => {
    const periodLabels = {
      'global': 'Toutes les données',
      '7d': '7 derniers jours',
      '30d': '30 derniers jours', 
      '90d': '3 derniers mois',
      '1y': '12 derniers mois',
      'custom': 'Période personnalisée'
    }
    return periodLabels[selectedPeriod] || 'Période sélectionnée'
  }

  if (!hasInitialized) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              <div>
                <CardTitle className="text-lg">Insights IA</CardTitle>
                <CardDescription>
                  Analyse intelligente générée par REV AI
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="mb-4">
              <Play className="h-12 w-12 text-purple-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Générer une analyse IA
              </h3>
              <p className="text-sm text-muted-foreground mb-1">
                Obtenez des insights personnalisés sur votre activité
              </p>
              <p className="text-xs text-muted-foreground">
                Période : {getPeriodLabel()}
              </p>
            </div>
            <Button 
              onClick={fetchInsights} 
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Lancer l'analyse IA
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            Insights IA
          </CardTitle>
          <CardDescription>
            Analyse intelligente de votre activité
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
              <span>Analyse en cours...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!insights || !rawData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            Insights IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-8 w-8 text-orange-500 mx-auto mb-2" />
            <p className="text-muted-foreground mb-4">
              Impossible de charger les insights IA
            </p>
            <Button onClick={fetchInsights} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Brain className="h-5 w-5 text-purple-600" />
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full"
              />
            </div>
            <div>
              <CardTitle className="text-lg">Insights IA</CardTitle>
              <CardDescription>
                Analyse intelligente générée par REV AI
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {getPeriodLabel()}
            </Badge>
            <Button
              onClick={fetchInsights}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Résumé Exécutif */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg"
        >
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Résumé Exécutif</h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {insights.resumeExecutif || "Aucun résumé disponible pour le moment."}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Métriques Clés */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-600" />
            Métriques Clés
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.metriquesClés?.map((metric, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white border rounded-lg p-3"
              >
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">
                    {metric}
                  </span>
                </div>
              </motion.div>
            )) || (
              <div className="col-span-2 text-center text-sm text-gray-500 py-4">
                Aucune métrique disponible
              </div>
            )}
          </div>
        </motion.div>

        {/* Insights Stratégiques */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-green-600" />
            Insights Stratégiques
          </h3>
          <div className="space-y-3">
            {insights.insightsStrategiques?.map((insight, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className="flex items-start gap-3 p-3 bg-green-50 rounded-lg"
              >
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">
                  {insight}
                </span>
              </motion.div>
            )) || (
              <div className="text-center text-sm text-gray-500 py-4">
                Aucun insight disponible
              </div>
            )}
          </div>
        </motion.div>

        {/* Recommandations Prioritaires */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-orange-600" />
            Actions Prioritaires
          </h3>
          <div className="space-y-3">
            {insights.recommendationsPrioritaires?.map((recommendation, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg"
              >
                <Zap className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">
                  {recommendation}
                </span>
              </motion.div>
            )) || (
              <div className="text-center text-sm text-gray-500 py-4">
                Aucune recommandation disponible
              </div>
            )}
          </div>
        </motion.div>

        {/* Alertes */}
        {rawData.alerts && rawData.alerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-red-50 border border-red-200 rounded-lg p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <h3 className="font-semibold text-red-800">Alertes Importantes</h3>
            </div>
            <div className="space-y-2">
              {rawData.alerts?.map((alert, index) => (
                <Badge key={index} variant="destructive" className="mr-2">
                  {alert}
                </Badge>
              )) || null}
            </div>
          </motion.div>
        )}

        {/* Données Financières Rapides */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-2 gap-4 pt-4 border-t"
        >
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              {getGrowthIcon(rawData.financial.revenueGrowth)}
              <span className={`text-lg font-bold ${getGrowthColor(rawData.financial.revenueGrowth)}`}>
                {rawData.financial.revenueGrowth > 0 ? '+' : ''}{rawData.financial.revenueGrowth.toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Croissance CA</p>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">
              {formatAmount(rawData.financial.profit)}
            </div>
            <p className="text-xs text-muted-foreground">Profit ({getPeriodLabel()})</p>
          </div>
        </motion.div>

        {/* Footer */}
        {lastUpdated && (
          <div className="text-center pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Dernière analyse : {lastUpdated.toLocaleString('fr-FR')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 