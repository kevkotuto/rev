"use client"

import React, { useEffect, useState } from "react"
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
  CheckSquare,
  Clock,
  AlertTriangle,
  Filter,
  FolderOpen,
  Move,
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

interface Task {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  dueDate?: string
  createdAt: string
  project?: {
    id: string
    name: string
  }
  parent?: {
    id: string
    title: string
  }
  _count: {
    children: number
  }
}

interface Project {
  id: string
  name: string
}

const statusColumns = [
  { id: 'TODO', label: 'À faire', color: 'bg-gray-100' },
  { id: 'IN_PROGRESS', label: 'En cours', color: 'bg-blue-100' },
  { id: 'REVIEW', label: 'En révision', color: 'bg-yellow-100' },
  { id: 'DONE', label: 'Terminé', color: 'bg-green-100' }
]

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [projectFilter, setProjectFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)

  const { confirm, ConfirmDialog } = useConfirmDialog()
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "TODO",
    priority: "MEDIUM",
    projectId: "",
    parentId: "",
    dueDate: ""
  })

  useEffect(() => {
    fetchTasks()
    fetchProjects()
  }, [])

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks')
      if (response.ok) {
        const data = await response.json()
        setTasks(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des tâches:', error)
      toast.error('Erreur lors du chargement des tâches')
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

  const handleCreateTask = async () => {
    try {
      const taskData = {
        ...formData,
        projectId: formData.projectId === "none" ? null : formData.projectId || null,
        parentId: formData.parentId === "none" ? null : formData.parentId || null,
        dueDate: formData.dueDate || null
      }

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      })

      if (response.ok) {
        toast.success('Tâche créée avec succès')
        setIsCreateDialogOpen(false)
        resetForm()
        fetchTasks()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors de la création de la tâche')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la création de la tâche')
    }
  }

  const handleUpdateTask = async () => {
    if (!selectedTask) return

    try {
      const taskData = {
        ...formData,
        projectId: formData.projectId === "none" ? null : formData.projectId || null,
        parentId: formData.parentId === "none" ? null : formData.parentId || null,
        dueDate: formData.dueDate || null
      }

      const response = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      })

      if (response.ok) {
        toast.success('Tâche mise à jour avec succès')
        setIsEditDialogOpen(false)
        resetForm()
        fetchTasks()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors de la mise à jour de la tâche')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la mise à jour de la tâche')
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    confirm({
      title: "Supprimer la tâche",
      description: "Êtes-vous sûr de vouloir supprimer cette tâche ? Cette action est irréversible.",
      confirmText: "Supprimer",
      variant: "destructive",
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'DELETE'
          })

          if (response.ok) {
            toast.success('Tâche supprimée avec succès')
            fetchTasks()
          } else {
            toast.error('Erreur lors de la suppression de la tâche')
          }
        } catch (error) {
          console.error('Erreur:', error)
          toast.error('Erreur lors de la suppression de la tâche')
        }
      }
    })
  }

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        toast.success('Statut mis à jour')
        fetchTasks()
      } else {
        toast.error('Erreur lors de la mise à jour du statut')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la mise à jour du statut')
    }
  }

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      status: "TODO",
      priority: "MEDIUM",
      projectId: "none",
      parentId: "none",
      dueDate: ""
    })
    setSelectedTask(null)
  }

  const openEditDialog = (task: Task) => {
    setSelectedTask(task)
    setFormData({
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: task.priority,
      projectId: task.project?.id || "none",
      parentId: task.parent?.id || "none",
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : ""
    })
    setIsEditDialogOpen(true)
  }

  const getPriorityBadge = (priority: string) => {
    const priorityMap = {
      'LOW': { label: 'Faible', variant: 'secondary' as const, icon: null },
      'MEDIUM': { label: 'Moyenne', variant: 'default' as const, icon: null },
      'HIGH': { label: 'Haute', variant: 'destructive' as const, icon: AlertTriangle },
      'URGENT': { label: 'Urgent', variant: 'destructive' as const, icon: AlertTriangle },
    }
    
    return priorityMap[priority as keyof typeof priorityMap] || { label: priority, variant: 'outline' as const, icon: null }
  }

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesProject = projectFilter === "all" || task.project?.id === projectFilter
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter
    
    return matchesSearch && matchesProject && matchesPriority
  })

  const getTasksByStatus = (status: string) => {
    return filteredTasks.filter(task => task.status === status)
  }

  // Fonctions de drag and drop
  const handleDragStart = (task: Task, e: React.DragEvent) => {
    setDraggedTask(task)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', task.id)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (targetStatus: string, e: React.DragEvent) => {
    e.preventDefault()
    if (!draggedTask || draggedTask.status === targetStatus) {
      setDraggedTask(null)
      return
    }

    try {
      const response = await fetch(`/api/tasks/${draggedTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus })
      })

      if (response.ok) {
        // Mettre à jour la tâche localement
        setTasks(prev => prev.map(task => 
          task.id === draggedTask.id 
            ? { ...task, status: targetStatus }
            : task
        ))
        toast.success(`Tâche déplacée vers "${statusColumns.find(col => col.id === targetStatus)?.label}"`)
      } else {
        toast.error('Erreur lors du déplacement de la tâche')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors du déplacement de la tâche')
    }

    setDraggedTask(null)
  }

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Tâches</h1>
          <p className="text-muted-foreground">
            Gérez vos tâches avec une vue Kanban interactive
          </p>
          {tasks.length > 0 && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{tasks.length} tâche{tasks.length !== 1 ? 's' : ''} au total</span>
              <span>•</span>
              <span>{tasks.filter(t => t.status === 'DONE').length} terminée{tasks.filter(t => t.status === 'DONE').length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle tâche
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Nouvelle tâche</DialogTitle>
              <DialogDescription>
                Créez une nouvelle tâche pour vos projets.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Titre *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Titre de la tâche"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Description de la tâche"
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
                      <SelectItem value="TODO">À faire</SelectItem>
                      <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                      <SelectItem value="REVIEW">En révision</SelectItem>
                      <SelectItem value="DONE">Terminé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="priority">Priorité</Label>
                  <Select value={formData.priority} onValueChange={(value) => setFormData({...formData, priority: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Faible</SelectItem>
                      <SelectItem value="MEDIUM">Moyenne</SelectItem>
                      <SelectItem value="HIGH">Haute</SelectItem>
                      <SelectItem value="URGENT">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
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
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="parentTask">Tâche parente (optionnel)</Label>
                <Select value={formData.parentId || "none"} onValueChange={(value) => setFormData({...formData, parentId: value === "none" ? "" : value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une tâche parente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune tâche parente</SelectItem>
                    {tasks.filter(t => t.status !== 'DONE').map((task) => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreateTask} disabled={!formData.title}>
                Créer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters - Responsive */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Barre de recherche */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une tâche..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
          
          {/* Filtres */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-full sm:w-[180px] h-10">
                <FolderOpen className="mr-2 h-4 w-4 flex-shrink-0" />
                <SelectValue placeholder="Projet" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les projets</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <span className="truncate">{project.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full sm:w-[180px] h-10">
                <Filter className="mr-2 h-4 w-4 flex-shrink-0" />
                <SelectValue placeholder="Priorité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les priorités</SelectItem>
                <SelectItem value="LOW">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                    Faible
                  </div>
                </SelectItem>
                <SelectItem value="MEDIUM">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    Moyenne
                  </div>
                </SelectItem>
                <SelectItem value="HIGH">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                    Haute
                  </div>
                </SelectItem>
                <SelectItem value="URGENT">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    Urgent
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Statistiques rapides */}
        {(searchTerm || projectFilter !== "all" || priorityFilter !== "all") && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{filteredTasks.length} tâche{filteredTasks.length !== 1 ? 's' : ''} trouvée{filteredTasks.length !== 1 ? 's' : ''}</span>
              {searchTerm && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSearchTerm("")}
                  className="h-6 px-2 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Effacer recherche
                </Button>
              )}
              {(projectFilter !== "all" || priorityFilter !== "all") && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setProjectFilter("all")
                    setPriorityFilter("all")
                  }}
                  className="h-6 px-2 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Réinitialiser filtres
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {statusColumns.map((column) => (
          <div key={column.id} className="space-y-4">
            {/* En-tête de colonne amélioré */}
            <div className={`p-4 rounded-lg ${column.color} border border-gray-200/50`}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-gray-800">
                  {column.label}
                </h3>
                <Badge 
                  variant="secondary" 
                  className="bg-white/80 text-gray-700 border border-gray-300/50"
                >
                  {getTasksByStatus(column.id).length}
                </Badge>
              </div>
            </div>
            
            {/* Zone de drop améliorée */}
            <div 
              className={`space-y-3 min-h-[500px] p-3 rounded-lg border-2 border-dashed transition-all duration-200 ${
                draggedTask && draggedTask.status !== column.id 
                  ? 'border-blue-400 bg-blue-50/50 shadow-inner' 
                  : 'border-gray-200 bg-gray-50/30'
              }`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(column.id, e)}
            >
              {getTasksByStatus(column.id).map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`${draggedTask?.id === task.id ? 'opacity-50' : ''}`}
                >
                  <Card 
                    className={`hover:shadow-md transition-all cursor-move group relative border-l-4 ${
                      task.priority === 'URGENT' ? 'border-l-red-500' :
                      task.priority === 'HIGH' ? 'border-l-orange-500' :
                      task.priority === 'MEDIUM' ? 'border-l-blue-500' : 'border-l-gray-300'
                    } ${draggedTask?.id === task.id ? 'shadow-lg scale-105' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(task, e)}
                  >
                    <CardHeader className="pb-3 space-y-2">
                      {/* Header avec titre et menu */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0 flex-1">
                          <Move className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-sm font-medium leading-tight break-words hyphens-auto">
                              {task.title}
                            </CardTitle>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {statusColumns.map((status) => (
                              <DropdownMenuItem 
                                key={status.id}
                                onClick={() => handleStatusChange(task.id, status.id)}
                                disabled={task.status === status.id}
                                className="text-sm"
                              >
                                <Move className="mr-2 h-4 w-4" />
                                Déplacer vers {status.label}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuItem onClick={() => openEditDialog(task)} className="text-sm">
                              <Edit className="mr-2 h-4 w-4" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteTask(task.id)}
                              className="text-red-600 text-sm"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Informations du projet et parent */}
                      <div className="space-y-1">
                        {task.project && (
                          <CardDescription className="text-xs flex items-center gap-1 truncate">
                            <FolderOpen className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{task.project.name}</span>
                          </CardDescription>
                        )}
                        
                        {task.parent && (
                          <CardDescription className="text-xs text-purple-600 flex items-center gap-1">
                            <span className="flex-shrink-0">↳</span>
                            <span className="truncate">Sous-tâche de: {task.parent.title}</span>
                          </CardDescription>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-3">
                      {/* Description */}
                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                          {task.description}
                        </p>
                      )}
                      
                      {/* Badges et informations */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <Badge 
                            variant={getPriorityBadge(task.priority).variant}
                            className="text-xs flex items-center gap-1 flex-shrink-0"
                          >
                            {getPriorityBadge(task.priority).icon && 
                              React.createElement(getPriorityBadge(task.priority).icon!, { className: "h-3 w-3" })
                            }
                            {getPriorityBadge(task.priority).label}
                          </Badge>
                          
                          {task._count.children > 0 && (
                            <Badge variant="outline" className="text-xs flex-shrink-0">
                              {task._count.children} sous-tâche{task._count.children !== 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>

                        {/* Date d'échéance */}
                        {task.dueDate && (
                          <div className="flex items-center gap-1 text-xs">
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            <span className={`${
                              new Date(task.dueDate) < new Date() && task.status !== 'DONE'
                                ? 'text-red-600 font-medium' 
                                : task.status === 'DONE'
                                ? 'text-green-600'
                                : 'text-muted-foreground'
                            }`}>
                              {new Date(task.dueDate).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                year: new Date(task.dueDate).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                              })}
                            </span>
                            {new Date(task.dueDate) < new Date() && task.status !== 'DONE' && (
                              <Badge variant="destructive" className="text-xs ml-1">
                                En retard
                              </Badge>
                            )}
                            {task.status === 'DONE' && (
                              <Badge variant="default" className="text-xs ml-1 bg-green-100 text-green-700 border-green-300">
                                Terminé
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                    
                    {/* Indicateur de drag et hover */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none" />
                    
                    {/* Indicateur de priorité sur le côté */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg transition-all duration-200 ${
                      task.priority === 'URGENT' ? 'bg-red-500' :
                      task.priority === 'HIGH' ? 'bg-orange-500' :
                      task.priority === 'MEDIUM' ? 'bg-blue-500' : 'bg-gray-300'
                    } ${draggedTask?.id === task.id ? 'w-2' : ''}`} />
                  </Card>
                </motion.div>
              ))}
              
              {/* Zone de drop vide améliorée */}
              {getTasksByStatus(column.id).length === 0 && (
                <div className={`flex items-center justify-center h-40 border-2 border-dashed rounded-lg transition-all duration-200 ${
                  draggedTask && draggedTask.status !== column.id
                    ? 'border-blue-400 bg-blue-50/50 text-blue-600 shadow-inner'
                    : 'border-gray-300 text-muted-foreground bg-white/50'
                }`}>
                  <div className="text-center p-4">
                    <Move className={`mx-auto h-8 w-8 mb-3 transition-all duration-200 ${
                      draggedTask && draggedTask.status !== column.id
                        ? 'text-blue-500 scale-110'
                        : 'text-gray-400'
                    }`} />
                    <p className="text-sm font-medium">
                      {draggedTask && draggedTask.status !== column.id 
                        ? 'Déposer la tâche ici' 
                        : 'Aucune tâche'}
                    </p>
                    {draggedTask && draggedTask.status !== column.id && (
                      <p className="text-xs text-blue-500 mt-1">
                        Relâchez pour déplacer
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Modifier la tâche</DialogTitle>
            <DialogDescription>
              Modifiez les informations de la tâche.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">Titre *</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Titre de la tâche"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Description de la tâche"
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
                    <SelectItem value="TODO">À faire</SelectItem>
                    <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                    <SelectItem value="REVIEW">En révision</SelectItem>
                    <SelectItem value="DONE">Terminé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-priority">Priorité</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData({...formData, priority: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Faible</SelectItem>
                    <SelectItem value="MEDIUM">Moyenne</SelectItem>
                    <SelectItem value="HIGH">Haute</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
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
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit-parentTask">Tâche parente (optionnel)</Label>
              <Select value={formData.parentId || "none"} onValueChange={(value) => setFormData({...formData, parentId: value === "none" ? "" : value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une tâche parente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune tâche parente</SelectItem>
                  {tasks.filter(t => t.status !== 'DONE' && t.id !== selectedTask?.id).map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleUpdateTask} disabled={!formData.title}>
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog />
    </div>
  )
} 