"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Receipt, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  Plus,
  Eye,
  Download,
  Edit,
  RotateCcw,
  Info,
  Trash2,
  MoreHorizontal,
  Settings,
  ArrowRight
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { motion } from "motion/react"
import { toast } from "sonner"
import { PDFStatus } from "./pdf-status"
import { PartialInvoiceConversion } from "./partial-invoice-conversion"
import { PartialConversionInfo } from "./partial-conversion-info"

interface ProformaStatus {
  projectAmount: number
  proformas: Array<{
    id: string
    invoiceNumber: string
    amount: number
    status: string
    createdAt: string
    dueDate?: string
  }>
  latestProforma?: {
    id: string
    invoiceNumber: string
    amount: number
    status: string
    createdAt: string
    dueDate?: string
  }
  needsUpdate: boolean
  canCreateNew: boolean
  project?: {
    id: string
    name: string
    description?: string
    client?: {
      id: string
      name: string
      email?: string
      phone?: string
      address?: string
    }
  }
  recommendations: {
    updateExisting?: string
    createNew?: string
  }
}

interface ProformaManagementProps {
  projectId: string
  onProformaUpdated?: () => void
}

export function ProformaManagement({ projectId, onProformaUpdated }: ProformaManagementProps) {
  const [status, setStatus] = useState<ProformaStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isPartialConversionOpen, setIsPartialConversionOpen] = useState(false)
  const [selectedProformaForConversion, setSelectedProformaForConversion] = useState<string | null>(null)
  const [actionType, setActionType] = useState<"update_amount" | "create_new" | "sync_with_project">("create_new")
  const [editingProforma, setEditingProforma] = useState<any>(null)
  const [formData, setFormData] = useState({
    dueDate: "",
    notes: "",
    clientName: "",
    clientEmail: "",
    clientAddress: "",
    clientPhone: ""
  })

  const [editFormData, setEditFormData] = useState({
    dueDate: "",
    notes: "",
    clientName: "",
    clientEmail: "",
    clientAddress: "",
    clientPhone: ""
  })

  useEffect(() => {
    fetchStatus()
  }, [projectId])

  const fetchStatus = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/proforma-management`)
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      } else {
        toast.error('Erreur lors du chargement du statut des proformas')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors du chargement du statut des proformas')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/proforma-management`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          ...formData
        })
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(result.message)
        setIsDialogOpen(false)
        resetForm()
        fetchStatus()
        onProformaUpdated?.()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors de l\'action')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de l\'action')
    }
  }

  const handleDeleteProforma = async (proformaId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette proforma ?')) return

    try {
      const response = await fetch(`/api/proformas/${proformaId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Proforma supprimée avec succès')
        fetchStatus()
        onProformaUpdated?.()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la suppression de la proforma')
    }
  }

  const handleEditProforma = async () => {
    if (!editingProforma) return

    try {
      const response = await fetch(`/api/proformas/${editingProforma.id}/edit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      })

      if (response.ok) {
        toast.success('Proforma modifiée avec succès')
        setIsEditDialogOpen(false)
        setEditingProforma(null)
        resetEditForm()
        fetchStatus()
        onProformaUpdated?.()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors de la modification')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la modification de la proforma')
    }
  }

  const openEditDialog = (proforma: any) => {
    setEditingProforma(proforma)
    setEditFormData({
      dueDate: proforma.dueDate ? new Date(proforma.dueDate).toISOString().split('T')[0] : "",
      notes: proforma.notes || "",
      clientName: proforma.clientName || "",
      clientEmail: proforma.clientEmail || "",
      clientAddress: proforma.clientAddress || "",
      clientPhone: proforma.clientPhone || ""
    })
    setIsEditDialogOpen(true)
  }

  const openPartialConversionDialog = (proformaId: string) => {
    setSelectedProformaForConversion(proformaId)
    setIsPartialConversionOpen(true)
  }

  const resetForm = () => {
    setFormData({
      dueDate: "",
      notes: "",
      clientName: "",
      clientEmail: "",
      clientAddress: "",
      clientPhone: ""
    })
  }

  const resetFormWithClientInfo = () => {
    // Réinitialiser avec les infos du client si disponibles
    if (status?.project?.client) {
      const client = status.project.client
      setFormData({
        dueDate: "",
        notes: "",
        clientName: client.name || "",
        clientEmail: client.email || "",
        clientAddress: client.address || "",
        clientPhone: client.phone || ""
      })
    } else {
      resetForm()
    }
  }

  const resetEditForm = () => {
    setEditFormData({
      dueDate: "",
      notes: "",
      clientName: "",
      clientEmail: "",
      clientAddress: "",
      clientPhone: ""
    })
  }

  const openDialog = (action: "update_amount" | "create_new" | "sync_with_project") => {
    setActionType(action)
    
    // Pré-remplir le formulaire avec les informations du client si disponibles
    if (action === "create_new" && status?.project?.client) {
      const client = status.project.client
      setFormData({
        dueDate: "",
        notes: "",
        clientName: client.name || "",
        clientEmail: client.email || "",
        clientAddress: client.address || "",
        clientPhone: client.phone || ""
      })
    }
    
    setIsDialogOpen(true)
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

  const getActionTitle = () => {
    switch (actionType) {
      case "update_amount":
        return "Mettre à jour le montant"
      case "create_new":
        return "Créer une nouvelle proforma"
      case "sync_with_project":
        return "Synchroniser avec le projet"
      default:
        return "Action"
    }
  }

  const getActionDescription = () => {
    switch (actionType) {
      case "update_amount":
        return "Mettre à jour le montant de la proforma existante avec le nouveau prix du projet"
      case "create_new":
        return "Créer une nouvelle version de la proforma avec le prix actuel du projet"
      case "sync_with_project":
        return "Synchroniser les informations de la proforma avec les données du projet et du client"
      default:
        return ""
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!status) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Impossible de charger le statut des proformas.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      {/* Information sur la nouvelle fonctionnalité */}
      <PartialConversionInfo />

      {/* Alertes et recommandations */}
      {status.needsUpdate && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Attention :</strong> Le montant du projet a changé depuis la dernière proforma.
              <br />
              Proforma actuelle : {formatCurrency(status.latestProforma?.amount || 0)} → 
              Nouveau montant : {formatCurrency(status.projectAmount)}
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {status.recommendations.updateExisting && (
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            {status.recommendations.updateExisting}
          </AlertDescription>
        </Alert>
      )}

      {/* Actions disponibles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Gestion des Proformas
          </CardTitle>
          <CardDescription>
            Gérez vos devis de manière professionnelle
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Créer nouvelle proforma */}
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-start gap-2"
              onClick={() => openDialog("create_new")}
            >
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <span className="font-medium">Nouvelle Proforma</span>
              </div>
              <span className="text-xs text-muted-foreground text-left">
                Créer une nouvelle version avec le prix actuel
              </span>
            </Button>

            {/* Mettre à jour montant */}
            {status.latestProforma && status.needsUpdate && (
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-start gap-2 border-orange-200"
                onClick={() => openDialog("update_amount")}
              >
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-orange-600" />
                  <span className="font-medium">Mettre à jour</span>
                </div>
                <span className="text-xs text-muted-foreground text-left">
                  Ajuster le montant de la proforma existante
                </span>
              </Button>
            )}

            {/* Synchroniser */}
            {status.latestProforma && (
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-start gap-2"
                onClick={() => openDialog("sync_with_project")}
              >
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  <span className="font-medium">Synchroniser</span>
                </div>
                <span className="text-xs text-muted-foreground text-left">
                  Sync avec les données du projet
                </span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Liste des proformas existantes */}
      {status.proformas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Proformas existantes</CardTitle>
            <CardDescription>
              Historique des devis créés pour ce projet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {status.proformas.map((proforma, index) => (
                <div key={proforma.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Receipt className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{proforma.invoiceNumber}</p>
                        {index === 0 && (
                          <Badge variant="secondary" className="text-xs">
                            Dernière
                          </Badge>
                        )}
                        {proforma.amount !== status.projectAmount && (
                          <Badge variant="outline" className="text-xs text-orange-600">
                            Montant différent
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(proforma.amount)} • {formatDate(proforma.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`/api/proformas/${proforma.id}/preview`, '_blank')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <PDFStatus 
                      proformaId={proforma.id} 
                      invoiceNumber={proforma.invoiceNumber}
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(proforma)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openPartialConversionDialog(proforma.id)}>
                          <ArrowRight className="mr-2 h-4 w-4" />
                          Conversion partielle
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteProforma(proforma.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog d'action */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{getActionTitle()}</DialogTitle>
            <DialogDescription>
              {getActionDescription()}
            </DialogDescription>
          </DialogHeader>
          {actionType === "create_new" && status?.project?.client && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-blue-800 text-sm">
              ℹ️ Les informations du client ont été pré-remplies automatiquement
            </div>
          )}
          <div className="grid gap-4 py-4">
            {actionType !== "sync_with_project" && (
              <>
                            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Nom du client</Label>
                <Input
                  id="clientName"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientEmail">Email</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  value={formData.clientEmail}
                  onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                />
              </div>
            </div>
            
            {/* Bouton pour restaurer les infos du client */}
            {actionType === "create_new" && status?.project?.client && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resetFormWithClientInfo}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  🔄 Restaurer les infos du client
                </Button>
              </div>
            )}
                <div className="space-y-2">
                  <Label htmlFor="clientAddress">Adresse</Label>
                  <Input
                    id="clientAddress"
                    value={formData.clientAddress}
                    onChange={(e) => setFormData({ ...formData, clientAddress: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientPhone">Téléphone</Label>
                    <Input
                      id="clientPhone"
                      value={formData.clientPhone}
                      onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Date d'échéance</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </>
            )}
            
            {actionType === "sync_with_project" && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Cette action synchronisera automatiquement les informations de la proforma 
                  avec les données actuelles du projet et du client.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAction}>
              {actionType === "update_amount" && "Mettre à jour"}
              {actionType === "create_new" && "Créer"}
              {actionType === "sync_with_project" && "Synchroniser"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog d'édition de proforma */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Modifier la proforma</DialogTitle>
            <DialogDescription>
              Modifiez les informations de la proforma {editingProforma?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editClientName">Nom du client</Label>
                <Input
                  id="editClientName"
                  value={editFormData.clientName}
                  onChange={(e) => setEditFormData({ ...editFormData, clientName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editClientEmail">Email</Label>
                <Input
                  id="editClientEmail"
                  type="email"
                  value={editFormData.clientEmail}
                  onChange={(e) => setEditFormData({ ...editFormData, clientEmail: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editClientAddress">Adresse</Label>
              <Input
                id="editClientAddress"
                value={editFormData.clientAddress}
                onChange={(e) => setEditFormData({ ...editFormData, clientAddress: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editClientPhone">Téléphone</Label>
                <Input
                  id="editClientPhone"
                  value={editFormData.clientPhone}
                  onChange={(e) => setEditFormData({ ...editFormData, clientPhone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editDueDate">Date d'échéance</Label>
                <Input
                  id="editDueDate"
                  type="date"
                  value={editFormData.dueDate}
                  onChange={(e) => setEditFormData({ ...editFormData, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editNotes">Notes</Label>
              <Textarea
                id="editNotes"
                value={editFormData.notes}
                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                placeholder="Notes additionnelles..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleEditProforma}>
              Enregistrer les modifications
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de conversion partielle */}
      {selectedProformaForConversion && (
        <PartialInvoiceConversion
          proformaId={selectedProformaForConversion}
          isOpen={isPartialConversionOpen}
          onClose={() => {
            setIsPartialConversionOpen(false)
            setSelectedProformaForConversion(null)
          }}
          onSuccess={() => {
            fetchStatus()
            onProformaUpdated?.()
          }}
        />
      )}
    </div>
  )
} 