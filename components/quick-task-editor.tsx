"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  CheckSquare, 
  Clock, 
  AlertTriangle, 
  Plus,
  Edit,
  Trash2,
  Calendar,
  FolderOpen,
  CheckCircle2,
  Circle,
  X
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  _count: {
    subtasks: number
  }
}

interface Project {
  id: string
  name: string
}

interface QuickTaskEditorProps {
  maxTasks?: number
  showProjectFilter?: boolean
}

export function QuickTaskEditor({ 
  maxTasks = 10,
  showProjectFilter = true 
}: QuickTaskEditorProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [quickTaskTitle, setQuickTaskTitle] = useState("")
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "TODO",
    priority: "MEDIUM",
    projectId: "none",
    dueDate: ""
  })

  useEffect(() => {
    fetchTasks()
    fetchProjects()
  }, [])

  const fetchTasks = async () => {
    try {
      const params = new URLSearchParams({
        limit: maxTasks.toString(),
        status: 'TODO,IN_PROGRESS,REVIEW' // Exclure les tâches terminées
      })
      
      const response = await fetch(`/api/tasks?${params}`)
      if (response.ok) {
        const data = await response.json()
        setTasks(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des tâches:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects?limit=20')
      if (response.ok) {
        const data = await response.json()
        setProjects(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des projets:', error)
    }
  }

  const handleQuickCreate = async () => {
    if (!quickTaskTitle.trim()) return

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: quickTaskTitle.trim(),
          status: "TODO",
          priority: "MEDIUM"
        })
      })

      if (response.ok) {
        toast.success('Tâche créée avec succès')
        setQuickTaskTitle("")
        fetchTasks()
      } else {
        toast.error('Erreur lors de la création de la tâche')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la création de la tâche')
    }
  }

  const handleDetailedCreate = async () => {
    try {
      const taskData = {
        ...formData,
        projectId: formData.projectId === "none" || !formData.projectId ? null : formData.projectId,
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
        toast.error('Erreur lors de la création de la tâche')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la création de la tâche')
    }
  }

  const handleUpdateTask = async () => {
    if (!selectedTask) return

    try {
      const response = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          dueDate: formData.dueDate || null
        })
      })

      if (response.ok) {
        toast.success('Tâche mise à jour avec succès')
        setIsEditDialogOpen(false)
        resetForm()
        fetchTasks()
      } else {
        toast.error('Erreur lors de la mise à jour de la tâche')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la mise à jour de la tâche')
    }
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

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) return

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

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      status: "TODO",
      priority: "MEDIUM",
      projectId: "none",
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
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ""
    })
    setIsEditDialogOpen(true)
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return <AlertTriangle className="h-3 w-3 text-red-500" />
      case 'HIGH':
        return <AlertTriangle className="h-3 w-3 text-orange-500" />
      case 'MEDIUM':
        return <Clock className="h-3 w-3 text-blue-500" />
      default:
        return <Clock className="h-3 w-3 text-gray-500" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'destructive'
      case 'HIGH':
        return 'secondary'
      case 'MEDIUM':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DONE':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'IN_PROGRESS':
        return <Circle className="h-4 w-4 text-blue-500" />
      case 'REVIEW':
        return <Clock className="h-4 w-4 text-orange-500" />
      default:
        return <Circle className="h-4 w-4 text-gray-500" />
    }
  }

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && dueDate
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Tâches rapides
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              Tâches à faire
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Ajouter
            </Button>
          </CardTitle>
          <CardDescription>
            Gérez vos tâches importantes rapidement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Création rapide de tâche */}
          <div className="flex gap-2">
            <Input
              placeholder="Nouvelle tâche rapide..."
              value={quickTaskTitle}
              onChange={(e) => setQuickTaskTitle(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleQuickCreate()
                }
              }}
              className="flex-1"
            />
            <Button 
              size="sm" 
              onClick={handleQuickCreate}
              disabled={!quickTaskTitle.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Liste des tâches */}
          <div className="space-y-3">
            {tasks.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Aucune tâche en cours</p>
                <p className="text-sm">Toutes vos tâches sont terminées !</p>
              </div>
            ) : (
              tasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-3 border rounded-lg hover:bg-muted/50 transition-colors ${
                    task.dueDate && isOverdue(task.dueDate) ? 'border-red-200 bg-red-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="p-0 h-6 w-6"
                        onClick={() => handleStatusChange(
                          task.id, 
                          task.status === 'DONE' ? 'TODO' : 'DONE'
                        )}
                      >
                        {getStatusIcon(task.status)}
                      </Button>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-medium text-sm truncate ${
                          task.status === 'DONE' ? 'line-through text-muted-foreground' : ''
                        }`}>
                          {task.title}
                        </h4>
                        
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            variant={getPriorityColor(task.priority) as any}
                            className="text-xs h-5"
                          >
                            {getPriorityIcon(task.priority)}
                            <span className="ml-1 hidden sm:inline">
                              {task.priority === 'URGENT' ? 'Urgent' : 
                               task.priority === 'HIGH' ? 'Haute' :
                               task.priority === 'MEDIUM' ? 'Moyenne' : 'Faible'}
                            </span>
                          </Badge>
                          
                          {task.project && (
                            <Badge variant="outline" className="text-xs h-5">
                              <FolderOpen className="h-3 w-3 mr-1" />
                              <span className="hidden sm:inline">{task.project.name}</span>
                            </Badge>
                          )}
                          
                          {task._count.subtasks > 0 && (
                            <Badge variant="secondary" className="text-xs h-5">
                              {task._count.subtasks} sous-tâche{task._count.subtasks > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        
                        {task.dueDate && (
                          <div className={`flex items-center mt-1 text-xs ${
                            isOverdue(task.dueDate) ? 'text-red-600' : 'text-muted-foreground'
                          }`}>
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(task.dueDate).toLocaleDateString('fr-FR')}
                            {isOverdue(task.dueDate) && (
                              <span className="ml-1 font-medium">(En retard)</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => openEditDialog(task)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 hover:bg-red-100"
                        onClick={() => handleDeleteTask(task.id)}
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {tasks.length >= maxTasks && (
            <div className="text-center">
              <Button 
                variant="link" 
                size="sm"
                onClick={() => window.location.href = '/tasks'}
              >
                Voir toutes les tâches ({maxTasks}+)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de création détaillée */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nouvelle tâche</DialogTitle>
            <DialogDescription>
              Créez une nouvelle tâche avec tous les détails
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Titre *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Titre de la tâche"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description de la tâche"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="status">Statut</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
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
                <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
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
            {showProjectFilter && (
              <div className="grid gap-2">
                <Label htmlFor="project">Projet</Label>
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
            )}
            <div className="grid gap-2">
              <Label htmlFor="dueDate">Date d'échéance</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleDetailedCreate} disabled={!formData.title}>
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog d'édition */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Modifier la tâche</DialogTitle>
            <DialogDescription>
              Modifiez les détails de la tâche
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">Titre *</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Titre de la tâche"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description de la tâche"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-status">Statut</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
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
                <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
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
            {showProjectFilter && (
              <div className="grid gap-2">
                <Label htmlFor="edit-project">Projet</Label>
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
            )}
            <div className="grid gap-2">
              <Label htmlFor="edit-dueDate">Date d'échéance</Label>
              <Input
                id="edit-dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleUpdateTask} disabled={!formData.title}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
} 