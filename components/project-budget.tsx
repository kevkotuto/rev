"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Receipt,
  AlertCircle,
  CheckCircle
} from "lucide-react"
import { motion } from "motion/react"
import { toast } from "sonner"

interface BudgetData {
  projectAmount: number
  paidInvoices: number
  providerCosts: number
  paidProviders: number
  unpaidProviders: number
  projectExpenses: number
  totalCosts: number
  netProfit: number
  profitMargin: number
  providers: Array<{
    id: string
    provider: {
      id: string
      name: string
      role?: string
      photo?: string
    }
    amount: number
    isPaid: boolean
    paidAt?: string
  }>
  expenses: Array<{
    id: string
    description: string
    amount: number
    category: string
    date: string
  }>
}

interface ProjectBudgetProps {
  projectId: string
}

export function ProjectBudget({ projectId }: ProjectBudgetProps) {
  const [budget, setBudget] = useState<BudgetData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBudget()
  }, [projectId])

  const fetchBudget = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/budget`)
      if (response.ok) {
        const data = await response.json()
        setBudget(data)
      } else {
        toast.error('Erreur lors du chargement du budget')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors du chargement du budget')
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!budget) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-sm font-semibold">Erreur de chargement</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Impossible de charger les données du budget.
        </p>
      </div>
    )
  }

  const profitabilityColor = budget.netProfit >= 0 ? "text-green-600" : "text-red-600"
  const profitabilityIcon = budget.netProfit >= 0 ? TrendingUp : TrendingDown

  return (
    <div className="space-y-6">
      {/* Métriques principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Budget projet</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(budget.projectAmount)}</div>
              <p className="text-xs text-muted-foreground">
                Montant total du projet
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
              <CardTitle className="text-sm font-medium">Revenus encaissés</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(budget.paidInvoices)}</div>
              <p className="text-xs text-muted-foreground">
                {((budget.paidInvoices / budget.projectAmount) * 100).toFixed(1)}% du budget
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
              <CardTitle className="text-sm font-medium">Coûts totaux</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(budget.totalCosts)}</div>
              <p className="text-xs text-muted-foreground">
                Prestataires + Dépenses
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
              <CardTitle className="text-sm font-medium">Bénéfice net</CardTitle>
              {React.createElement(profitabilityIcon, { className: `h-4 w-4 ${profitabilityColor}` })}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${profitabilityColor}`}>
                {formatCurrency(budget.netProfit)}
              </div>
              <p className="text-xs text-muted-foreground">
                Marge: {budget.profitMargin.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Détails des coûts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Prestataires */}
        <Card>
          <CardHeader>
            <CardTitle>Prestataires</CardTitle>
            <CardDescription>
              Coûts des prestataires assignés au projet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>Total prestataires</span>
                <span className="font-semibold">{formatCurrency(budget.providerCosts)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Payé</span>
                <span className="font-semibold text-green-600">{formatCurrency(budget.paidProviders)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>En attente</span>
                <span className="font-semibold text-orange-600">{formatCurrency(budget.unpaidProviders)}</span>
              </div>
              
              <Progress 
                value={(budget.paidProviders / budget.providerCosts) * 100} 
                className="h-2"
              />
              
              <div className="space-y-2 mt-4">
                {budget.providers.map((provider) => (
                  <div key={provider.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                        {provider.provider.photo ? (
                          <img src={provider.provider.photo} alt={provider.provider.name} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          provider.provider.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{provider.provider.name}</p>
                        {provider.provider.role && (
                          <p className="text-xs text-muted-foreground">{provider.provider.role}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatCurrency(provider.amount)}</p>
                      <Badge variant={provider.isPaid ? "default" : "secondary"} className="text-xs">
                        {provider.isPaid ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Payé
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3 mr-1" />
                            En attente
                          </>
                        )}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dépenses */}
        <Card>
          <CardHeader>
            <CardTitle>Dépenses du projet</CardTitle>
            <CardDescription>
              Autres dépenses liées au projet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>Total dépenses</span>
                <span className="font-semibold">{formatCurrency(budget.projectExpenses)}</span>
              </div>
              
              {budget.expenses.length > 0 ? (
                <div className="space-y-2">
                  {budget.expenses.map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <p className="text-sm font-medium">{expense.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {expense.category} • {formatDate(expense.date)}
                        </p>
                      </div>
                      <p className="text-sm font-semibold">{formatCurrency(expense.amount)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Aucune dépense enregistrée</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Résumé financier */}
      <Card>
        <CardHeader>
          <CardTitle>Résumé financier</CardTitle>
          <CardDescription>
            Vue d'ensemble de la rentabilité du projet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Revenus</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(budget.paidInvoices)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Coûts</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(budget.totalCosts)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Bénéfice</p>
              <p className={`text-2xl font-bold ${profitabilityColor}`}>
                {formatCurrency(budget.netProfit)}
              </p>
            </div>
          </div>
          
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Marge bénéficiaire</span>
              <span className={`font-semibold ${profitabilityColor}`}>
                {budget.profitMargin.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={Math.max(0, budget.profitMargin)} 
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 