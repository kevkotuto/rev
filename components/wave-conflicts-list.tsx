"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertTriangle,
  User,
  Users,
  Clock,
  CheckCircle,
  RefreshCw
} from "lucide-react"
import { motion } from "motion/react"
import { toast } from "sonner"
import WaveConflictResolver from "./wave-conflict-resolver"

interface ConflictItem {
  id: string
  transactionId: string
  amount: number
  currency: string
  timestamp: string
  description: string
  counterpartyMobile: string
  counterpartyName?: string
  conflict: {
    senderMobile: string
    clients: Array<{ id: string; name: string; phone?: string }>
    providers: Array<{ id: string; name: string; phone?: string }>
    totalOptions: number
  }
}

interface WaveConflictsListProps {
  className?: string
}

export default function WaveConflictsList({ className }: WaveConflictsListProps) {
  const [conflicts, setConflicts] = useState<ConflictItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedConflictId, setSelectedConflictId] = useState<string>('')
  const [resolverOpen, setResolverOpen] = useState(false)

  useEffect(() => {
    fetchConflicts()
  }, [])

  const fetchConflicts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/wave/transactions/conflicts')
      
      if (response.ok) {
        const data = await response.json()
        setConflicts(data.conflicts || [])
      } else {
        console.error('Erreur lors du chargement des conflits')
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleResolveConflict = (conflictId: string) => {
    setSelectedConflictId(conflictId)
    setResolverOpen(true)
  }

  const handleConflictResolved = () => {
    fetchConflicts() // Recharger la liste
    toast.success('Conflit résolu avec succès')
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 60) {
      return `Il y a ${diffInMinutes} min`
    } else if (diffInMinutes < 1440) {
      return `Il y a ${Math.floor(diffInMinutes / 60)}h`
    } else {
      return `Il y a ${Math.floor(diffInMinutes / 1440)}j`
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Conflits d'assignation Wave
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Chargement des conflits...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (conflicts.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Conflits d'assignation Wave
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-medium text-green-600 mb-2">Aucun conflit</p>
            <p className="text-muted-foreground">
              Toutes les transactions Wave sont correctement assignées
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Conflits d'assignation Wave
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="text-sm">
                {conflicts.length} conflit{conflicts.length > 1 ? 's' : ''}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchConflicts}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {conflicts.map((conflict) => (
              <motion.div
                key={conflict.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-orange-600">
                        Transaction #{conflict.transactionId.slice(-8)}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {getTimeAgo(conflict.timestamp)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(conflict.timestamp)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">
                      {formatCurrency(conflict.amount)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <p className="text-sm">
                    <span className="font-medium">Description:</span> {conflict.description}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Numéro expéditeur:</span> {conflict.conflict.senderMobile}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {conflict.conflict.clients.length > 0 && (
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4 text-blue-500" />
                        <span>{conflict.conflict.clients.length} client{conflict.conflict.clients.length > 1 ? 's' : ''}</span>
                      </div>
                    )}
                    {conflict.conflict.providers.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-green-500" />
                        <span>{conflict.conflict.providers.length} prestataire{conflict.conflict.providers.length > 1 ? 's' : ''}</span>
                      </div>
                    )}
                    <Badge variant="outline" className="text-orange-600">
                      {conflict.conflict.totalOptions} option{conflict.conflict.totalOptions > 1 ? 's' : ''}
                    </Badge>
                  </div>
                  
                  <Button
                    size="sm"
                    onClick={() => handleResolveConflict(conflict.id)}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    Résoudre
                  </Button>
                </div>

                {/* Aperçu des entités en conflit */}
                <div className="mt-3 pt-3 border-t space-y-2">
                  {conflict.conflict.clients.length > 0 && (
                    <div className="text-sm">
                      <span className="font-medium text-blue-600">Clients:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {conflict.conflict.clients.slice(0, 3).map((client) => (
                          <Badge key={client.id} variant="outline" className="text-xs text-blue-600">
                            {client.name}
                          </Badge>
                        ))}
                        {conflict.conflict.clients.length > 3 && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            +{conflict.conflict.clients.length - 3} autres
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {conflict.conflict.providers.length > 0 && (
                    <div className="text-sm">
                      <span className="font-medium text-green-600">Prestataires:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {conflict.conflict.providers.slice(0, 3).map((provider) => (
                          <Badge key={provider.id} variant="outline" className="text-xs text-green-600">
                            {provider.name}
                          </Badge>
                        ))}
                        {conflict.conflict.providers.length > 3 && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            +{conflict.conflict.providers.length - 3} autres
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de résolution de conflit */}
      <WaveConflictResolver
        assignmentId={selectedConflictId}
        isOpen={resolverOpen}
        onClose={() => {
          setResolverOpen(false)
          setSelectedConflictId('')
        }}
        onResolved={handleConflictResolved}
      />
    </>
  )
} 