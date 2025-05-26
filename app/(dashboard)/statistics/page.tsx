"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
  Activity
} from "lucide-react"
import { motion } from "motion/react"

interface Statistics {
  revenue: {
    total: number
    thisMonth: number
    lastMonth: number
    growth: number
  }
  clients: {
    total: number
    active: number
    new: number
  }
  projects: {
    total: number
    completed: number
    inProgress: number
    onHold: number
  }
  tasks: {
    total: number
    completed: number
    pending: number
  }
  expenses: {
    total: number
    thisMonth: number
    lastMonth: number
  }
  invoices: {
    total: number
    paid: number
    pending: number
    overdue: number
  }
  monthlyRevenue: Array<{
    month: string
    revenue: number
    expenses: number
  }>
  projectsByType: Array<{
    type: string
    count: number
    revenue: number
  }>
}

export default function StatisticsPage() {
  const [stats, setStats] = useState<Statistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState("thisYear")

  useEffect(() => {
    fetchStatistics()
  }, [period])

  const fetchStatistics = async () => {
    try {
      const response = await fetch(`/api/statistics?period=${period}`)
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount)
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
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Statistiques</h1>
          <p className="text-muted-foreground">
            Vue d'ensemble de votre activité
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            title="Sélectionner la période"
          >
            <option value="thisMonth">Ce mois</option>
            <option value="lastMonth">Mois dernier</option>
            <option value="thisYear">Cette année</option>
            <option value="lastYear">Année dernière</option>
          </select>
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
              <CardTitle className="text-sm font-medium">Chiffre d'affaires</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.revenue.total)}</div>
              <div className={`flex items-center text-xs ${getGrowthColor(stats.revenue.growth)}`}>
                {React.createElement(getGrowthIcon(stats.revenue.growth), { className: "mr-1 h-3 w-3" })}
                {Math.abs(stats.revenue.growth).toFixed(1)}% vs mois dernier
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
              <CardTitle className="text-sm font-medium">Clients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.clients.total}</div>
              <div className="text-xs text-muted-foreground">
                {stats.clients.active} actifs • {stats.clients.new} nouveaux
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
              <CardTitle className="text-sm font-medium">Projets</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.projects.total}</div>
              <div className="text-xs text-muted-foreground">
                {stats.projects.completed} terminés • {stats.projects.inProgress} en cours
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
              <CardTitle className="text-sm font-medium">Tâches</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.tasks.total}</div>
              <div className="text-xs text-muted-foreground">
                {stats.tasks.completed} terminées • {stats.tasks.pending} en attente
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Graphiques et détails */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Revenus vs Dépenses */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="mr-2 h-5 w-5" />
                Revenus vs Dépenses
              </CardTitle>
              <CardDescription>
                Évolution mensuelle de vos finances
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.monthlyRevenue.map((month, index) => (
                  <div key={month.month} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{month.month}</span>
                      <span className="font-medium">
                        {formatCurrency(month.revenue - month.expenses)}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{
                            width: `${Math.max(5, (month.revenue / Math.max(...stats.monthlyRevenue.map(m => m.revenue))) * 100)}%`
                          }}
                        />
                      </div>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full"
                          style={{
                            width: `${Math.max(5, (month.expenses / Math.max(...stats.monthlyRevenue.map(m => m.expenses))) * 100)}%`
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Revenus: {formatCurrency(month.revenue)}</span>
                      <span>Dépenses: {formatCurrency(month.expenses)}</span>
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
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <PieChart className="mr-2 h-5 w-5" />
                Projets par type
              </CardTitle>
              <CardDescription>
                Répartition de vos projets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.projectsByType.map((type, index) => {
                  const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500']
                  const color = colors[index % colors.length]
                  
                  return (
                    <div key={type.type} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${color}`} />
                        <span className="text-sm font-medium">{type.type}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold">{type.count} projet{type.count !== 1 ? 's' : ''}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(type.revenue)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* État des factures */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>État des factures</CardTitle>
              <CardDescription>
                Suivi de vos facturations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Payées</span>
                  <div className="flex items-center space-x-2">
                    <Badge variant="default">{stats.invoices.paid}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {((stats.invoices.paid / stats.invoices.total) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">En attente</span>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">{stats.invoices.pending}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {((stats.invoices.pending / stats.invoices.total) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">En retard</span>
                  <div className="flex items-center space-x-2">
                    <Badge variant="destructive">{stats.invoices.overdue}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {((stats.invoices.overdue / stats.invoices.total) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Résumé financier */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Résumé financier</CardTitle>
              <CardDescription>
                Vue d'ensemble de vos finances
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Revenus ce mois</span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(stats.revenue.thisMonth)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">Dépenses ce mois</span>
                  <span className="font-bold text-red-600">
                    {formatCurrency(stats.expenses.thisMonth)}
                  </span>
                </div>
                
                <hr />
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Bénéfice ce mois</span>
                  <span className={`font-bold ${
                    stats.revenue.thisMonth - stats.expenses.thisMonth > 0 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {formatCurrency(stats.revenue.thisMonth - stats.expenses.thisMonth)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">Marge</span>
                  <span className="text-sm text-muted-foreground">
                    {stats.revenue.thisMonth > 0 
                      ? (((stats.revenue.thisMonth - stats.expenses.thisMonth) / stats.revenue.thisMonth) * 100).toFixed(1)
                      : 0
                    }%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
} 