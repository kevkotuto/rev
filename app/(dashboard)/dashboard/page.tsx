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
  Plus
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

  useEffect(() => {
    fetchStats()
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
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau projet
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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