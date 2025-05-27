"use client"

import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { 
  Bell,
  BellRing,
  Check,
  CheckCheck,
  ExternalLink,
  Mail,
  DollarSign,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
  Calendar,
  Settings
} from "lucide-react"
import { motion } from "motion/react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface Notification {
  id: string
  title: string
  message: string
  type: string
  isRead: boolean
  actionUrl?: string
  metadata?: any
  emailSent: boolean
  createdAt: string
}

interface NotificationsResponse {
  notifications: Notification[]
  unreadCount: number
}

export default function NotificationsPopover() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    fetchNotifications()
    
    // Polling pour les nouvelles notifications toutes les 30 secondes
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/notifications?limit=10')
      if (response.ok) {
        const data: NotificationsResponse = await response.json()
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId })
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, isRead: true }
              : notif
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Erreur:', error)
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
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    // Marquer comme lue
    if (!notification.isRead) {
      markAsRead(notification.id)
    }

    // Fermer le popover
    setIsOpen(false)

    // Naviguer vers l'URL d'action si disponible
    if (notification.actionUrl) {
      router.push(notification.actionUrl)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'WAVE_PAYMENT_RECEIVED':
      case 'WAVE_CHECKOUT_COMPLETED':
        return <DollarSign className="h-3 w-3 text-green-600" />
      case 'WAVE_PAYMENT_FAILED':
      case 'WAVE_CHECKOUT_FAILED':
        return <XCircle className="h-3 w-3 text-red-600" />
      case 'INVOICE_PAID':
        return <CheckCircle className="h-3 w-3 text-green-600" />
      case 'INVOICE_OVERDUE':
        return <AlertCircle className="h-3 w-3 text-orange-600" />
      case 'PROJECT_DEADLINE':
      case 'TASK_DUE':
        return <Calendar className="h-3 w-3 text-blue-600" />
      case 'SUCCESS':
        return <CheckCircle className="h-3 w-3 text-green-600" />
      case 'ERROR':
        return <XCircle className="h-3 w-3 text-red-600" />
      case 'WARNING':
        return <AlertCircle className="h-3 w-3 text-orange-600" />
      default:
        return <Info className="h-3 w-3 text-blue-600" />
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return "À l'instant"
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes}m`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `Il y a ${diffInHours}h`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `Il y a ${diffInDays}j`
    
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit' 
    })
  }

  const truncateMessage = (message: string, maxLength: number = 80) => {
    if (message.length <= maxLength) return message
    return message.substring(0, maxLength) + "..."
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          {unreadCount > 0 ? (
            <BellRing className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  <CheckCheck className="h-3 w-3 mr-1" />
                  Tout lire
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsOpen(false)
                  router.push('/notifications')
                }}
              >
                <Settings className="h-3 w-3" />
              </Button>
            </div>
          </div>
          {unreadCount > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''} notification{unreadCount > 1 ? 's' : ''}
            </p>
          )}
        </div>

        <ScrollArea className="h-80">
          <div className="p-2">
            {notifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Aucune notification
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {notifications.map((notification, index) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-50 ${
                      !notification.isRead ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className={`text-sm ${!notification.isRead ? 'font-semibold' : 'font-medium'}`}>
                            {notification.title}
                          </h4>
                          <div className="flex items-center gap-1">
                            {notification.emailSent && (
                              <Mail className="h-3 w-3 text-green-600" />
                            )}
                            {notification.actionUrl && (
                              <ExternalLink className="h-3 w-3 text-blue-600" />
                            )}
                            {!notification.isRead && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-4 w-4 p-0"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  markAsRead(notification.id)
                                }}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-xs text-muted-foreground mb-1">
                          {truncateMessage(notification.message)}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                          
                          {notification.metadata?.amount && notification.metadata?.currency && (
                            <span className="text-xs font-medium text-green-600">
                              {notification.metadata.amount} {notification.metadata.currency}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                className="w-full text-sm"
                onClick={() => {
                  setIsOpen(false)
                  router.push('/notifications')
                }}
              >
                Voir toutes les notifications
                <ExternalLink className="h-3 w-3 ml-2" />
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
} 