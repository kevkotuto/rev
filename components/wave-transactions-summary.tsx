"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Plus
} from "lucide-react"
import { motion } from "motion/react"
import { useRouter } from "next/navigation"

interface WaveTransactionsSummary {
  totalTransactions: number
  assignedTransactions: number
  unassignedTransactions: number
  totalRevenue: number
  totalExpenses: number
  recentTransactions: Array<{
    transaction_id: string
    amount: string
    counterparty_name?: string
    timestamp: string
    is_reversal?: boolean
    localAssignment?: {
      description: string
      type: 'revenue' | 'expense'
    }
  }>
}

export default function WaveTransactionsSummary() {
  const router = useRouter()
  const [summary, setSummary] = useState<WaveTransactionsSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSummary()
  }, [])

  const fetchSummary = async () => {
    try {
      setLoading(true)
      
      // Récupérer les transactions d'aujourd'hui
      const today = new Date().toISOString().split('T')[0]
      const response = await fetch(`/api/wave/transactions?date=${today}&first=10`)
      
      if (response.ok) {
        const data = await response.json()
        
        // Calculer les statistiques
        const totalTransactions = data.items.length
        const assignedTransactions = data.items.filter((t: any) => t.localAssignment).length
        const unassignedTransactions = totalTransactions - assignedTransactions
        
        const totalRevenue = data.items
          .filter((t: any) => parseFloat(t.amount) > 0)
          .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0)
        
        const totalExpenses = Math.abs(data.items
          .filter((t: any) => parseFloat(t.amount) < 0)
          .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0))
        
        setSummary({
          totalTransactions,
          assignedTransactions,
          unassignedTransactions,
          totalRevenue,
          totalExpenses,
          recentTransactions: data.items.slice(0, 5) // 5 plus récentes
        })
      }
    } catch (error) {
      console.error('Erreur lors du chargement du résumé Wave:', error)
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

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTransactionIcon = (transaction: any) => {
    if (transaction.is_reversal) {
      return <RotateCcw className="h-3 w-3 text-purple-600" />
    }
    const amount = parseFloat(transaction.amount)
    return amount > 0 
      ? <ArrowUpRight className="h-3 w-3 text-green-600" />
      : <ArrowDownLeft className="h-3 w-3 text-red-600" />
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Transactions Wave
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Transactions Wave
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Impossible de charger les transactions Wave
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchSummary}
              className="mt-2"
            >
              Réessayer
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Transactions Wave
              </CardTitle>
              <CardDescription>
                Activité d'aujourd'hui • {summary.totalTransactions} transactions
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push('/wave-transactions')}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Voir tout
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Statistiques rapides */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Revenus</span>
              </div>
              <p className="text-lg font-semibold text-green-600">
                {formatCurrency(summary.totalRevenue)}
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium">Dépenses</span>
              </div>
              <p className="text-lg font-semibold text-red-600">
                {formatCurrency(summary.totalExpenses)}
              </p>
            </div>
          </div>

          {/* Statut d'assignation */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Assignations</span>
              <span className="font-medium">
                {summary.assignedTransactions}/{summary.totalTransactions}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: summary.totalTransactions > 0 
                    ? `${(summary.assignedTransactions / summary.totalTransactions) * 100}%` 
                    : '0%' 
                }}
              ></div>
            </div>
            {summary.unassignedTransactions > 0 && (
              <div className="flex items-center gap-2 text-sm text-orange-600">
                <AlertCircle className="h-3 w-3" />
                <span>{summary.unassignedTransactions} transaction(s) non assignée(s)</span>
              </div>
            )}
          </div>

          {/* Transactions récentes */}
          {summary.recentTransactions.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">
                Transactions récentes
              </h4>
              <div className="space-y-2">
                {summary.recentTransactions.map((transaction) => (
                  <div 
                    key={transaction.transaction_id}
                    className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => router.push('/wave-transactions')}
                  >
                    <div className="flex items-center gap-2">
                      {getTransactionIcon(transaction)}
                      <div>
                        <p className="text-xs font-medium">
                          {transaction.counterparty_name || transaction.transaction_id}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(transaction.timestamp)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${
                        parseFloat(transaction.amount) > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {parseFloat(transaction.amount) > 0 ? '+' : ''}
                        {formatCurrency(Math.abs(parseFloat(transaction.amount)))}
                      </span>
                      
                      {transaction.localAssignment ? (
                        <Badge variant="default" className="text-xs">
                          Assignée
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-orange-600">
                          Non assignée
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions rapides */}
          <div className="flex gap-2">
            <Button 
              size="sm" 
              className="flex-1"
              onClick={() => router.push('/wave-transactions')}
            >
              <Plus className="h-4 w-4 mr-1" />
              Assigner transactions
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchSummary}
            >
              Actualiser
            </Button>
          </div>

          {summary.totalTransactions === 0 && (
            <div className="text-center py-4">
              <CreditCard className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Aucune transaction Wave aujourd'hui
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
} 