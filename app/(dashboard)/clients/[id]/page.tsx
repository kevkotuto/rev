"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  ArrowLeft,
  Edit, 
  Mail,
  Phone,
  MapPin,
  Building,
  User,
  Calendar,
  DollarSign,
  FileText,
  Eye,
  Upload,
  X,
  FolderOpen,
  Receipt,
  CheckCircle,
  Clock,
  AlertTriangle
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { motion } from "motion/react"
import { toast } from "sonner"

interface Client {
  id: string
  name: string
  email: string
  phone?: string
  address?: string
  company?: string
  notes?: string
  photo?: string
  createdAt: string
  projects: Array<{
    id: string
    name: string
    type: string
    amount: number
    status: string
    startDate?: string
    endDate?: string
    logo?: string
    _count: {
      invoices: number
      tasks: number
    }
  }>
  invoices: Array<{
    id: string
    invoiceNumber: string
    amount: number
    status: string
    type: string
    createdAt: string
    dueDate?: string
    paidDate?: string
    project?: {
      name: string
    }
  }>
}

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string

  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    company: "",
    notes: "",
    photo: ""
  })

  useEffect(() => {
    if (clientId) {
      fetchClient()
    }
  }, [clientId])

  const fetchClient = async () => {
    try {
      const response = await fetch(`/api/clients/${clientId}`)
      if (response.ok) {
        const data = await response.json()
        setClient(data)
        setFormData({
          name: data.name,
          email: data.email,
          phone: data.phone || "",
          address: data.address || "",
          company: data.company || "",
          notes: data.notes || "",
          photo: data.photo || ""
        })
      } else if (response.status === 404) {
        toast.error("Client non trouvé")
        router.push("/clients")
      }
    } catch (error) {
      console.error('Erreur lors du chargement du client:', error)
      toast.error('Erreur lors du chargement du client')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateClient = async () => {
    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast.success('Client mis à jour avec succès')
        setIsEditDialogOpen(false)
        fetchClient()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors de la mise à jour')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)
      formDataUpload.append('type', 'photo')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload
      })

      if (response.ok) {
        const data = await response.json()
        setFormData(prev => ({ ...prev, photo: data.url }))
        toast.success('Photo uploadée avec succès')
      } else {
        toast.error('Erreur lors de l\'upload de la photo')
      }
    } catch (error) {
      console.error('Erreur upload:', error)
      toast.error('Erreur lors de l\'upload de la photo')
    } finally {
      setUploading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(amount)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID': return CheckCircle
      case 'PENDING': return Clock
      case 'OVERDUE': return AlertTriangle
      default: return Receipt
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'text-green-600'
      case 'PENDING': return 'text-yellow-600'
      case 'OVERDUE': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getProjectStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-600'
      case 'IN_PROGRESS': return 'text-blue-600'
      case 'ON_HOLD': return 'text-yellow-600'
      case 'CANCELLED': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getProjectStatusLabel = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'Terminé'
      case 'IN_PROGRESS': return 'En cours'
      case 'ON_HOLD': return 'En pause'
      case 'CANCELLED': return 'Annulé'
      default: return status
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-600">Client non trouvé</p>
        </div>
      </div>
    )
  }

  const totalRevenue = client.invoices
    .filter(invoice => invoice.status === 'PAID')
    .reduce((sum, invoice) => sum + invoice.amount, 0)

  const pendingRevenue = client.invoices
    .filter(invoice => invoice.status === 'PENDING')
    .reduce((sum, invoice) => sum + invoice.amount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => router.push('/clients')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux clients
          </Button>
        </div>
        
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Edit className="w-4 h-4 mr-2" />
              Modifier
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Modifier le client</DialogTitle>
              <DialogDescription>
                Modifiez les informations du client
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Photo */}
              <div className="grid gap-2">
                <Label>Photo du client</Label>
                <div className="flex items-center gap-4">
                  {formData.photo ? (
                    <div className="relative">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={formData.photo} />
                        <AvatarFallback>{formData.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                        onClick={() => setFormData(prev => ({ ...prev, photo: "" }))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Avatar className="h-16 w-16">
                      <AvatarFallback>
                        <Upload className="h-6 w-6" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      disabled={uploading}
                      className="hidden"
                      id="photo-upload"
                    />
                    <Label htmlFor="photo-upload" className="cursor-pointer">
                      <Button type="button" variant="outline" disabled={uploading} asChild>
                        <span>
                          {uploading ? 'Upload...' : 'Choisir une photo'}
                        </span>
                      </Button>
                    </Label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Entreprise</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Adresse</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleUpdateClient} disabled={!formData.name || !formData.email}>
                Mettre à jour
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Informations principales */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={client.photo} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-2xl">
                {client.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold">{client.name}</h1>
                  {client.company && (
                    <p className="text-xl text-muted-foreground">{client.company}</p>
                  )}
                </div>
                <Badge variant="secondary">
                  Client depuis {new Date(client.createdAt).toLocaleDateString('fr-FR', { 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{client.email}</span>
                </div>
                {client.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{client.phone}</span>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{client.address}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  <span>{client.projects.length} projet{client.projects.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenus totaux</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">
                Factures payées
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En attente</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {formatCurrency(pendingRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">
                Factures en attente
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Projets actifs</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {client.projects.filter(p => p.status === 'IN_PROGRESS').length}
              </div>
              <p className="text-xs text-muted-foreground">
                En cours
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Factures</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {client.invoices.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Total émises
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Notes */}
      {client.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{client.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Projets */}
      <Card>
        <CardHeader>
          <CardTitle>Projets ({client.projects.length})</CardTitle>
          <CardDescription>
            Historique des projets réalisés pour ce client
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {client.projects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => router.push(`/projects/${project.id}`)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-semibold">
                    {project.logo ? (
                      <img src={project.logo} alt={project.name} className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                      project.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium">{project.name}</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline" className={getProjectStatusColor(project.status)}>
                        {getProjectStatusLabel(project.status)}
                      </Badge>
                      <span>•</span>
                      <span>{project._count.invoices} facture{project._count.invoices !== 1 ? 's' : ''}</span>
                      <span>•</span>
                      <span>{project._count.tasks} tâche{project._count.tasks !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{formatCurrency(project.amount)}</div>
                  {project.startDate && (
                    <div className="text-xs text-muted-foreground">
                      {new Date(project.startDate).toLocaleDateString('fr-FR')}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
            
            {client.projects.length === 0 && (
              <div className="text-center py-8">
                <FolderOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-600">Aucun projet pour ce client</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Factures */}
      <Card>
        <CardHeader>
          <CardTitle>Factures ({client.invoices.length})</CardTitle>
          <CardDescription>
            Historique des factures émises pour ce client
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {client.invoices.map((invoice, index) => {
              const StatusIcon = getStatusIcon(invoice.status)
              
              return (
                <motion.div
                  key={invoice.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-full bg-blue-100">
                      <StatusIcon className={`h-4 w-4 ${getStatusColor(invoice.status)}`} />
                    </div>
                    <div>
                      <h4 className="font-medium">{invoice.invoiceNumber}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge 
                          variant={invoice.status === 'PAID' ? 'default' : invoice.status === 'PENDING' ? 'secondary' : 'destructive'}
                        >
                          {invoice.status === 'PAID' ? 'Payée' : invoice.status === 'PENDING' ? 'En attente' : 'En retard'}
                        </Badge>
                        <span>•</span>
                        <span>{invoice.type === 'PROFORMA' ? 'Proforma' : 'Facture'}</span>
                        {invoice.project && (
                          <>
                            <span>•</span>
                            <span>{invoice.project.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatCurrency(invoice.amount)}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(invoice.createdAt).toLocaleDateString('fr-FR')}
                      {invoice.dueDate && (
                        <div>Échéance: {new Date(invoice.dueDate).toLocaleDateString('fr-FR')}</div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
            
            {client.invoices.length === 0 && (
              <div className="text-center py-8">
                <Receipt className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-600">Aucune facture pour ce client</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 