"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useApi, useMutation } from "@/hooks/use-api"
import { useDebounce } from "@/hooks/use-debounce"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ArrowLeft,
  Plus, 
  Edit, 
  Trash2, 
  FileText,
  Upload,
  Calendar,
  Users,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  MoreHorizontal,
  Download,
  Eye,
  ChevronRight,
  ChevronDown,
  User,
  CreditCard,
  Receipt,
  UserPlus,
  Banknote
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
import { ProjectBudget } from "@/components/project-budget"
import { ProformaManagement } from "@/components/proforma-management"
import { ProjectServices } from "@/components/project-services"

interface Project {
  id: string
  name: string
  description?: string
  type: string
  amount: number
  status: string
  startDate?: string
  endDate?: string
  logo?: string
  client?: {
    id: string
    name: string
    email?: string
    phone?: string
  }
  invoices: Array<{
    id: string
    invoiceNumber: string
    type: string
    amount: number
    status: string
  }>
  files: Array<{
    id: string
    filename: string
    originalName: string
    size: number
    mimeType: string
    url: string
    createdAt: string
  }>
  projectProviders: Array<{
    id: string
    amount: number
    isPaid: boolean
    provider: {
      id: string
      name: string
      role?: string
      photo?: string
    }
  }>
  createdAt: string
}

interface Task {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  dueDate?: string
  parentId?: string
  subtasks: Task[]
  createdAt: string
}

interface Provider {
  id: string
  name: string
  email?: string
  phone?: string
  role?: string
  photo?: string
}

interface Expense {
  id: string
  description: string
  amount: number
  category: string
  type: string
  date: string
  notes?: string
  createdAt: string
  project?: {
    id: string
    name: string
  }
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  
  // États pour les dialogs
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false)
  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isProviderDialogOpen, setIsProviderDialogOpen] = useState(false)
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false)
  const [isAdvancePaymentDialogOpen, setIsAdvancePaymentDialogOpen] = useState(false)

  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [selectedProforma, setSelectedProforma] = useState<any>(null)
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())

  // États pour les formulaires
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    status: "TODO",
    priority: "MEDIUM",
    dueDate: "",
    parentId: ""
  })

  const [projectForm, setProjectForm] = useState({
    name: "",
    description: "",
    type: "",
    amount: "",
    status: "",
    startDate: "",
    endDate: ""
  })

  const [providerForm, setProviderForm] = useState({
    providerId: "",
    amount: "",
    notes: ""
  })

  const [expenseForm, setExpenseForm] = useState({
    description: "",
    amount: "",
    category: "OTHER",
    date: new Date().toISOString().split('T')[0],
    notes: ""
  })

  const [advancePaymentForm, setAdvancePaymentForm] = useState({
    amount: "",
    description: "",
    clientEmail: "",
    generatePaymentLink: false
  })



  const [convertForm, setConvertForm] = useState({
    generatePaymentLink: false,
    paymentMethod: "CASH" as "WAVE" | "CASH" | "BANK_TRANSFER",
    markAsPaid: false,
    conversionType: "FULL" as "FULL" | "PARTIAL",
    partialAmount: 0
  })

  const [fileUpload, setFileUpload] = useState<File | null>(null)
  const [fileDescription, setFileDescription] = useState("")

  useEffect(() => {
    if (projectId) {
      fetchProject()
      fetchTasks()
      fetchProviders()
      fetchExpenses()
    }
  }, [projectId])

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setProject(data)
        setProjectForm({
          name: data.name,
          description: data.description || "",
          type: data.type,
          amount: data.amount.toString(),
          status: data.status,
          startDate: data.startDate ? new Date(data.startDate).toISOString().split('T')[0] : "",
          endDate: data.endDate ? new Date(data.endDate).toISOString().split('T')[0] : ""
        })
        
        // Client data will be handled by ProformaManagement component
      } else if (response.status === 404) {
        toast.error("Projet non trouvé")
        router.push("/projects")
      }
    } catch (error) {
      console.error('Erreur lors du chargement du projet:', error)
      toast.error('Erreur lors du chargement du projet')
    } finally {
      setLoading(false)
    }
  }

  const fetchTasks = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks`)
      if (response.ok) {
        const data = await response.json()
        setTasks(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des tâches:', error)
    }
  }

  const fetchProviders = async () => {
    try {
      const response = await fetch('/api/providers')
      if (response.ok) {
        const data = await response.json()
        setProviders(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des prestataires:', error)
    }
  }

  const fetchExpenses = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/expenses`)
      if (response.ok) {
        const data = await response.json()
        setExpenses(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des dépenses:', error)
    }
  }

  // Gestion des proformas
  const handleGenerateProforma = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/proforma`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      if (response.ok) {
        toast.success('Proforma générée avec succès')
        // Proforma dialog removed - using ProformaManagement component
        fetchProject()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors de la génération de la proforma')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la génération de la proforma')
    }
  }

  const handleConvertToInvoice = async () => {
    if (!selectedProforma) return

    try {
      const requestData = {
        ...convertForm,
        amount: convertForm.conversionType === "PARTIAL" ? convertForm.partialAmount : selectedProforma.amount
      }

      const response = await fetch(`/api/invoices/${selectedProforma.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      if (response.ok) {
        const result = await response.json()
        if (convertForm.conversionType === "PARTIAL") {
          toast.success(`Acompte de ${formatCurrency(convertForm.partialAmount)} créé avec succès`)
        } else {
          toast.success(result.message)
        }
        setIsConvertDialogOpen(false)
        fetchProject()
        
        if (result.paymentLink) {
          // Optionnel: ouvrir le lien de paiement
          window.open(result.paymentLink, '_blank')
        }
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors de la conversion')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la conversion')
    }
  }

  // Gestion des prestataires
  const handleAssignProvider = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/providers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: providerForm.providerId,
          amount: parseFloat(providerForm.amount),
          notes: providerForm.notes
        })
      })

      if (response.ok) {
        toast.success('Prestataire assigné avec succès')
        setIsProviderDialogOpen(false)
        setProviderForm({ providerId: "", amount: "", notes: "" })
        fetchProject()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors de l\'assignation')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de l\'assignation du prestataire')
    }
  }

  const handleMarkProviderAsPaid = async (relationId: string) => {
    try {
      const response = await fetch(`/api/project-providers/${relationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPaid: true, paymentMethod: 'CASH', paidAt: new Date().toISOString() })
      })

      if (response.ok) {
        toast.success('Paiement marqué comme effectué - Budget mis à jour')
        fetchProject()
      } else {
        toast.error('Erreur lors de la mise à jour du paiement')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la mise à jour du paiement')
    }
  }

  // Gestion des acomptes généraux
  const handleCreateAdvancePayment = async () => {
    try {
      const response = await fetch('/api/invoices/advance-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          amount: parseFloat(advancePaymentForm.amount),
          description: advancePaymentForm.description,
          clientEmail: advancePaymentForm.clientEmail,
          generatePaymentLink: advancePaymentForm.generatePaymentLink
        })
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(result.message)
        setIsAdvancePaymentDialogOpen(false)
        setAdvancePaymentForm({
          amount: "",
          description: "",
          clientEmail: "",
          generatePaymentLink: false
        })
        fetchProject()

        if (result.paymentLink) {
          window.open(result.paymentLink, '_blank')
        }
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors de la création de l\'acompte')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la création de l\'acompte')
    }
  }

  // Gestion des dépenses
  const handleCreateExpense = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...expenseForm,
          amount: parseFloat(expenseForm.amount)
        })
      })

      if (response.ok) {
        toast.success('Dépense créée avec succès')
        setIsExpenseDialogOpen(false)
        setExpenseForm({
          description: "",
          amount: "",
          category: "OTHER",
          date: new Date().toISOString().split('T')[0],
          notes: ""
        })
        fetchExpenses()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors de la création de la dépense')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la création de la dépense')
    }
  }

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette dépense ?')) return

    try {
      const response = await fetch(`/api/expenses/${expenseId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Dépense supprimée avec succès')
        fetchExpenses()
      } else {
        toast.error('Erreur lors de la suppression de la dépense')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la suppression de la dépense')
    }
  }

  // Fonctions existantes (tâches, fichiers, etc.)
  const handleCreateTask = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...taskForm,
          dueDate: taskForm.dueDate || null,
          parentId: taskForm.parentId || null
        })
      })

      if (response.ok) {
        toast.success('Tâche créée avec succès')
        setIsTaskDialogOpen(false)
        resetTaskForm()
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
          ...taskForm,
          dueDate: taskForm.dueDate || null
        })
      })

      if (response.ok) {
        toast.success('Tâche mise à jour avec succès')
        setIsTaskDialogOpen(false)
        resetTaskForm()
        fetchTasks()
      } else {
        toast.error('Erreur lors de la mise à jour de la tâche')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la mise à jour de la tâche')
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

  const handleFileUpload = async () => {
    if (!fileUpload) return

    try {
      const formData = new FormData()
      formData.append('file', fileUpload)
      formData.append('type', 'document')
      formData.append('projectId', projectId)
      formData.append('description', fileDescription)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        toast.success('Fichier uploadé avec succès')
        setIsFileDialogOpen(false)
        setFileUpload(null)
        setFileDescription("")
        fetchProject()
      } else {
        toast.error('Erreur lors de l\'upload du fichier')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de l\'upload du fichier')
    }
  }

  const handleUpdateProject = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...projectForm,
          amount: parseFloat(projectForm.amount),
          startDate: projectForm.startDate || null,
          endDate: projectForm.endDate || null
        })
      })

      if (response.ok) {
        toast.success('Projet mis à jour avec succès')
        setIsEditDialogOpen(false)
        fetchProject()
      } else {
        toast.error('Erreur lors de la mise à jour du projet')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la mise à jour du projet')
    }
  }

  const resetTaskForm = () => {
    setTaskForm({
      title: "",
      description: "",
      status: "TODO",
      priority: "MEDIUM",
      dueDate: "",
      parentId: ""
    })
    setSelectedTask(null)
  }

  const openTaskDialog = (task?: Task, parentId?: string) => {
    if (task) {
      setSelectedTask(task)
      setTaskForm({
        title: task.title,
        description: task.description || "",
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "",
        parentId: task.parentId || ""
      })
    } else {
      resetTaskForm()
      if (parentId) {
        setTaskForm(prev => ({ ...prev, parentId }))
      }
    }
    setIsTaskDialogOpen(true)
  }

  const toggleTaskExpansion = (taskId: string) => {
    const newExpanded = new Set(expandedTasks)
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId)
    } else {
      newExpanded.add(taskId)
    }
    setExpandedTasks(newExpanded)
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      TODO: { label: "À faire", color: "bg-gray-100 text-gray-800", icon: Clock },
      IN_PROGRESS: { label: "En cours", color: "bg-blue-100 text-blue-800", icon: Clock },
      REVIEW: { label: "En révision", color: "bg-yellow-100 text-yellow-800", icon: Eye },
      DONE: { label: "Terminé", color: "bg-green-100 text-green-800", icon: CheckCircle },
      CANCELLED: { label: "Annulé", color: "bg-red-100 text-red-800", icon: AlertCircle }
    }
    return badges[status as keyof typeof badges] || badges.TODO
  }

  const getPriorityBadge = (priority: string) => {
    const badges = {
      LOW: { label: "Faible", color: "bg-green-100 text-green-800" },
      MEDIUM: { label: "Moyenne", color: "bg-yellow-100 text-yellow-800" },
      HIGH: { label: "Élevée", color: "bg-orange-100 text-orange-800" },
      URGENT: { label: "Urgente", color: "bg-red-100 text-red-800" }
    }
    return badges[priority as keyof typeof badges] || badges.MEDIUM
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(amount)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const renderTask = (task: Task, level = 0) => {
    const hasSubtasks = task.subtasks && task.subtasks.length > 0
    const isExpanded = expandedTasks.has(task.id)
    const statusBadge = getStatusBadge(task.status)
    const priorityBadge = getPriorityBadge(task.priority)

    return (
      <div key={task.id} className={`${level > 0 ? 'ml-6 border-l-2 border-gray-200 pl-4' : ''}`}>
        <Card className="mb-3">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                {hasSubtasks && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleTaskExpansion(task.id)}
                    className="p-1 h-6 w-6"
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{task.title}</h4>
                    <Badge className={statusBadge.color}>
                      {React.createElement(statusBadge.icon, { className: "w-3 h-3 mr-1" })}
                      {statusBadge.label}
                    </Badge>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityBadge.color}`}>
                      {priorityBadge.label}
                    </span>
                  </div>
                  {task.description && (
                    <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Créé le {new Date(task.createdAt).toLocaleDateString('fr-FR')}</span>
                    {task.dueDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Échéance: {new Date(task.dueDate).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openTaskDialog(undefined, task.id)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Sous-tâche
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openTaskDialog(task)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDeleteTask(task.id)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
        {hasSubtasks && isExpanded && (
          <div className="mb-4">
            {task.subtasks.map(subtask => renderTask(subtask, level + 1))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold">Projet non trouvé</h3>
        <p className="text-muted-foreground">Le projet demandé n'existe pas ou a été supprimé.</p>
        <Button onClick={() => router.push("/projects")} className="mt-4">
          Retour aux projets
        </Button>
      </div>
    )
  }

  const proformas = project.invoices.filter(inv => inv.type === 'PROFORMA')
  const invoices = project.invoices.filter(inv => inv.type === 'INVOICE')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push("/projects")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            <p className="text-muted-foreground">
              {project.client?.name && `Client: ${project.client.name} • `}
              Créé le {new Date(project.createdAt).toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>
                <div className="flex items-center gap-2">
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                Modifier
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Modifier le projet</DialogTitle>
                <DialogDescription>
                  Modifiez les informations du projet
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom du projet</Label>
                    <Input
                      id="name"
                      value={projectForm.name}
                      onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Montant</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={projectForm.amount}
                      onChange={(e) => setProjectForm({ ...projectForm, amount: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={projectForm.description}
                    onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select value={projectForm.type} onValueChange={(value) => setProjectForm({ ...projectForm, type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CLIENT">Client</SelectItem>
                        <SelectItem value="PERSONAL">Personnel</SelectItem>
                        <SelectItem value="DEVELOPMENT">Développement</SelectItem>
                        <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                        <SelectItem value="CONSULTING">Conseil</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Statut</Label>
                    <Select value={projectForm.status} onValueChange={(value) => setProjectForm({ ...projectForm, status: value })}>
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
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Date de début</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={projectForm.startDate}
                      onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">Date de fin</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={projectForm.endDate}
                      onChange={(e) => setProjectForm({ ...projectForm, endDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleUpdateProject}>
                  Mettre à jour
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Métriques rapides */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Budget</p>
                <p className="text-2xl font-bold">{formatCurrency(project.amount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tâches</p>
                <p className="text-2xl font-bold">{tasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Fichiers</p>
                <p className="text-2xl font-bold">{project.files.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Prestataires</p>
                <p className="text-2xl font-bold">{project.projectProviders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="tasks">Tâches</TabsTrigger>
          <TabsTrigger value="files">Fichiers</TabsTrigger>
          <TabsTrigger value="providers">Prestataires</TabsTrigger>
          <TabsTrigger value="expenses">Dépenses</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="invoices">Facturation</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Informations du projet</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p className="text-sm">{project.description || "Aucune description"}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Type</p>
                    <p className="text-sm">{project.type}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Statut</p>
                    <Badge>{project.status}</Badge>
                  </div>
                </div>
                {(project.startDate || project.endDate) && (
                  <div className="grid grid-cols-2 gap-4">
                    {project.startDate && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Date de début</p>
                        <p className="text-sm">{new Date(project.startDate).toLocaleDateString('fr-FR')}</p>
                      </div>
                    )}
                    {project.endDate && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Date de fin</p>
                        <p className="text-sm">{new Date(project.endDate).toLocaleDateString('fr-FR')}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Résumé financier</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Budget projet</span>
                    <span className="font-semibold">{formatCurrency(project.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Prestataires</span>
                    <span className="font-semibold">
                      {formatCurrency(project.projectProviders.reduce((sum, pp) => sum + pp.amount, 0))}
                    </span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Total</span>
                    <span>
                      {formatCurrency(
                        project.amount + project.projectProviders.reduce((sum, pp) => sum - pp.amount, 0)
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Tâches du projet</h3>
            <Button onClick={() => openTaskDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle tâche
            </Button>
          </div>

          <div className="space-y-4">
            {tasks.filter(task => !task.parentId).map(task => renderTask(task))}
            {tasks.filter(task => !task.parentId).length === 0 && (
              <div className="text-center py-12">
                <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold">Aucune tâche</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Commencez par créer votre première tâche.
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="files" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Fichiers du projet</h3>
            <Dialog open={isFileDialogOpen} onOpenChange={setIsFileDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="w-4 h-4 mr-2" />
                  Uploader un fichier
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Uploader un fichier</DialogTitle>
                  <DialogDescription>
                    Sélectionnez un fichier à associer à ce projet.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="file">Fichier</Label>
                    <Input
                      id="file"
                      type="file"
                      onChange={(e) => setFileUpload(e.target.files?.[0] || null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={fileDescription}
                      onChange={(e) => setFileDescription(e.target.value)}
                      placeholder="Description du fichier..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsFileDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleFileUpload} disabled={!fileUpload}>
                    Uploader
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {project.files.map((file) => (
              <Card key={file.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <FileText className="h-8 w-8 text-blue-500" />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => window.open(file.url, '_blank')}>
                          <Download className="mr-2 h-4 w-4" />
                          Télécharger
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <h4 className="font-medium text-sm mb-1">{file.originalName}</h4>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)} • {new Date(file.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </CardContent>
              </Card>
            ))}
            {project.files.length === 0 && (
              <div className="col-span-full text-center py-12">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold">Aucun fichier</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Commencez par uploader votre premier fichier.
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="providers" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Prestataires assignés</h3>
            <Dialog open={isProviderDialogOpen} onOpenChange={setIsProviderDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Assigner un prestataire
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assigner un prestataire</DialogTitle>
                  <DialogDescription>
                    Assignez un prestataire à ce projet avec un montant.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="provider">Prestataire</Label>
                    <Select value={providerForm.providerId} onValueChange={(value) => setProviderForm({ ...providerForm, providerId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un prestataire" />
                      </SelectTrigger>
                      <SelectContent>
                        {providers.map((provider) => (
                          <SelectItem key={provider.id} value={provider.id}>
                            {provider.name} {provider.role && `(${provider.role})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Montant</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={providerForm.amount}
                      onChange={(e) => setProviderForm({ ...providerForm, amount: e.target.value })}
                      placeholder="Montant à payer"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={providerForm.notes}
                      onChange={(e) => setProviderForm({ ...providerForm, notes: e.target.value })}
                      placeholder="Notes sur cette assignation..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsProviderDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleAssignProvider} disabled={!providerForm.providerId || !providerForm.amount}>
                    Assigner
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {project.projectProviders.map((pp) => (
              <Card key={pp.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {pp.provider.photo ? (
                        <img src={pp.provider.photo} alt={pp.provider.name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        pp.provider.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{pp.provider.name}</h4>
                      {pp.provider.role && (
                        <p className="text-sm text-muted-foreground">{pp.provider.role}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Montant</span>
                      <span className="font-semibold">{formatCurrency(pp.amount)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Statut</span>
                      <Badge variant={pp.isPaid ? "default" : "secondary"}>
                        {pp.isPaid ? "Payé" : "En attente"}
                      </Badge>
                    </div>
                  </div>

                  {!pp.isPaid && (
                    <Button
                      size="sm"
                      className="w-full mt-3"
                      onClick={() => handleMarkProviderAsPaid(pp.id)}
                    >
                      <Banknote className="w-4 h-4 mr-2" />
                      Marquer comme payé
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
            {project.projectProviders.length === 0 && (
              <div className="col-span-full text-center py-12">
                <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold">Aucun prestataire</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Commencez par assigner votre premier prestataire.
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Dépenses du projet</h3>
            <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvelle dépense
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nouvelle dépense</DialogTitle>
                  <DialogDescription>
                    Enregistrez une dépense pour ce projet (hébergement, abonnements, etc.).
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="expense-description">Description</Label>
                    <Input
                      id="expense-description"
                      value={expenseForm.description}
                      onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                      placeholder="Ex: Hébergement mensuel, abonnement Expo..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expense-amount">Montant (XOF)</Label>
                      <Input
                        id="expense-amount"
                        type="number"
                        value={expenseForm.amount}
                        onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expense-date">Date</Label>
                      <Input
                        id="expense-date"
                        type="date"
                        value={expenseForm.date}
                        onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expense-category">Catégorie</Label>
                    <Select value={expenseForm.category} onValueChange={(value) => setExpenseForm({ ...expenseForm, category: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HOSTING">Hébergement</SelectItem>
                        <SelectItem value="SOFTWARE">Logiciels</SelectItem>
                        <SelectItem value="SUBSCRIPTION">Abonnements</SelectItem>
                        <SelectItem value="DOMAIN">Nom de domaine</SelectItem>
                        <SelectItem value="EQUIPMENT">Équipement</SelectItem>
                        <SelectItem value="OTHER">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expense-notes">Notes</Label>
                    <Textarea
                      id="expense-notes"
                      value={expenseForm.notes}
                      onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                      placeholder="Notes sur cette dépense..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsExpenseDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleCreateExpense} disabled={!expenseForm.description || !expenseForm.amount}>
                    Créer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-1">
            {expenses.map((expense) => (
              <Card key={expense.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center text-white">
                        <Receipt className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-medium">{expense.description}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {expense.category}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(expense.date).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                        {expense.notes && (
                          <p className="text-sm text-muted-foreground mt-1">{expense.notes}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="font-semibold text-red-600">
                          {formatCurrency(expense.amount)}
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {expenses.length === 0 && (
              <div className="text-center py-12">
                <Receipt className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold">Aucune dépense</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Commencez par enregistrer votre première dépense pour ce projet.
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="services" className="space-y-6">
          <ProjectServices projectId={projectId} onServicesUpdated={fetchProject} />
        </TabsContent>

        <TabsContent value="budget" className="space-y-6">
          <ProjectBudget projectId={projectId} />
        </TabsContent>

        <TabsContent value="invoices" className="space-y-6">
          {/* Bouton pour créer un acompte général */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Acompte général
                </span>
                <Dialog open={isAdvancePaymentDialogOpen} onOpenChange={setIsAdvancePaymentDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Créer un acompte
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Créer un acompte général</DialogTitle>
                      <DialogDescription>
                        Créez une facture d'acompte générale pour ce projet (non liée à un service spécifique).
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="advance-amount">Montant de l'acompte (XOF)</Label>
                        <Input
                          id="advance-amount"
                          type="number"
                          value={advancePaymentForm.amount}
                          onChange={(e) => setAdvancePaymentForm({ ...advancePaymentForm, amount: e.target.value })}
                          placeholder="Ex: 50000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="advance-description">Description</Label>
                        <Textarea
                          id="advance-description"
                          value={advancePaymentForm.description}
                          onChange={(e) => setAdvancePaymentForm({ ...advancePaymentForm, description: e.target.value })}
                          placeholder="Ex: Acompte de 50% pour démarrer le projet"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="advance-email">Email du client (optionnel)</Label>
                        <Input
                          id="advance-email"
                          type="email"
                          value={advancePaymentForm.clientEmail}
                          onChange={(e) => setAdvancePaymentForm({ ...advancePaymentForm, clientEmail: e.target.value })}
                          placeholder="client@exemple.com"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="advance-payment-link"
                          checked={advancePaymentForm.generatePaymentLink}
                          onChange={(e) => setAdvancePaymentForm({ ...advancePaymentForm, generatePaymentLink: e.target.checked })}
                        />
                        <Label htmlFor="advance-payment-link">Générer un lien de paiement Wave</Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAdvancePaymentDialogOpen(false)}>
                        Annuler
                      </Button>
                      <Button onClick={handleCreateAdvancePayment} disabled={!advancePaymentForm.amount}>
                        Créer l'acompte
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardTitle>
              <CardDescription>
                Créez des acomptes généraux pour ce projet (non liés à des services spécifiques)
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Gestion professionnelle des proformas */}
          <ProformaManagement 
            projectId={projectId} 
            onProformaUpdated={fetchProject}
          />
          
          <div className="grid gap-6 md:grid-cols-2">

            {/* Factures */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Factures
                </CardTitle>
              </CardHeader>
              <CardContent>
                {invoices.length > 0 ? (
                  <div className="space-y-3">
                    {invoices.map((invoice) => (
                      <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{invoice.invoiceNumber}</p>
                          <Badge variant={invoice.status === 'PAID' ? 'default' : 'secondary'}>
                            {invoice.status}
                          </Badge>
                        </div>
                        <p className="font-semibold">{formatCurrency(invoice.amount)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Aucune facture générée</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog de conversion proforma en facture */}
      <Dialog open={isConvertDialogOpen} onOpenChange={setIsConvertDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Convertir en facture</DialogTitle>
            <DialogDescription>
              Convertissez cette proforma en facture et configurez le paiement.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="conversionType">Type de conversion</Label>
              <Select 
                value={convertForm.conversionType} 
                onValueChange={(value: "FULL" | "PARTIAL") => 
                  setConvertForm({ ...convertForm, conversionType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FULL">Conversion complète</SelectItem>
                  <SelectItem value="PARTIAL">Acompte (paiement partiel)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {convertForm.conversionType === "PARTIAL" && (
              <div className="space-y-2">
                <Label htmlFor="partialAmount">Montant de l'acompte (XOF)</Label>
                <Input
                  id="partialAmount"
                  type="number"
                  value={convertForm.partialAmount}
                  onChange={(e) => setConvertForm({ ...convertForm, partialAmount: parseFloat(e.target.value) || 0 })}
                  placeholder="Montant de l'acompte"
                />
                {selectedProforma && (
                  <p className="text-sm text-muted-foreground">
                    Montant total: {formatCurrency(selectedProforma.amount)}
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="generatePaymentLink"
                checked={convertForm.generatePaymentLink}
                onChange={(e) => setConvertForm({ ...convertForm, generatePaymentLink: e.target.checked })}
                aria-label="Générer un lien de paiement"
              />
              <Label htmlFor="generatePaymentLink">Générer un lien de paiement</Label>
            </div>
            
            {convertForm.generatePaymentLink && (
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Méthode de paiement</Label>
                <Select 
                  value={convertForm.paymentMethod} 
                  onValueChange={(value: "WAVE" | "CASH" | "BANK_TRANSFER") => 
                    setConvertForm({ ...convertForm, paymentMethod: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WAVE">Wave CI</SelectItem>
                    <SelectItem value="CASH">Espèces</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Virement bancaire</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="markAsPaid"
                checked={convertForm.markAsPaid}
                onChange={(e) => setConvertForm({ ...convertForm, markAsPaid: e.target.checked })}
                aria-label="Marquer comme payée"
              />
              <Label htmlFor="markAsPaid">Marquer comme payée (paiement cash)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConvertDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleConvertToInvoice}>
              {convertForm.conversionType === "PARTIAL" ? "Créer l'acompte" : "Convertir en facture"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de création/modification de tâche */}
      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedTask ? 'Modifier la tâche' : 'Nouvelle tâche'}</DialogTitle>
            <DialogDescription>
              {selectedTask ? 'Modifiez les informations de la tâche' : 'Créez une nouvelle tâche pour ce projet'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre</Label>
              <Input
                id="title"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Statut</Label>
                <Select value={taskForm.status} onValueChange={(value) => setTaskForm({ ...taskForm, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODO">À faire</SelectItem>
                    <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                    <SelectItem value="REVIEW">En révision</SelectItem>
                    <SelectItem value="DONE">Terminé</SelectItem>
                    <SelectItem value="CANCELLED">Annulé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priorité</Label>
                <Select value={taskForm.priority} onValueChange={(value) => setTaskForm({ ...taskForm, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Faible</SelectItem>
                    <SelectItem value="MEDIUM">Moyenne</SelectItem>
                    <SelectItem value="HIGH">Élevée</SelectItem>
                    <SelectItem value="URGENT">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Date d'échéance</Label>
              <Input
                id="dueDate"
                type="date"
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTaskDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={selectedTask ? handleUpdateTask : handleCreateTask}>
              {selectedTask ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 