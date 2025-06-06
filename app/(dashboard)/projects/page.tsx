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
  FolderOpen,
  Calendar,
  User,
  DollarSign,
  Filter,
  Eye,
  Upload,
  X
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
import { useConfirmDialog } from "@/components/ui/confirm-dialog"

interface Project {
  id: string
  name: string
  description?: string
  status: string
  type: string
  amount: number
  startDate?: string
  endDate?: string
  createdAt: string
  client?: {
    id: string
    name: string
  }
  _count: {
    services: number
    expenses: number
    invoices: number
  }
}

interface Client {
  id: string
  name: string
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [clientFilter, setClientFilter] = useState("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "IN_PROGRESS",
    type: "DEVELOPMENT",
    amount: "",
    clientId: "",
    startDate: "",
    endDate: "",
    logo: ""
  })

  const { confirm, ConfirmDialog } = useConfirmDialog()

  useEffect(() => {
    fetchProjects()
    fetchClients()
  }, [])

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects')
      if (response.ok) {
        const data = await response.json()
        setProjects(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des projets:', error)
      toast.error('Erreur lors du chargement des projets')
    } finally {
      setLoading(false)
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

  const handleCreateProject = async () => {
    try {
      const projectData = {
        ...formData,
        amount: parseFloat(formData.amount) || 0,
        clientId: formData.clientId === "none" ? null : formData.clientId || null,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null
      }

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
      })

      if (response.ok) {
        toast.success('Projet créé avec succès')
        setIsCreateDialogOpen(false)
        resetForm()
        fetchProjects()
      } else {
        toast.error('Erreur lors de la création du projet')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la création du projet')
    }
  }

  const handleUpdateProject = async () => {
    if (!selectedProject) return

    try {
      const projectData = {
        ...formData,
        amount: parseFloat(formData.amount) || 0,
        clientId: formData.clientId === "none" ? null : formData.clientId || null,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null
      }

      const response = await fetch(`/api/projects/${selectedProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
      })

      if (response.ok) {
        toast.success('Projet mis à jour avec succès')
        setIsEditDialogOpen(false)
        resetForm()
        fetchProjects()
      } else {
        toast.error('Erreur lors de la mise à jour du projet')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la mise à jour du projet')
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    confirm({
      title: "Supprimer le projet",
      description: "Êtes-vous sûr de vouloir supprimer ce projet ? Cette action est irréversible.",
      confirmText: "Supprimer",
      variant: "destructive",
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/projects/${projectId}`, {
            method: 'DELETE'
          })

          if (response.ok) {
            toast.success('Projet supprimé avec succès')
            fetchProjects()
          } else {
            toast.error('Erreur lors de la suppression du projet')
          }
        } catch (error) {
          console.error('Erreur:', error)
          toast.error('Erreur lors de la suppression du projet')
        }
      }
    })
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'logo')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        setFormData(prev => ({ ...prev, logo: data.url }))
        toast.success('Logo uploadé avec succès')
      } else {
        toast.error('Erreur lors de l\'upload du logo')
      }
    } catch (error) {
      console.error('Erreur upload:', error)
      toast.error('Erreur lors de l\'upload du logo')
    } finally {
      setUploading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      status: "IN_PROGRESS",
      type: "CLIENT",
      amount: "",
      clientId: "none",
      startDate: "",
      endDate: "",
      logo: ""
    })
    setSelectedProject(null)
  }

  const openEditDialog = (project: Project) => {
    setSelectedProject(project)
    setFormData({
      name: project.name,
      description: project.description || "",
      status: project.status,
      type: project.type,
      amount: project.amount.toString(),
      clientId: project.client?.id || "none",
      startDate: project.startDate ? project.startDate.split('T')[0] : "",
      endDate: project.endDate ? project.endDate.split('T')[0] : "",
      logo: ""
    })
    setIsEditDialogOpen(true)
  }

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'IN_PROGRESS': { label: 'En cours', variant: 'default' as const },
      'COMPLETED': { label: 'Terminé', variant: 'default' as const },
      'ON_HOLD': { label: 'En pause', variant: 'secondary' as const },
      'CANCELLED': { label: 'Annulé', variant: 'destructive' as const },
    }
    
    return statusMap[status as keyof typeof statusMap] || { label: status, variant: 'outline' as const }
  }

  const getTypeBadge = (type: string) => {
    const typeMap = {
      'PERSONAL': { label: 'Personnel', color: 'bg-gray-100 text-gray-800' },
      'CLIENT': { label: 'Client', color: 'bg-blue-100 text-blue-800' },
      'DEVELOPMENT': { label: 'Développement', color: 'bg-purple-100 text-purple-800' },
      'MAINTENANCE': { label: 'Maintenance', color: 'bg-orange-100 text-orange-800' },
      'CONSULTING': { label: 'Conseil', color: 'bg-green-100 text-green-800' },
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

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (project.client && project.client.name.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = statusFilter === "all" || project.status === statusFilter
    const matchesClient = clientFilter === "all" || project.client?.id === clientFilter
    
    return matchesSearch && matchesStatus && matchesClient
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">Projets</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Gérez vos projets et suivez leur progression
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Nouveau projet</span>
              <span className="sm:hidden">Nouveau</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Nouveau projet</DialogTitle>
              <DialogDescription>
                Créez un nouveau projet pour votre portefeuille.
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto max-h-[65vh] px-1">
              <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nom du projet *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Nom du projet"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Description du projet"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="status">Statut</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                      <SelectItem value="COMPLETED">Terminé</SelectItem>
                      <SelectItem value="ON_HOLD">En pause</SelectItem>
                      <SelectItem value="CANCELLED">Annulé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="type">Type</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERSONAL">Personnel</SelectItem>
                      <SelectItem value="CLIENT">Client</SelectItem>
                      <SelectItem value="DEVELOPMENT">Développement</SelectItem>
                      <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                      <SelectItem value="CONSULTING">Conseil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="amount">Montant (XOF)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    placeholder="0"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="client">Client</Label>
                  <Select value={formData.clientId} onValueChange={(value) => setFormData({...formData, clientId: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un client" />
                    </SelectTrigger>
                                      <SelectContent>
                    <SelectItem value="none">Aucun client</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Logo */}
              <div className="grid gap-2">
                <Label>Logo du projet</Label>
                <div className="flex items-center gap-4">
                  {formData.logo ? (
                    <div className="relative">
                      <img src={formData.logo} alt="Logo projet" className="w-16 h-16 rounded-lg object-cover border" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                        onClick={() => setFormData(prev => ({ ...prev, logo: "" }))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                      <Upload className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={uploading}
                      className="hidden"
                      id="logo-upload"
                    />
                    <Label htmlFor="logo-upload" className="cursor-pointer">
                      <Button type="button" variant="outline" disabled={uploading} asChild>
                        <span>
                          {uploading ? 'Upload...' : 'Choisir un logo'}
                        </span>
                      </Button>
                    </Label>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="startDate">Date de début</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="endDate">Date de fin</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                  />
                </div>
              </div>
            </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="w-full sm:w-auto">
                Annuler
              </Button>
              <Button onClick={handleCreateProject} disabled={!formData.name} className="w-full sm:w-auto">
                Créer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="relative flex-1 max-w-full sm:max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un projet..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="IN_PROGRESS">En cours</SelectItem>
              <SelectItem value="COMPLETED">Terminé</SelectItem>
              <SelectItem value="ON_HOLD">En pause</SelectItem>
              <SelectItem value="CANCELLED">Annulé</SelectItem>
            </SelectContent>
          </Select>
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <User className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les clients</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {filteredProjects.map((project, index) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover:shadow-md transition-shadow h-full">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0">
                    <FolderOpen className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-sm sm:text-base truncate">{project.name}</CardTitle>
                    {project.client && (
                      <CardDescription className="text-xs sm:text-sm truncate">{project.client.name}</CardDescription>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0 shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <a href={`/projects/${project.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        Voir détails
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openEditDialog(project)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDeleteProject(project.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {project.description && (
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                      {project.description}
                    </p>
                  )}
                  
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
                    <Badge variant={getStatusBadge(project.status).variant} className="w-fit">
                      {getStatusBadge(project.status).label}
                    </Badge>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium w-fit ${getTypeBadge(project.type).color}`}>
                      {getTypeBadge(project.type).label}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between text-xs sm:text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <DollarSign className="mr-1 h-3 w-3 shrink-0" />
                      <span className="truncate">{formatCurrency(project.amount)}</span>
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <Calendar className="mr-1 h-3 w-3 shrink-0" />
                      <span>{project._count.services} service{project._count.services !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  {(project.startDate || project.endDate) && (
                    <div className="text-xs text-muted-foreground border-t pt-2">
                      {project.startDate && (
                        <div>Début: {new Date(project.startDate).toLocaleDateString('fr-FR')}</div>
                      )}
                      {project.endDate && (
                        <div>Fin: {new Date(project.endDate).toLocaleDateString('fr-FR')}</div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">Aucun projet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {searchTerm || statusFilter !== "all" || clientFilter !== "all" 
              ? 'Aucun projet ne correspond à vos filtres.' 
              : 'Commencez par créer votre premier projet.'}
          </p>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Modifier le projet</DialogTitle>
            <DialogDescription>
              Modifiez les informations du projet.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[65vh] px-1">
            <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Nom du projet *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Nom du projet"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Description du projet"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-status">Statut</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                    <SelectItem value="COMPLETED">Terminé</SelectItem>
                    <SelectItem value="ON_HOLD">En pause</SelectItem>
                    <SelectItem value="CANCELLED">Annulé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-type">Type</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERSONAL">Personnel</SelectItem>
                    <SelectItem value="CLIENT">Client</SelectItem>
                    <SelectItem value="DEVELOPMENT">Développement</SelectItem>
                    <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                    <SelectItem value="CONSULTING">Conseil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-amount">Montant (XOF)</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  placeholder="0"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-client">Client</Label>
                <Select value={formData.clientId} onValueChange={(value) => setFormData({...formData, clientId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun client</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Logo */}
            <div className="grid gap-2">
              <Label>Logo du projet</Label>
              <div className="flex items-center gap-4">
                {formData.logo ? (
                  <div className="relative">
                    <img src={formData.logo} alt="Logo projet" className="w-16 h-16 rounded-lg object-cover border" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                      onClick={() => setFormData(prev => ({ ...prev, logo: "" }))}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                    <Upload className="h-6 w-6 text-gray-400" />
                  </div>
                )}
                <div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={uploading}
                    className="hidden"
                    id="edit-logo-upload"
                  />
                  <Label htmlFor="edit-logo-upload" className="cursor-pointer">
                    <Button type="button" variant="outline" disabled={uploading} asChild>
                      <span>
                        {uploading ? 'Upload...' : 'Choisir un logo'}
                      </span>
                    </Button>
                  </Label>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-startDate">Date de début</Label>
                <Input
                  id="edit-startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-endDate">Date de fin</Label>
                <Input
                  id="edit-endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                />
              </div>
            </div>
          </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="w-full sm:w-auto">
              Annuler
            </Button>
            <Button onClick={handleUpdateProject} disabled={!formData.name} className="w-full sm:w-auto">
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog />
    </div>
  )
} 