"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  Mail, 
  Download, 
  ExternalLink,
  FileText,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  MoreHorizontal,
  Copy,
  RefreshCw,
  Link,
  CreditCard
} from "lucide-react"
import { toast } from "sonner"
import { formatCurrency, formatDate } from "@/lib/format"
import { EmailPreviewDialog } from "@/components/email-preview-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface Invoice {
  id: string
  invoiceNumber: string
  type: "INVOICE" | "PROFORMA"
  amount: number
  status: "PENDING" | "PAID" | "OVERDUE" | "CANCELLED"
  dueDate?: string
  paidDate?: string
  paymentLink?: string
  notes?: string
  clientName?: string
  clientEmail?: string
  clientAddress?: string
  clientPhone?: string
  project?: {
    id: string
    name: string
    client?: {
      id: string
      name: string
      email?: string
    }
  }
  createdAt: string
  updatedAt: string
}

interface InvoiceFormData {
  type: "INVOICE" | "PROFORMA"
  amount: number
  dueDate?: string
  paidDate?: string
  notes?: string
  clientName?: string
  clientEmail?: string
  clientAddress?: string
  clientPhone?: string
  projectId?: string
  generatePaymentLink?: boolean
}

interface Project {
  id: string
  name: string
  amount: number
  client?: {
    id: string
    name: string
    email?: string
  }
}

interface Client {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  company?: string
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [emailInvoiceId, setEmailInvoiceId] = useState<string>("")
  const [emailInvoiceType, setEmailInvoiceType] = useState<"INVOICE" | "PROFORMA">("INVOICE")
  const [formData, setFormData] = useState<InvoiceFormData>({
    type: "INVOICE",
    amount: 0,
    generatePaymentLink: false
  })

  // Statistiques
  const [stats, setStats] = useState({
    total: 0,
    paid: 0,
    pending: 0,
    overdue: 0,
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0
  })

  useEffect(() => {
    fetchInvoices()
    fetchProjects()
    fetchClients()
  }, [])

  useEffect(() => {
    calculateStats()
  }, [invoices])

  const fetchInvoices = async () => {
    try {
      const response = await fetch('/api/invoices')
      if (response.ok) {
        const data = await response.json()
        setInvoices(data)
      } else {
        toast.error('Erreur lors du chargement des factures')
      }
    } catch (error) {
      console.error('Erreur:', error)
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

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients')
      if (response.ok) {
        const data = await response.json()
        setClients(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des clients:', error)
    }
  }

  const calculateStats = () => {
    const total = invoices.length
    const paid = invoices.filter(inv => inv.status === 'PAID').length
    const pending = invoices.filter(inv => inv.status === 'PENDING').length
    const overdue = invoices.filter(inv => inv.status === 'OVERDUE').length
    
    const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0)
    const paidAmount = invoices.filter(inv => inv.status === 'PAID').reduce((sum, inv) => sum + inv.amount, 0)
    const pendingAmount = invoices.filter(inv => inv.status === 'PENDING').reduce((sum, inv) => sum + inv.amount, 0)

    setStats({
      total,
      paid,
      pending,
      overdue,
      totalAmount,
      paidAmount,
      pendingAmount
    })
  }

  const handleCreateInvoice = async () => {
    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const newInvoice = await response.json()
        setInvoices([newInvoice, ...invoices])
        setShowCreateDialog(false)
        setFormData({
          type: "INVOICE",
          amount: 0,
          generatePaymentLink: false
        })
        toast.success(`${formData.type === 'PROFORMA' ? 'Proforma' : 'Facture'} créée avec succès`)
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors de la création')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la création')
    }
  }

  const handleEditInvoice = async () => {
    if (!editingInvoice) return

    try {
      const response = await fetch(`/api/invoices/${editingInvoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const updatedInvoice = await response.json()
        setInvoices(invoices.map(inv => inv.id === editingInvoice.id ? updatedInvoice : inv))
        setShowEditDialog(false)
        setEditingInvoice(null)
        toast.success('Facture mise à jour avec succès')
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors de la mise à jour')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette facture ?')) return

    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setInvoices(invoices.filter(inv => inv.id !== invoiceId))
        toast.success('Facture supprimée avec succès')
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la suppression')
    }
  }

  const handleMarkAsPaid = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/mark-paid`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: 'CASH',
          paidDate: new Date().toISOString().split('T')[0]
        })
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(result.message)
        fetchInvoices()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors du marquage comme payée')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors du marquage comme payée')
    }
  }

  const handleGeneratePaymentLink = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/payment-link`, {
        method: 'POST'
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(result.message)
        fetchInvoices()
        
        // Ouvrir le lien de paiement généré
        if (result.paymentLink) {
          window.open(result.paymentLink, '_blank')
        }
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors de la génération du lien de paiement')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la génération du lien de paiement')
    }
  }

  const handleRegeneratePaymentLink = async (invoiceId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir régénérer le lien de paiement ? L\'ancien lien ne fonctionnera plus.')) return

    try {
      const response = await fetch(`/api/invoices/${invoiceId}/payment-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerate: true })
      })

      if (response.ok) {
        const result = await response.json()
        toast.success('Lien de paiement régénéré avec succès')
        fetchInvoices()
        
        // Optionnel: ouvrir le nouveau lien
        if (result.paymentLink) {
          window.open(result.paymentLink, '_blank')
        }
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors de la régénération du lien')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la régénération du lien')
    }
  }

  const copyPaymentLink = async (paymentLink: string) => {
    try {
      await navigator.clipboard.writeText(paymentLink)
      toast.success('Lien de paiement copié dans le presse-papiers')
    } catch (error) {
      toast.error('Erreur lors de la copie du lien')
    }
  }

  const handleSendEmail = (invoice: Invoice) => {
    setEmailInvoiceId(invoice.id)
    setEmailInvoiceType(invoice.type)
    setShowEmailDialog(true)
  }

  const handleDownloadPDF = async (invoice: Invoice) => {
    try {
      const endpoint = invoice.type === 'PROFORMA' 
        ? `/api/proformas/${invoice.id}/pdf`
        : `/api/invoices/${invoice.id}/pdf`
      
      const response = await fetch(endpoint)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${invoice.type.toLowerCase()}-${invoice.invoiceNumber}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('PDF téléchargé avec succès')
      } else {
        toast.error('Erreur lors du téléchargement du PDF')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors du téléchargement du PDF')
    }
  }

  const openEditDialog = (invoice: Invoice) => {
    setEditingInvoice(invoice)
    setFormData({
      type: invoice.type,
      amount: invoice.amount,
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : undefined,
      paidDate: invoice.paidDate ? new Date(invoice.paidDate).toISOString().split('T')[0] : undefined,
      notes: invoice.notes || "",
      clientName: invoice.clientName || "",
      clientEmail: invoice.clientEmail || "",
      clientAddress: invoice.clientAddress || "",
      clientPhone: invoice.clientPhone || "",
      projectId: invoice.project?.id || "",
      generatePaymentLink: !!invoice.paymentLink
    })
    setShowEditDialog(true)
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      PAID: "default",
      PENDING: "secondary", 
      OVERDUE: "destructive",
      CANCELLED: "outline",
      CONVERTED: "default"
    } as const

    const labels = {
      PAID: "Payé",
      PENDING: "En attente",
      OVERDUE: "En retard", 
      CANCELLED: "Annulé",
      CONVERTED: "Convertie"
    }

    return (
      <Badge variant={variants[status as keyof typeof variants] || "outline"}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    )
  }

  const getTypeIcon = (type: string) => {
    return type === 'PROFORMA' ? (
      <FileText className="h-4 w-4 text-blue-600" />
    ) : (
      <DollarSign className="h-4 w-4 text-green-600" />
    )
  }

  // Filtrer les factures
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.project?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.project?.client?.name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter
    const matchesType = typeFilter === "all" || invoice.type === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Chargement des factures...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Factures & Proformas</h1>
          <p className="text-muted-foreground">
            Gérez vos factures et proformas, envoyez-les par email avec PDF
          </p>
        </div>
        <Button onClick={() => {
          setFormData({
            type: "INVOICE",
            amount: 0,
            generatePaymentLink: false
          })
          setShowCreateDialog(true)
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle facture
        </Button>
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.totalAmount)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payées</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.paidAmount)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.pendingAmount)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En retard</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <p className="text-xs text-muted-foreground">
              Nécessitent une attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et recherche */}
      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par numéro, client, projet..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="PENDING">En attente</SelectItem>
                <SelectItem value="PAID">Payé</SelectItem>
                <SelectItem value="OVERDUE">En retard</SelectItem>
                <SelectItem value="CANCELLED">Annulé</SelectItem>
                <SelectItem value="CONVERTED">Convertie</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="INVOICE">Factures</SelectItem>
                <SelectItem value="PROFORMA">Proformas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Liste des factures */}
      <Card>
        <CardHeader>
          <CardTitle>
            Factures ({filteredInvoices.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold">Aucune facture</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchTerm || statusFilter !== "all" || typeFilter !== "all"
                  ? "Aucune facture ne correspond aux critères de recherche."
                  : "Commencez par créer votre première facture."}
              </p>
              {(!searchTerm && statusFilter === "all" && typeFilter === "all") && (
                <Button 
                  className="mt-4" 
                  onClick={() => setShowCreateDialog(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Créer une facture
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    {getTypeIcon(invoice.type)}
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">{invoice.invoiceNumber}</h3>
                        {getStatusBadge(invoice.status)}
                        {invoice.paymentLink && (
                          <div className="flex items-center text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            <CreditCard className="h-3 w-3 mr-1" />
                            Wave
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {invoice.clientName || invoice.project?.client?.name || 'Client non défini'}
                        {invoice.project && (
                          <span className="ml-2">• {invoice.project.name}</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Créé le {formatDate(invoice.createdAt)}
                        {invoice.dueDate && (
                          <span className="ml-2">• Échéance: {formatDate(invoice.dueDate)}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(invoice.amount)}</div>
                      {invoice.paymentLink && (
                        <div className="text-xs text-blue-600">Lien de paiement</div>
                      )}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => window.location.href = `/invoices/${invoice.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Voir détails
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem onClick={() => handleSendEmail(invoice)}>
                          <Mail className="mr-2 h-4 w-4" />
                          Envoyer par email
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownloadPDF(invoice)}>
                          <Download className="mr-2 h-4 w-4" />
                          Télécharger PDF
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        {invoice.status !== 'PAID' && invoice.type === 'INVOICE' && (
                          <DropdownMenuItem onClick={() => handleMarkAsPaid(invoice.id)}>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Marquer comme payée
                          </DropdownMenuItem>
                        )}

                        {invoice.type === 'INVOICE' && invoice.status !== 'PAID' && (
                          <DropdownMenuItem onClick={() => handleGeneratePaymentLink(invoice.id)}>
                            <Link className="mr-2 h-4 w-4" />
                            {invoice.paymentLink ? 'Regénérer lien Wave' : 'Générer lien Wave'}
                          </DropdownMenuItem>
                        )}

                        {invoice.paymentLink && (
                          <DropdownMenuItem onClick={() => handleRegeneratePaymentLink(invoice.id)}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Nouveau lien Wave
                          </DropdownMenuItem>
                        )}

                        {invoice.paymentLink && (
                          <>
                            <DropdownMenuItem onClick={() => window.open(invoice.paymentLink, '_blank')}>
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Ouvrir lien de paiement
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => copyPaymentLink(invoice.paymentLink!)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Copier lien de paiement
                            </DropdownMenuItem>
                          </>
                        )}

                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem onClick={() => openEditDialog(invoice)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteInvoice(invoice.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de création */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Créer une nouvelle facture</DialogTitle>
            <DialogDescription>
              Créez une facture ou une proforma pour vos clients
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value: "INVOICE" | "PROFORMA") => 
                  setFormData({...formData, type: value})
                }
              >
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
              <Label htmlFor="project">Projet (optionnel)</Label>
              <Select 
                value={formData.projectId || "none"} 
                onValueChange={(value) => {
                  if (value === "none") {
                    setFormData({
                      ...formData, 
                      projectId: undefined
                    })
                    return
                  }
                  const project = projects.find(p => p.id === value)
                  setFormData({
                    ...formData, 
                    projectId: value || undefined,
                    amount: project ? project.amount : formData.amount,
                    clientName: project?.client?.name || formData.clientName,
                    clientEmail: project?.client?.email || formData.clientEmail
                  })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un projet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun projet</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name} - {formatCurrency(project.amount)}
                      {project.client && ` (${project.client.name})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="amount">Montant</Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                  placeholder="0"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dueDate">Date d'échéance</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate || ""}
                  onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="clientName">Nom du client</Label>
                <Input
                  id="clientName"
                  value={formData.clientName || ""}
                  onChange={(e) => setFormData({...formData, clientName: e.target.value})}
                  placeholder="Nom du client"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="clientEmail">Email du client</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  value={formData.clientEmail || ""}
                  onChange={(e) => setFormData({...formData, clientEmail: e.target.value})}
                  placeholder="email@client.com"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="clientAddress">Adresse du client</Label>
              <Input
                id="clientAddress"
                value={formData.clientAddress || ""}
                onChange={(e) => setFormData({...formData, clientAddress: e.target.value})}
                placeholder="Adresse complète"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="clientPhone">Téléphone du client</Label>
              <Input
                id="clientPhone"
                value={formData.clientPhone || ""}
                onChange={(e) => setFormData({...formData, clientPhone: e.target.value})}
                placeholder="+225 XX XX XX XX"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes || ""}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Notes additionnelles..."
                rows={3}
              />
            </div>

            {formData.type === "INVOICE" && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="generatePaymentLink"
                  checked={formData.generatePaymentLink}
                  onCheckedChange={(checked) => 
                    setFormData({...formData, generatePaymentLink: checked as boolean})
                  }
                />
                <Label htmlFor="generatePaymentLink">
                  Générer un lien de paiement Wave
                </Label>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateInvoice}>
              Créer la {formData.type === 'PROFORMA' ? 'proforma' : 'facture'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de modification */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Modifier la facture</DialogTitle>
            <DialogDescription>
              Modifiez les informations de la facture
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-type">Type</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value: "INVOICE" | "PROFORMA") => 
                  setFormData({...formData, type: value})
                }
              >
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
              <Label htmlFor="edit-client">Client (optionnel)</Label>
              <Select 
                value="" 
                onValueChange={(value) => {
                  if (value === "manual") {
                    // Reset to manual entry
                    return
                  }
                  const client = clients.find(c => c.id === value)
                  if (client) {
                    setFormData({
                      ...formData, 
                      projectId: "",
                      clientName: client.name,
                      clientEmail: client.email || "",
                      clientPhone: client.phone || "",
                      clientAddress: client.address || ""
                    })
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Saisie manuelle</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                      {client.company && ` - ${client.company}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-project">Projet (optionnel)</Label>
              <Select 
                value={formData.projectId || "none"} 
                onValueChange={(value) => {
                  if (value === "none") {
                    setFormData({
                      ...formData, 
                      projectId: undefined
                    })
                    return
                  }
                  const project = projects.find(p => p.id === value)
                  setFormData({
                    ...formData, 
                    projectId: value || undefined,
                    amount: project ? project.amount : formData.amount,
                    clientName: project?.client?.name || formData.clientName,
                    clientEmail: project?.client?.email || formData.clientEmail
                  })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un projet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun projet</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name} - {formatCurrency(project.amount)}
                      {project.client && ` (${project.client.name})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-amount">Montant</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-dueDate">Date d'échéance</Label>
                <Input
                  id="edit-dueDate"
                  type="date"
                  value={formData.dueDate || ""}
                  onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-paidDate">Date de paiement (optionnel)</Label>
              <Input
                id="edit-paidDate"
                type="date"
                value={formData.paidDate || ""}
                onChange={(e) => setFormData({...formData, paidDate: e.target.value})}
                placeholder="Date de paiement si la facture est payée"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-clientName">Nom du client</Label>
                <Input
                  id="edit-clientName"
                  value={formData.clientName || ""}
                  onChange={(e) => setFormData({...formData, clientName: e.target.value})}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-clientEmail">Email du client</Label>
                <Input
                  id="edit-clientEmail"
                  type="email"
                  value={formData.clientEmail || ""}
                  onChange={(e) => setFormData({...formData, clientEmail: e.target.value})}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-clientAddress">Adresse du client</Label>
              <Input
                id="edit-clientAddress"
                value={formData.clientAddress || ""}
                onChange={(e) => setFormData({...formData, clientAddress: e.target.value})}
                placeholder="Adresse complète"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-clientPhone">Téléphone du client</Label>
              <Input
                id="edit-clientPhone"
                value={formData.clientPhone || ""}
                onChange={(e) => setFormData({...formData, clientPhone: e.target.value})}
                placeholder="+225 XX XX XX XX"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes || ""}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleEditInvoice}>
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog d'envoi d'email */}
      <EmailPreviewDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        invoiceId={emailInvoiceId}
        invoiceType={emailInvoiceType}
        onEmailSent={() => {
          setShowEmailDialog(false)
          toast.success('Email envoyé avec succès !')
        }}
      />
    </div>
  )
}
