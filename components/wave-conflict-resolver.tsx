"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  AlertTriangle,
  Users,
  User,
  Building2,
  Phone,
  Mail,
  FolderOpen
} from "lucide-react"
import { motion } from "motion/react"
import { toast } from "sonner"

interface ConflictData {
  assignment: {
    id: string
    transactionId: string
    amount: number
    currency: string
    timestamp: string
    description: string
    counterpartyMobile: string
  }
  conflict: {
    senderMobile: string
    clients: Array<{
      id: string
      name: string
      email?: string
      phone?: string
      company?: string
    }>
    providers: Array<{
      id: string
      name: string
      email?: string
      phone?: string
      company?: string
    }>
  }
}

interface WaveConflictResolverProps {
  assignmentId: string
  isOpen: boolean
  onClose: () => void
  onResolved: () => void
}

export default function WaveConflictResolver({ 
  assignmentId, 
  isOpen, 
  onClose, 
  onResolved 
}: WaveConflictResolverProps) {
  const [conflictData, setConflictData] = useState<ConflictData | null>(null)
  const [loading, setLoading] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [projects, setProjects] = useState<any[]>([])
  
  // Formulaire de résolution
  const [selectedType, setSelectedType] = useState<'revenue' | 'expense'>('revenue')
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [selectedProviderId, setSelectedProviderId] = useState<string>('')
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [description, setDescription] = useState<string>('')

  useEffect(() => {
    if (isOpen && assignmentId) {
      fetchConflictData()
      fetchProjects()
    }
  }, [isOpen, assignmentId])

  const fetchConflictData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/wave/transactions/${assignmentId}/conflict`)
      
      if (response.ok) {
        const data = await response.json()
        setConflictData(data)
        setDescription(data.assignment.description)
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors du chargement du conflit')
        onClose()
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors du chargement du conflit')
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects')
      if (response.ok) {
        const projects = await response.json()
        setProjects(projects)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des projets:', error)
    }
  }

  const handleResolveConflict = async () => {
    if (!selectedClientId && !selectedProviderId) {
      toast.error('Veuillez sélectionner un client ou un prestataire')
      return
    }

    try {
      setResolving(true)
      
      const response = await fetch(`/api/wave/transactions/${assignmentId}/resolve-conflict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          description,
          clientId: selectedClientId || undefined,
          providerId: selectedProviderId || undefined,
          projectId: selectedProjectId || undefined
        })
      })

      if (response.ok) {
        toast.success('Conflit résolu avec succès')
        onResolved()
        onClose()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors de la résolution')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la résolution')
    } finally {
      setResolving(false)
    }
  }

  const handleSelectEntity = (type: 'client' | 'provider', id: string) => {
    if (type === 'client') {
      setSelectedClientId(id)
      setSelectedProviderId('')
      setSelectedType('revenue')
      
      const client = conflictData?.conflict.clients.find(c => c.id === id)
      if (client) {
        setDescription(`Paiement reçu de ${client.name}`)
      }
    } else {
      setSelectedProviderId(id)
      setSelectedClientId('')
      setSelectedType('revenue') // Remboursement de prestataire = revenu
      
      const provider = conflictData?.conflict.providers.find(p => p.id === id)
      if (provider) {
        setDescription(`Remboursement reçu de ${provider.name}`)
      }
    }
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

  if (!conflictData) {
    return null
  }

  const totalOptions = conflictData.conflict.clients.length + conflictData.conflict.providers.length

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Résoudre le conflit d'assignation
          </DialogTitle>
          <DialogDescription>
            Plusieurs clients/prestataires correspondent au numéro {conflictData.conflict.senderMobile}. 
            Choisissez la bonne assignation pour cette transaction.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Chargement des détails du conflit...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Détails de la transaction */}
            <Card className="border-orange-200 bg-orange-50/50">
              <CardHeader>
                <CardTitle className="text-lg">Transaction Wave</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">ID Transaction</p>
                    <p className="font-medium">{conflictData.assignment.transactionId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Montant</p>
                    <p className="font-medium text-green-600">
                      {formatCurrency(conflictData.assignment.amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium">
                      {formatDateTime(conflictData.assignment.timestamp)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Numéro expéditeur</p>
                    <p className="font-medium">{conflictData.conflict.senderMobile}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Options de résolution */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Choisir l'assignation</h3>
                <Badge variant="outline" className="text-orange-600">
                  {totalOptions} correspondance(s) trouvée(s)
                </Badge>
              </div>

              {/* Clients correspondants */}
              {conflictData.conflict.clients.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-blue-600 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Clients correspondants ({conflictData.conflict.clients.length})
                  </h4>
                  <div className="grid gap-2">
                    {conflictData.conflict.clients.map((client) => (
                      <motion.div
                        key={client.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Card 
                          className={`cursor-pointer transition-all ${
                            selectedClientId === client.id 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'hover:border-blue-300'
                          }`}
                          onClick={() => handleSelectEntity('client', client.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{client.name}</p>
                                {client.company && (
                                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Building2 className="h-3 w-3" />
                                    {client.company}
                                  </p>
                                )}
                                <div className="flex items-center gap-4 mt-1">
                                  {client.phone && (
                                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                                      <Phone className="h-3 w-3" />
                                      {client.phone}
                                    </p>
                                  )}
                                  {client.email && (
                                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                                      <Mail className="h-3 w-3" />
                                      {client.email}
                                    </p>
                                  )}
                                </div>
                              </div>
                              {selectedClientId === client.id && (
                                <Badge className="bg-blue-600">Sélectionné</Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Prestataires correspondants */}
              {conflictData.conflict.providers.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-green-600 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Prestataires correspondants ({conflictData.conflict.providers.length})
                  </h4>
                  <div className="grid gap-2">
                    {conflictData.conflict.providers.map((provider) => (
                      <motion.div
                        key={provider.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Card 
                          className={`cursor-pointer transition-all ${
                            selectedProviderId === provider.id 
                              ? 'border-green-500 bg-green-50' 
                              : 'hover:border-green-300'
                          }`}
                          onClick={() => handleSelectEntity('provider', provider.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{provider.name}</p>
                                {provider.company && (
                                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Building2 className="h-3 w-3" />
                                    {provider.company}
                                  </p>
                                )}
                                <div className="flex items-center gap-4 mt-1">
                                  {provider.phone && (
                                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                                      <Phone className="h-3 w-3" />
                                      {provider.phone}
                                    </p>
                                  )}
                                  {provider.email && (
                                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                                      <Mail className="h-3 w-3" />
                                      {provider.email}
                                    </p>
                                  )}
                                </div>
                              </div>
                              {selectedProviderId === provider.id && (
                                <Badge className="bg-green-600">Sélectionné</Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Formulaire de finalisation */}
            {(selectedClientId || selectedProviderId) && (
              <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader>
                  <CardTitle className="text-lg">Finaliser l'assignation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">Type de transaction</Label>
                      <Select value={selectedType} onValueChange={(value) => setSelectedType(value as any)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="revenue">Revenu</SelectItem>
                          <SelectItem value="expense">Dépense</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="project">Projet (optionnel)</Label>
                      <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un projet..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Aucun projet</SelectItem>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              <div className="flex items-center gap-2">
                                <FolderOpen className="h-3 w-3" />
                                {project.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Description de la transaction..."
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={resolving}>
            Annuler
          </Button>
          <Button 
            onClick={handleResolveConflict}
            disabled={(!selectedClientId && !selectedProviderId) || !description || resolving}
          >
            {resolving ? 'Résolution...' : 'Résoudre le conflit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 