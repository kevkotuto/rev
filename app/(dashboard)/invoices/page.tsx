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
  Calendar
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

interface Invoice {
  id: string
  invoiceNumber: string
  type: string
  amount: number
  status: string
  dueDate?: string
  notes?: string
  paymentLink?: string
  waveCheckoutId?: string
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

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [formData, setFormData] = useState({
    type: "INVOICE",
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
    fetchInvoices()
    fetchProjects()
  }, [])

  const fetchInvoices = async () => {
    try {
      const response = await fetch('/api/invoices')
      if (response.ok) {
        const data = await response.json()
        setInvoices(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des factures:', error)
      toast.error('Erreur lors du chargement des factures')
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

  const handleCreateInvoice = async () => {
    try {
      const invoiceData = {
        ...formData,
        amount: parseFloat(formData.amount) || 0,
        projectId: formData.projectId === "none" ? null : formData.projectId || null,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null
      }

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData)
      })

      if (response.ok) {
        toast.success('Facture créée avec succès')
        setIsCreateDialogOpen(false)
        resetForm()
        fetchInvoices()
      } else {
        toast.error('Erreur lors de la création de la facture')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la création de la facture')
    }
  }

  const handleUpdateInvoice = async () => {
    if (!selectedInvoice) return

    try {
      const invoiceData = {
        ...formData,
        amount: parseFloat(formData.amount) || 0,
        projectId: formData.projectId === "none" ? null : formData.projectId || null,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null
      }

      const response = await fetch(`/api/invoices/${selectedInvoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData)
      })

      if (response.ok) {
        toast.success('Facture mise à jour avec succès')
        setIsEditDialogOpen(false)
        resetForm()
        fetchInvoices()
      } else {
        toast.error('Erreur lors de la mise à jour de la facture')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la mise à jour de la facture')
    }
  }

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette facture ?')) return

    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Facture supprimée avec succès')
        fetchInvoices()
      } else {
        toast.error('Erreur lors de la suppression de la facture')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la suppression de la facture')
    }
  }

  const handleSendEmail = async (invoiceId: string) => {
    try {
      const response = await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'invoice',
          invoiceId: invoiceId
        })
      })

      if (response.ok) {
        toast.success('Email envoyé avec succès')
      } else {
        toast.error('Erreur lors de l\'envoi de l\'email')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de l\'envoi de l\'email')
    }
  }

  const resetForm = () => {
    setFormData({
      type: "INVOICE",
      amount: "",
      dueDate: "",
      notes: "",
      projectId: "none",
      clientName: "",
      clientEmail: "",
      clientAddress: "",
      clientPhone: ""
    })
    setSelectedInvoice(null)
  }

  const openEditDialog = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setFormData({
      type: invoice.type,
      amount: invoice.amount.toString(),
      dueDate: invoice.dueDate ? invoice.dueDate.split('T')[0] : "",
      notes: invoice.notes || "",
      projectId: invoice.project?.id || "none",
      clientName: invoice.clientName || "",
      clientEmail: invoice.clientEmail || "",
      clientAddress: invoice.clientAddress || "",
      clientPhone: invoice.clientPhone || ""
    })
    setIsEditDialogOpen(true)
  }

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'PENDING': { label: 'En attente', variant: 'secondary' as const },
      'PAID': { label: 'Payé', variant: 'default' as const },
      'OVERDUE': { label: 'En retard', variant: 'destructive' as const },
      'CANCELLED': { label: 'Annulé', variant: 'outline' as const },
    }
    
    return statusMap[status as keyof typeof statusMap] || { label: status, variant: 'outline' as const }
  }

  const getTypeBadge = (type: string) => {
    const typeMap = {
      'INVOICE': { label: 'Facture', color: 'bg-blue-100 text-blue-800' },
      'PROFORMA': { label: 'Proforma', color: 'bg-purple-100 text-purple-800' },
    }
    
    return typeMap[type as keyof typeof typeMap] || { label: type, color: 'bg-gray-100 text-gray-800' }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (invoice.clientName && invoice.clientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (invoice.project && invoice.project.name.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter
    const matchesType = typeFilter === "all" || invoice.type === typeFilter
    
    return matchesSearch && matchesStatus && matchesType
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
          <h1 className="text-3xl font-bold tracking-tight">Factures</h1>
          <p className="text-muted-foreground">
            Gérez vos factures et proformas avec Wave CI
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle facture
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Nouvelle facture</DialogTitle>
              <DialogDescription>
                Créez une nouvelle facture ou proforma.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="type">Type</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INVOICE">Facture</SelectItem>
                      <SelectItem value="PROFORMA">Proforma</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="amount">Montant (XOF) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    placeholder="0"
                  />
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="project">Projet</Label>
                <Select value={formData.projectId} onValueChange={(value) => setFormData({...formData, projectId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un projet" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun projet</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name} {project.client && `(${project.client.name})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="clientName">Nom du client *</Label>
                  <Input
                    id="clientName"
                    value={formData.clientName}
                    onChange={(e) => setFormData({...formData, clientName: e.target.value})}
                    placeholder="Nom du client"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="clientEmail">Email du client *</Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    value={formData.clientEmail}
                    onChange={(e) => setFormData({...formData, clientEmail: e.target.value})}
                    placeholder="email@exemple.com"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="clientAddress">Adresse du client</Label>
                <Textarea
                  id="clientAddress"
                  value={formData.clientAddress}
                  onChange={(e) => setFormData({...formData, clientAddress: e.target.value})}
                  placeholder="Adresse complète"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="clientPhone">Téléphone du client</Label>
                  <Input
                    id="clientPhone"
                    value={formData.clientPhone}
                    onChange={(e) => setFormData({...formData, clientPhone: e.target.value})}
                    placeholder="+33 1 23 45 67 89"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dueDate">Date d'échéance</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Notes sur la facture"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreateInvoice} disabled={!formData.amount || !formData.clientName || !formData.clientEmail}>
                Créer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une facture..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="PENDING">En attente</SelectItem>
            <SelectItem value="PAID">Payé</SelectItem>
            <SelectItem value="OVERDUE">En retard</SelectItem>
            <SelectItem value="CANCELLED">Annulé</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <FileText className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="INVOICE">Factures</SelectItem>
            <SelectItem value="PROFORMA">Proformas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Invoices Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredInvoices.map((invoice, index) => (
          <motion.div
            key={invoice.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{invoice.invoiceNumber}</CardTitle>
                    {invoice.clientName && (
                      <CardDescription className="text-sm">{invoice.clientName}</CardDescription>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditDialog(invoice)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSendEmail(invoice.id)}>
                      <Send className="mr-2 h-4 w-4" />
                      Envoyer par email
                    </DropdownMenuItem>
                    {invoice.paymentLink && (
                      <DropdownMenuItem asChild>
                        <a href={invoice.paymentLink} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Lien de paiement
                        </a>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem 
                      onClick={() => handleDeleteInvoice(invoice.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant={getStatusBadge(invoice.status).variant}>
                      {getStatusBadge(invoice.status).label}
                    </Badge>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeBadge(invoice.type).color}`}>
                      {getTypeBadge(invoice.type).label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-lg font-bold">
                      <DollarSign className="mr-1 h-4 w-4" />
                      {formatCurrency(invoice.amount)}
                    </div>
                    {invoice.paymentLink && (
                      <Badge variant="outline" className="text-xs">
                        Wave CI
                      </Badge>
                    )}
                  </div>

                  {invoice.project && (
                    <div className="text-sm text-muted-foreground">
                      Projet: {invoice.project.name}
                    </div>
                  )}

                  {invoice.dueDate && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="mr-1 h-3 w-3" />
                      Échéance: {new Date(invoice.dueDate).toLocaleDateString('fr-FR')}
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    Créé le {new Date(invoice.createdAt).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredInvoices.length === 0 && (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">Aucune facture</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {searchTerm || statusFilter !== "all" || typeFilter !== "all" 
              ? 'Aucune facture ne correspond à vos filtres.' 
              : 'Commencez par créer votre première facture.'}
          </p>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Modifier la facture</DialogTitle>
            <DialogDescription>
              Modifiez les informations de la facture.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-type">Type</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INVOICE">Facture</SelectItem>
                    <SelectItem value="PROFORMA">Proforma</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-amount">Montant (XOF) *</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  placeholder="0"
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit-project">Projet</Label>
              <Select value={formData.projectId} onValueChange={(value) => setFormData({...formData, projectId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un projet" />
                </SelectTrigger>
                                  <SelectContent>
                    <SelectItem value="none">Aucun projet</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name} {project.client && `(${project.client.name})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-clientName">Nom du client *</Label>
                <Input
                  id="edit-clientName"
                  value={formData.clientName}
                  onChange={(e) => setFormData({...formData, clientName: e.target.value})}
                  placeholder="Nom du client"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-clientEmail">Email du client *</Label>
                <Input
                  id="edit-clientEmail"
                  type="email"
                  value={formData.clientEmail}
                  onChange={(e) => setFormData({...formData, clientEmail: e.target.value})}
                  placeholder="email@exemple.com"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-clientAddress">Adresse du client</Label>
              <Textarea
                id="edit-clientAddress"
                value={formData.clientAddress}
                onChange={(e) => setFormData({...formData, clientAddress: e.target.value})}
                placeholder="Adresse complète"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-clientPhone">Téléphone du client</Label>
                <Input
                  id="edit-clientPhone"
                  value={formData.clientPhone}
                  onChange={(e) => setFormData({...formData, clientPhone: e.target.value})}
                  placeholder="+33 1 23 45 67 89"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-dueDate">Date d'échéance</Label>
                <Input
                  id="edit-dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Notes sur la facture"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleUpdateInvoice} disabled={!formData.amount || !formData.clientName || !formData.clientEmail}>
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 