"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Bell,
  BellRing,
  Search,
  Filter,
  MoreVertical,
  Check,
  CheckCheck,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  Mail,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
  DollarSign,
  Calendar,
  FileText,
  Users,
  Settings,
  ExternalLink,
  TestTube
} from "lucide-react"
import { motion } from "motion/react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface Notification {
  id: string
  title: string
  message: string
  type: string
  isRead: boolean
  actionUrl?: string
  metadata?: any
  relatedType?: string
  relatedId?: string
  emailSent: boolean
  emailSentAt?: string
  createdAt: string
  updatedAt: string
}

interface NotificationsResponse {
  notifications: Notification[]
  unreadCount: number
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([])
  
  // Filtres
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/notifications?limit=100')
      if (response.ok) {
        const data: NotificationsResponse = await response.json()
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount)
      } else {
        toast.error('Erreur lors du chargement des notifications')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors du chargement des notifications')
    } finally {
      setLoading(false)
    }
  }

  const createTestNotification = async (type: string = 'INFO') => {
    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success('Notification de test créée !')
        fetchNotifications() // Recharger les notifications
      } else {
        toast.error('Erreur lors de la création de la notification de test')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la création de la notification de test')
    }
  }

  const markAsRead = async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds })
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notif => 
            notificationIds.includes(notif.id) 
              ? { ...notif, isRead: true }
              : notif
          )
        )
        setUnreadCount(prev => Math.max(0, prev - notificationIds.length))
        toast.success(`${notificationIds.length} notification(s) marquée(s) comme lue(s)`)
      } else {
        toast.error('Erreur lors de la mise à jour')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllAsRead: true })
      })

      if (response.ok) {
        setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })))
        setUnreadCount(0)
        toast.success('Toutes les notifications marquées comme lues')
      } else {
        toast.error('Erreur lors de la mise à jour')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const deleteNotifications = async (notificationIds: string[]) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${notificationIds.length} notification(s) ?`)) {
      return
    }

    try {
      const response = await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds })
      })

      if (response.ok) {
        setNotifications(prev => prev.filter(notif => !notificationIds.includes(notif.id)))
        setSelectedNotifications([])
        toast.success(`${notificationIds.length} notification(s) supprimée(s)`)
      } else {
        toast.error('Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la suppression')
    }
  }

  const deleteReadNotifications = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer toutes les notifications lues ?')) {
      return
    }

    try {
      const response = await fetch('/api/notifications?action=deleteRead', {
        method: 'DELETE'
      })

      if (response.ok) {
        const data = await response.json()
        setNotifications(prev => prev.filter(notif => !notif.isRead))
        setSelectedNotifications([])
        toast.success(data.message)
      } else {
        toast.error('Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la suppression')
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    // Marquer comme lue si pas encore lu
    if (!notification.isRead) {
      markAsRead([notification.id])
    }

    // Naviguer vers l'URL d'action si disponible
    if (notification.actionUrl) {
      router.push(notification.actionUrl)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'WAVE_PAYMENT_RECEIVED':
      case 'WAVE_CHECKOUT_COMPLETED':
        return <DollarSign className="h-4 w-4 text-green-600" />
      case 'WAVE_PAYMENT_FAILED':
      case 'WAVE_CHECKOUT_FAILED':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'INVOICE_PAID':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'INVOICE_OVERDUE':
        return <AlertCircle className="h-4 w-4 text-orange-600" />
      case 'PROJECT_DEADLINE':
      case 'TASK_DUE':
        return <Calendar className="h-4 w-4 text-blue-600" />
      case 'SUCCESS':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'ERROR':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'WARNING':
        return <AlertCircle className="h-4 w-4 text-orange-600" />
      default:
        return <Info className="h-4 w-4 text-blue-600" />
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'WAVE_PAYMENT_RECEIVED':
      case 'WAVE_CHECKOUT_COMPLETED':
      case 'INVOICE_PAID':
      case 'SUCCESS':
        return 'bg-green-50 border-green-200'
      case 'WAVE_PAYMENT_FAILED':
      case 'WAVE_CHECKOUT_FAILED':
      case 'ERROR':
        return 'bg-red-50 border-red-200'
      case 'INVOICE_OVERDUE':
      case 'WARNING':
        return 'bg-orange-50 border-orange-200'
      case 'PROJECT_DEADLINE':
      case 'TASK_DUE':
        return 'bg-blue-50 border-blue-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'WAVE_PAYMENT_RECEIVED': 'Paiement reçu',
      'WAVE_PAYMENT_FAILED': 'Paiement échoué',
      'WAVE_CHECKOUT_COMPLETED': 'Checkout complété',
      'WAVE_CHECKOUT_FAILED': 'Checkout échoué',
      'INVOICE_PAID': 'Facture payée',
      'INVOICE_OVERDUE': 'Facture en retard',
      'PROJECT_DEADLINE': 'Échéance projet',
      'TASK_DUE': 'Tâche due',
      'SUBSCRIPTION_REMINDER': 'Rappel abonnement',
      'PROVIDER_PAYMENT_COMPLETED': 'Paiement prestataire',
      'PROVIDER_PAYMENT_FAILED': 'Échec paiement prestataire',
      'SUCCESS': 'Succès',
      'ERROR': 'Erreur',
      'WARNING': 'Avertissement',
      'INFO': 'Information'
    }
    return labels[type] || type
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = !searchTerm || 
      notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesType = typeFilter === "all" || notification.type === typeFilter

    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "read" && notification.isRead) ||
      (statusFilter === "unread" && !notification.isRead)

    return matchesSearch && matchesType && matchesStatus
  })

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedNotifications(filteredNotifications.map(n => n.id))
    } else {
      setSelectedNotifications([])
    }
  }

  const handleSelectNotification = (notificationId: string, checked: boolean) => {
    if (checked) {
      setSelectedNotifications(prev => [...prev, notificationId])
    } else {
      setSelectedNotifications(prev => prev.filter(id => id !== notificationId))
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-8 w-8" />
            Notifications
          </h1>
          <p className="text-muted-foreground">
            Gérez vos notifications et restez informé des événements importants
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Badge variant="destructive" className="px-3 py-1">
              {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
            </Badge>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <TestTube className="h-4 w-4 mr-2" />
                Test
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => createTestNotification('INFO')}>
                <Info className="h-4 w-4 mr-2" />
                Notification Info
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => createTestNotification('SUCCESS')}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Notification Succès
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => createTestNotification('WARNING')}>
                <AlertCircle className="h-4 w-4 mr-2" />
                Notification Avertissement
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => createTestNotification('ERROR')}>
                <XCircle className="h-4 w-4 mr-2" />
                Notification Erreur
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => createTestNotification('WAVE_PAYMENT_RECEIVED')}>
                <DollarSign className="h-4 w-4 mr-2" />
                Paiement Wave reçu
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => createTestNotification('INVOICE_PAID')}>
                <FileText className="h-4 w-4 mr-2" />
                Facture payée
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={fetchNotifications} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Total</p>
                <p className="text-2xl font-bold">{notifications.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BellRing className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm font-medium">Non lues</p>
                <p className="text-2xl font-bold text-orange-600">{unreadCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">Emails envoyés</p>
                <p className="text-2xl font-bold text-green-600">
                  {notifications.filter(n => n.emailSent).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCheck className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Sélectionnées</p>
                <p className="text-2xl font-bold text-blue-600">{selectedNotifications.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtres et actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-6">
            <div className="space-y-2">
              <Label htmlFor="search">Rechercher</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Titre, message..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="WAVE_PAYMENT_RECEIVED">Paiements reçus</SelectItem>
                  <SelectItem value="WAVE_PAYMENT_FAILED">Paiements échoués</SelectItem>
                  <SelectItem value="INVOICE_PAID">Factures payées</SelectItem>
                  <SelectItem value="INVOICE_OVERDUE">Factures en retard</SelectItem>
                  <SelectItem value="PROJECT_DEADLINE">Échéances projet</SelectItem>
                  <SelectItem value="TASK_DUE">Tâches dues</SelectItem>
                  <SelectItem value="SUCCESS">Succès</SelectItem>
                  <SelectItem value="ERROR">Erreurs</SelectItem>
                  <SelectItem value="WARNING">Avertissements</SelectItem>
                  <SelectItem value="INFO">Informations</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Statut</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value="unread">Non lues</SelectItem>
                  <SelectItem value="read">Lues</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("")
                  setTypeFilter("all")
                  setStatusFilter("all")
                }}
              >
                Réinitialiser
              </Button>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Tout marquer lu
              </Button>
            </div>

            <div className="flex items-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <MoreVertical className="h-4 w-4 mr-2" />
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem 
                    onClick={() => selectedNotifications.length > 0 && markAsRead(selectedNotifications)}
                    disabled={selectedNotifications.length === 0}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Marquer sélection comme lue
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => selectedNotifications.length > 0 && deleteNotifications(selectedNotifications)}
                    disabled={selectedNotifications.length === 0}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer sélection
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={deleteReadNotifications}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer toutes les lues
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Notifications ({filteredNotifications.length})
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={selectedNotifications.length === filteredNotifications.length && filteredNotifications.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <Label className="text-sm">Tout sélectionner</Label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`border rounded-lg p-4 transition-all duration-200 hover:shadow-md cursor-pointer ${
                  getNotificationColor(notification.type)
                } ${!notification.isRead ? 'border-l-4 border-l-blue-500' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedNotifications.includes(notification.id)}
                    onCheckedChange={(checked) => handleSelectNotification(notification.id, checked as boolean)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-medium ${!notification.isRead ? 'font-semibold' : ''}`}>
                          {notification.title}
                        </h3>
                        {!notification.isRead && (
                          <Badge variant="default" className="text-xs">
                            Nouveau
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {getTypeLabel(notification.type)}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {notification.emailSent && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <span>Email envoyé</span>
                          </div>
                        )}
                        <span>{formatDateTime(notification.createdAt)}</span>
                        {notification.actionUrl && (
                          <ExternalLink className="h-3 w-3" />
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground mb-2">
                      {notification.message}
                    </p>

                    {notification.metadata && (
                      <div className="text-xs text-muted-foreground">
                        {notification.metadata.amount && notification.metadata.currency && (
                          <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                            <DollarSign className="h-3 w-3" />
                            {notification.metadata.amount} {notification.metadata.currency}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}

            {filteredNotifications.length === 0 && !loading && (
              <div className="text-center py-12">
                <Bell className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold">Aucune notification</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {searchTerm || typeFilter !== "all" || statusFilter !== "all"
                    ? "Aucune notification ne correspond aux filtres actuels."
                    : "Vous n'avez aucune notification pour le moment."
                  }
                </p>
                <Button 
                  onClick={() => createTestNotification('INFO')} 
                  className="mt-4"
                  variant="outline"
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  Créer une notification de test
                </Button>
              </div>
            )}

            {loading && (
              <div className="text-center py-12">
                <RefreshCw className="mx-auto h-8 w-8 text-muted-foreground animate-spin" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Chargement des notifications...
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 