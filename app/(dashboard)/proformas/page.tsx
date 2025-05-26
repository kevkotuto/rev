"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  FileText,
  Send,
  ExternalLink,
  DollarSign,
  Filter,
  Calendar,
  ArrowRight,
  CheckCircle,
  Eye,
  Download
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { motion } from "motion/react"
import { toast } from "sonner"

interface Proforma {
  id: string
  invoiceNumber: string
  type: string
  amount: number
  status: string
  dueDate?: string
  notes?: string
  clientName?: string
  clientEmail?: string
  clientAddress?: string
  clientPhone?: string
  createdAt: string
  project?: {
    id: string
    name: string
  }
}

interface Project {
  id: string
  name: string
  client?: {
    name: string
    email: string
  }
}

export default function ProformasPage() {
  const [proformas, setProformas] = useState<Proforma[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedProforma, setSelectedProforma] = useState<Proforma | null>(null)
  const [formData, setFormData] = useState({
    amount: "",
    dueDate: "",
    notes: "",
    projectId: "",
    clientName: "",
    clientEmail: "",
    clientAddress: "",
    clientPhone: ""
  })

  useEffect(() => {
    fetchProformas()
    fetchProjects()
  }, [])

  const fetchProformas = async () => {
    try {
      const response = await fetch('/api/invoices?type=PROFORMA')
      if (response.ok) {
        const data = await response.json()
        setProformas(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des proformas:', error)
      toast.error('Erreur lors du chargement des proformas')
    } finally {
      setLoading(false)
    }
  }

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects')
      if (response.ok) {
        const data = await response.json()
        setProjects(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des projets:', error)
    }
  }

  const handleCreateProforma = async () => {
    try {
      const proformaData = {
        ...formData,
        type: "PROFORMA",
        amount: parseFloat(formData.amount) || 0,
        projectId: formData.projectId === "none" ? null : formData.projectId || null,
        dueDate: formData.dueDate || null
      }

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proformaData)
      })

      if (response.ok) {
        toast.success('Proforma créé avec succès')
        setIsCreateDialogOpen(false)
        resetForm()
        fetchProformas()
      } else {
        toast.error('Erreur lors de la création du proforma')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la création du proforma')
    }
  }

  const handleUpdateProforma = async () => {
    if (!selectedProforma) return

    try {
      const proformaData = {
        amount: parseFloat(formData.amount) || 0,
        dueDate: formData.dueDate || undefined,
        notes: formData.notes,
        clientName: formData.clientName,
        clientEmail: formData.clientEmail,
        clientAddress: formData.clientAddress,
        clientPhone: formData.clientPhone
      }

      const response = await fetch(`/api/proformas/${selectedProforma.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proformaData)
      })

      if (response.ok) {
        toast.success('Proforma mis à jour avec succès')
        setIsEditDialogOpen(false)
        resetForm()
        fetchProformas()
      } else {
        toast.error('Erreur lors de la mise à jour du proforma')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la mise à jour du proforma')
    }
  }

  const handleDeleteProforma = async (proformaId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce proforma ?')) return

    try {
      const response = await fetch(`/api/proformas/${proformaId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Proforma supprimé avec succès')
        fetchProformas()
      } else {
        toast.error('Erreur lors de la suppression du proforma')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la suppression du proforma')
    }
  }

  const handleConvertToInvoice = async (proformaId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir convertir ce proforma en facture ?')) return

    try {
      const response = await fetch(`/api/invoices/${proformaId}/convert`, {
        method: 'POST'
      })

      if (response.ok) {
        toast.success('Proforma converti en facture avec succès')
        fetchProformas()
      } else {
        toast.error('Erreur lors de la conversion')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la conversion')
    }
  }

  const resetForm = () => {
    setFormData({
      amount: "",
      dueDate: "",
      notes: "",
      projectId: "",
      clientName: "",
      clientEmail: "",
      clientAddress: "",
      clientPhone: ""
    })
    setSelectedProforma(null)
  }

  const openEditDialog = (proforma: Proforma) => {
    setSelectedProforma(proforma)
    setFormData({
      amount: proforma.amount.toString(),
      dueDate: proforma.dueDate ? new Date(proforma.dueDate).toISOString().split('T')[0] : "",
      notes: proforma.notes || "",
      projectId: proforma.project?.id || "",
      clientName: proforma.clientName || "",
      clientEmail: proforma.clientEmail || "",
      clientAddress: proforma.clientAddress || "",
      clientPhone: proforma.clientPhone || ""
    })
    setIsEditDialogOpen(true)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { label: "En attente", variant: "secondary" as const },
      PAID: { label: "Payé", variant: "default" as const },
      OVERDUE: { label: "En retard", variant: "destructive" as const },
      CANCELLED: { label: "Annulé", variant: "outline" as const }
    }
    return statusConfig[status as keyof typeof statusConfig] || { label: status, variant: "secondary" as const }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const filteredProformas = proformas.filter(proforma => {
    const matchesSearch = proforma.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         proforma.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         proforma.project?.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || proforma.status === statusFilter
    return matchesSearch && matchesStatus
  })

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
          <h1 className="text-3xl font-bold tracking-tight">Proformas</h1>
          <p className="text-muted-foreground">
            Gérez vos devis et convertissez-les en factures
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau proforma
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Créer un nouveau proforma</DialogTitle>
              <DialogDescription>
                Créez un devis pour votre client
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Montant</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
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
                <Label htmlFor="projectId">Projet</Label>
                <Select value={formData.projectId} onValueChange={(value) => setFormData({ ...formData, projectId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un projet" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun projet</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientName">Nom du client</Label>
                  <Input
                    id="clientName"
                    placeholder="Nom du client"
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientEmail">Email du client</Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    placeholder="email@exemple.com"
                    value={formData.clientEmail}
                    onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientAddress">Adresse du client</Label>
                <Input
                  id="clientAddress"
                  placeholder="Adresse complète"
                  value={formData.clientAddress}
                  onChange={(e) => setFormData({ ...formData, clientAddress: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientPhone">Téléphone du client</Label>
                <Input
                  id="clientPhone"
                  placeholder="+225 XX XX XX XX"
                  value={formData.clientPhone}
                  onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Notes additionnelles..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreateProforma}>
                Créer le proforma
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtres et recherche */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Rechercher un proforma..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="PENDING">En attente</SelectItem>
            <SelectItem value="PAID">Payé</SelectItem>
            <SelectItem value="OVERDUE">En retard</SelectItem>
            <SelectItem value="CANCELLED">Annulé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Liste des proformas */}
      <div className="grid gap-4">
        {filteredProformas.map((proforma, index) => (
          <motion.div
            key={proforma.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{proforma.invoiceNumber}</h3>
                      <p className="text-sm text-muted-foreground">
                        {proforma.clientName || 'Client non spécifié'}
                        {proforma.project && ` • ${proforma.project.name}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Créé le {new Date(proforma.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-lg font-semibold">{formatCurrency(proforma.amount)}</div>
                      <Badge {...getStatusBadge(proforma.status)}>
                        {getStatusBadge(proforma.status).label}
                      </Badge>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => window.open(`/api/proformas/${proforma.id}/preview`, '_blank')}>
                          <Eye className="mr-2 h-4 w-4" />
                          Visualiser
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.open(`/api/proformas/${proforma.id}/pdf`, '_blank')}>
                          <Download className="mr-2 h-4 w-4" />
                          Télécharger PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditDialog(proforma)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleConvertToInvoice(proforma.id)}>
                          <ArrowRight className="mr-2 h-4 w-4" />
                          Convertir en facture
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteProforma(proforma.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredProformas.length === 0 && (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">Aucun proforma</h3>
          <p className="mt-1 text-sm text-gray-500">
            Commencez par créer votre premier proforma.
          </p>
        </div>
      )}

      {/* Dialog de modification */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Modifier le proforma</DialogTitle>
            <DialogDescription>
              Modifiez les informations du proforma
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-amount">Montant</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  placeholder="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-dueDate">Date d'échéance</Label>
                <Input
                  id="edit-dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-projectId">Projet</Label>
              <Select value={formData.projectId} onValueChange={(value) => setFormData({ ...formData, projectId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un projet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun projet</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-clientName">Nom du client</Label>
                <Input
                  id="edit-clientName"
                  placeholder="Nom du client"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-clientEmail">Email du client</Label>
                <Input
                  id="edit-clientEmail"
                  type="email"
                  placeholder="email@exemple.com"
                  value={formData.clientEmail}
                  onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-clientAddress">Adresse du client</Label>
              <Input
                id="edit-clientAddress"
                placeholder="Adresse complète"
                value={formData.clientAddress}
                onChange={(e) => setFormData({ ...formData, clientAddress: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-clientPhone">Téléphone du client</Label>
              <Input
                id="edit-clientPhone"
                placeholder="+225 XX XX XX XX"
                value={formData.clientPhone}
                onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                placeholder="Notes additionnelles..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleUpdateProforma}>
              Mettre à jour
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 