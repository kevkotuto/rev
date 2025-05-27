"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Bell, 
  Calendar,
  DollarSign,
  RefreshCw,
  CheckCircle,
  AlertTriangle
} from "lucide-react"
import { toast } from "sonner"
import { motion } from "motion/react"

interface Subscription {
  id: string
  description: string
  amount: number
  category?: string
  subscriptionPeriod?: string
  nextRenewalDate: string
  reminderDays?: number
  isActive: boolean
}

interface SubscriptionNotificationsProps {
  userId: string
  className?: string
}

export function SubscriptionNotifications({ userId, className }: SubscriptionNotificationsProps) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    fetchUpcomingSubscriptions()
    checkSubscriptions() // Vérifier automatiquement au chargement
  }, [])

  const fetchUpcomingSubscriptions = async () => {
    try {
      const response = await fetch('/api/expenses/check-subscriptions?days=30')
      if (response.ok) {
        const data = await response.json()
        setSubscriptions(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des abonnements:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkSubscriptions = async () => {
    try {
      setChecking(true)
      const response = await fetch('/api/expenses/check-subscriptions', {
        method: 'POST'
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.notificationsCreated > 0) {
          toast.success(`${result.notificationsCreated} rappel(s) d'abonnement créé(s)`)
        }
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des abonnements:', error)
    } finally {
      setChecking(false)
    }
  }

  const renewSubscription = async (subscriptionId: string) => {
    try {
      const response = await fetch(`/api/expenses/${subscriptionId}/renew-subscription`, {
        method: 'POST'
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(result.message)
        fetchUpcomingSubscriptions() // Recharger la liste
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors du renouvellement')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors du renouvellement')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getDaysUntilRenewal = (renewalDate: string) => {
    const now = new Date()
    const renewal = new Date(renewalDate)
    const diffTime = renewal.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getUrgencyColor = (daysUntil: number) => {
    if (daysUntil <= 3) return 'text-red-600 bg-red-100'
    if (daysUntil <= 7) return 'text-orange-600 bg-orange-100'
    if (daysUntil <= 14) return 'text-yellow-600 bg-yellow-100'
    return 'text-blue-600 bg-blue-100'
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Abonnements à venir
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-20">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (subscriptions.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Abonnements à venir
          </CardTitle>
          <CardDescription>
            Aucun abonnement à renouveler dans les 30 prochains jours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-2" />
            <p className="text-sm text-muted-foreground">
              Tous vos abonnements sont à jour !
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Abonnements à venir
              <Badge variant="destructive" className="ml-2">
                {subscriptions.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              Abonnements arrivant à échéance dans les 30 prochains jours
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={checkSubscriptions}
            disabled={checking}
          >
            {checking ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {subscriptions.map((subscription, index) => {
            const daysUntil = getDaysUntilRenewal(subscription.nextRenewalDate)
            
            return (
              <motion.div
                key={subscription.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm">{subscription.description}</h4>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${getUrgencyColor(daysUntil)}`}
                    >
                      {daysUntil <= 0 ? 'Expiré' : `${daysUntil} jour${daysUntil > 1 ? 's' : ''}`}
                    </Badge>
                    {subscription.subscriptionPeriod && (
                      <Badge variant="outline" className="text-xs">
                        {subscription.subscriptionPeriod === 'MONTHLY' ? 'Mensuel' : 'Annuel'}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      {formatCurrency(subscription.amount)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(subscription.nextRenewalDate).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {daysUntil <= 7 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => renewSubscription(subscription.id)}
                      className="text-xs"
                    >
                      Renouveler
                    </Button>
                  )}
                  {daysUntil <= 0 && (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
} 