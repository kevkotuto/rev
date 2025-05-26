"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { 
  Plus, 
  Edit, 
  Trash2, 
  Package,
  Calculator,
  MoreHorizontal
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Info } from "lucide-react"

interface ProjectService {
  id: string
  name: string
  description?: string
  amount: number
  quantity: number
  unit?: string
  createdAt: string
}

interface ProjectServicesProps {
  projectId: string
  onServicesUpdated?: () => void
}

export function ProjectServices({ projectId, onServicesUpdated }: ProjectServicesProps) {
  const [services, setServices] = useState<ProjectService[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingService, setEditingService] = useState<ProjectService | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    amount: "",
    quantity: "1",
    unit: ""
  })

  useEffect(() => {
    fetchServices()
  }, [projectId])

  const fetchServices = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/services`)
      if (response.ok) {
        const data = await response.json()
        setServices(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des services:', error)
      toast.error('Erreur lors du chargement des services')
    } finally {
      setLoading(false)
    }
  }

  const updateProjectBudget = async () => {
    try {
      await fetch(`/api/projects/${projectId}/update-budget`, {
        method: 'POST'
      })
    } catch (error) {
      console.error('Erreur lors de la mise à jour du budget:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      amount: "",
      quantity: "1",
      unit: ""
    })
    setEditingService(null)
  }

  const openDialog = (service?: ProjectService) => {
    if (service) {
      setEditingService(service)
      setFormData({
        name: service.name,
        description: service.description || "",
        amount: service.amount.toString(),
        quantity: service.quantity.toString(),
        unit: service.unit || ""
      })
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    try {
      const serviceData = {
        name: formData.name,
        description: formData.description || undefined,
        amount: parseFloat(formData.amount),
        quantity: parseInt(formData.quantity),
        unit: formData.unit || undefined
      }

      let response
      if (editingService) {
        response = await fetch(`/api/project-services/${editingService.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(serviceData)
        })
      } else {
        response = await fetch(`/api/projects/${projectId}/services`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(serviceData)
        })
      }

      if (response.ok) {
        toast.success(editingService ? 'Service mis à jour' : 'Service ajouté')
        setIsDialogOpen(false)
        resetForm()
        fetchServices()
        
        // Mettre à jour le budget du projet
        await updateProjectBudget()
        onServicesUpdated?.()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors de la sauvegarde')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la sauvegarde du service')
    }
  }

  const handleDelete = async (serviceId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce service ?')) return

    try {
      const response = await fetch(`/api/project-services/${serviceId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Service supprimé')
        fetchServices()
        
        // Mettre à jour le budget du projet
        await updateProjectBudget()
        onServicesUpdated?.()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la suppression du service')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getTotalAmount = () => {
    return services.reduce((total, service) => total + (service.amount * service.quantity), 0)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Alerte explicative */}
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Budget automatique :</strong> Le budget du projet est automatiquement calculé comme la somme de tous les services. 
          Ajoutez, modifiez ou supprimez des services pour ajuster le budget total.
        </AlertDescription>
      </Alert>

      {/* Header avec total */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Services du projet
            </CardTitle>
            <CardDescription>
              Gérez les services et tarifs associés à ce projet
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(getTotalAmount())}
            </div>
            <p className="text-xs text-muted-foreground">
              Total des services = Budget projet
            </p>
            <p className="text-xs text-blue-600 font-medium">
              Le budget se met à jour automatiquement
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <Button onClick={() => openDialog()} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un service
          </Button>
        </CardContent>
      </Card>

      {/* Liste des services */}
      {services.length > 0 ? (
        <div className="grid gap-4">
          {services.map((service) => (
            <Card key={service.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{service.name}</h3>
                      {service.unit && (
                        <Badge variant="outline" className="text-xs">
                          {service.unit}
                        </Badge>
                      )}
                    </div>
                    {service.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {service.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <Calculator className="h-3 w-3" />
                        Quantité: {service.quantity}
                      </span>
                      <span className="font-medium">
                        {formatCurrency(service.amount)} × {service.quantity} = {formatCurrency(service.amount * service.quantity)}
                      </span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openDialog(service)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(service.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun service défini</h3>
            <p className="text-muted-foreground mb-4">
              Commencez par ajouter les services associés à ce projet
            </p>
            <Button onClick={() => openDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter le premier service
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialog d'ajout/modification */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingService ? 'Modifier le service' : 'Ajouter un service'}
            </DialogTitle>
            <DialogDescription>
              Définissez les détails et le tarif de ce service
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom du service *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Développement web, Design graphique..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description détaillée du service..."
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Prix unitaire *</Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantité *</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unité</Label>
                <Input
                  id="unit"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="Ex: heure, page..."
                />
              </div>
            </div>
            {formData.amount && formData.quantity && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm font-medium text-green-800">
                  Total: {formatCurrency(parseFloat(formData.amount || "0") * parseInt(formData.quantity || "1"))}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.name || !formData.amount || !formData.quantity}
            >
              {editingService ? 'Mettre à jour' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 