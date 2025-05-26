"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CreditCard, 
  PiggyBank,
  Receipt,
  FileText,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Download
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { motion } from "motion/react"
import { toast } from "sonner"

interface FinanceData {
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  pendingInvoices: number
  paidInvoices: number
  overdueInvoices: number
  monthlyRevenue: Array<{ month: string; revenue: number; expenses: number }>
  revenueByProject: Array<{ name: string; amount: number; percentage: number }>
  expensesByCategory: Array<{ category: string; amount: number; percentage: number }>
  cashFlow: {
    thisMonth: number
    lastMonth: number
    growth: number
  }
  invoiceStats: {
    total: number
    paid: number
    pending: number
    overdue: number
  }
}

export default function FinancePage() {
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState("thisYear")
  const [financeData, setFinanceData] = useState<FinanceData>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    pendingInvoices: 0,
    paidInvoices: 0,
    overdueInvoices: 0,
    monthlyRevenue: [],
    revenueByProject: [],
    expensesByCategory: [],
    cashFlow: { thisMonth: 0, lastMonth: 0, growth: 0 },
    invoiceStats: { total: 0, paid: 0, pending: 0, overdue: 0 }
  })

  useEffect(() => {
    fetchFinanceData()
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
      toast.error('Erreur lors du chargement des données financières')
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

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
  }

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
          <h1 className="text-3xl font-bold tracking-tight">Finance</h1>
          <p className="text-muted-foreground">
            Vue d'ensemble de vos finances et performances
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="thisMonth">Ce mois</SelectItem>
              <SelectItem value="lastMonth">Mois dernier</SelectItem>
              <SelectItem value="thisYear">Cette année</SelectItem>
              <SelectItem value="lastYear">Année dernière</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exporter
          </Button>
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
              <div className="text-2xl font-bold">{formatCurrency(financeData.totalRevenue)}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {financeData.cashFlow.growth >= 0 ? (
                  <ArrowUpRight className="mr-1 h-3 w-3 text-green-500" />
                ) : (
                  <ArrowDownRight className="mr-1 h-3 w-3 text-red-500" />
                )}
                <span className={financeData.cashFlow.growth >= 0 ? "text-green-500" : "text-red-500"}>
                  {formatPercentage(financeData.cashFlow.growth)}
                </span>
                <span className="ml-1">vs période précédente</span>
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
              <CardTitle className="text-sm font-medium">Dépenses</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(financeData.totalExpenses)}</div>
              <p className="text-xs text-muted-foreground">
                {((financeData.totalExpenses / financeData.totalRevenue) * 100).toFixed(1)}% du CA
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
              <CardTitle className="text-sm font-medium">Bénéfice net</CardTitle>
              <PiggyBank className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(financeData.netProfit)}</div>
              <p className="text-xs text-muted-foreground">
                Marge: {((financeData.netProfit / financeData.totalRevenue) * 100).toFixed(1)}%
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
              <CardTitle className="text-sm font-medium">Factures en attente</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(financeData.pendingInvoices)}</div>
              <p className="text-xs text-muted-foreground">
                {financeData.invoiceStats.pending} facture(s)
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Évolution mensuelle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Évolution mensuelle</CardTitle>
              <CardDescription>Revenus vs Dépenses par mois</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {financeData.monthlyRevenue.map((month, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{month.month}</span>
                      <span className="text-muted-foreground">
                        {formatCurrency(month.revenue - month.expenses)}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-xs text-muted-foreground">Revenus</span>
                        <span className="text-xs font-medium ml-auto">
                          {formatCurrency(month.revenue)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${(month.revenue / Math.max(...financeData.monthlyRevenue.map(m => m.revenue))) * 100}%` }}
                        ></div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="text-xs text-muted-foreground">Dépenses</span>
                        <span className="text-xs font-medium ml-auto">
                          {formatCurrency(month.expenses)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-red-500 h-2 rounded-full" 
                          style={{ width: `${(month.expenses / Math.max(...financeData.monthlyRevenue.map(m => m.revenue))) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* État des factures */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>État des factures</CardTitle>
              <CardDescription>Répartition par statut</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Payées</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{financeData.invoiceStats.paid}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(financeData.paidInvoices)}
                    </div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${(financeData.invoiceStats.paid / financeData.invoiceStats.total) * 100}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm">En attente</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{financeData.invoiceStats.pending}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(financeData.pendingInvoices)}
                    </div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full" 
                    style={{ width: `${(financeData.invoiceStats.pending / financeData.invoiceStats.total) * 100}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-sm">En retard</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{financeData.invoiceStats.overdue}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(financeData.overdueInvoices)}
                    </div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full" 
                    style={{ width: `${(financeData.invoiceStats.overdue / financeData.invoiceStats.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Revenus par projet */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Revenus par projet</CardTitle>
              <CardDescription>Top projets générateurs de revenus</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {financeData.revenueByProject.slice(0, 5).map((project, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-blue-600">
                          {index + 1}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium">{project.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {project.percentage.toFixed(1)}% du total
                        </div>
                      </div>
                    </div>
                    <div className="text-sm font-medium">
                      {formatCurrency(project.amount)}
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
          transition={{ delay: 0.8 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Dépenses par catégorie</CardTitle>
              <CardDescription>Répartition des coûts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {financeData.expensesByCategory.slice(0, 5).map((expense, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{expense.category}</span>
                      <span className="text-sm">{formatCurrency(expense.amount)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-red-500 h-2 rounded-full" 
                        style={{ width: `${expense.percentage}%` }}
                      ></div>
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