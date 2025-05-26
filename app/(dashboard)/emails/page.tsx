"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Mail,
  Send,
  Search,
  Filter,
  Eye,
  MoreHorizontal,
  Plus,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
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

interface Email {
  id: string
  to: string
  subject: string
  type: string
  status: string
  sentAt?: string
  createdAt: string
  invoice?: {
    id: string
    invoiceNumber: string
  }
  project?: {
    id: string
    name: string
  }
  client?: {
    id: string
    name: string
  }
}

interface EmailTemplate {
  id: string
  name: string
  subject: string
  content: string
  type: string
}

export default function EmailsPage() {
  const [emails, setEmails] = useState<Email[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [isComposeDialogOpen, setIsComposeDialogOpen] = useState(false)
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    to: "",
    subject: "",
    content: "",
    type: "custom"
  })
  const [templateData, setTemplateData] = useState({
    name: "",
    subject: "",
    content: "",
    type: "custom"
  })

  useEffect(() => {
    fetchEmails()
    fetchTemplates()
  }, [])

  const fetchEmails = async () => {
    try {
      const response = await fetch('/api/emails')
      if (response.ok) {
        const data = await response.json()
        setEmails(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des emails:', error)
      toast.error('Erreur lors du chargement des emails')
    } finally {
      setLoading(false)
    }
  }

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/emails/templates')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des templates:', error)
    }
  }

  const handleSendEmail = async () => {
    try {
      const response = await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast.success('Email envoyé avec succès')
        setIsComposeDialogOpen(false)
        resetForm()
        fetchEmails()
      } else {
        toast.error('Erreur lors de l\'envoi de l\'email')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de l\'envoi de l\'email')
    }
  }

  const handleCreateTemplate = async () => {
    try {
      const response = await fetch('/api/emails/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      })

      if (response.ok) {
        toast.success('Template créé avec succès')
        setIsTemplateDialogOpen(false)
        resetTemplateForm()
        fetchTemplates()
      } else {
        toast.error('Erreur lors de la création du template')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la création du template')
    }
  }

  const resetForm = () => {
    setFormData({
      to: "",
      subject: "",
      content: "",
      type: "custom"
    })
  }

  const resetTemplateForm = () => {
    setTemplateData({
      name: "",
      subject: "",
      content: "",
      type: "custom"
    })
  }

  const useTemplate = (template: EmailTemplate) => {
    setFormData({
      to: "",
      subject: template.subject,
      content: template.content,
      type: template.type
    })
    setIsComposeDialogOpen(true)
  }

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'SENT': { label: 'Envoyé', variant: 'default' as const, icon: CheckCircle },
      'PENDING': { label: 'En attente', variant: 'secondary' as const, icon: Clock },
      'FAILED': { label: 'Échec', variant: 'destructive' as const, icon: XCircle },
      'DRAFT': { label: 'Brouillon', variant: 'outline' as const, icon: FileText },
    }
    
    return statusMap[status as keyof typeof statusMap] || { label: status, variant: 'outline' as const, icon: AlertCircle }
  }

  const getTypeBadge = (type: string) => {
    const typeMap = {
      'invoice': { label: 'Facture', color: 'bg-blue-100 text-blue-800' },
      'project': { label: 'Projet', color: 'bg-green-100 text-green-800' },
      'reminder': { label: 'Rappel', color: 'bg-orange-100 text-orange-800' },
      'welcome': { label: 'Bienvenue', color: 'bg-purple-100 text-purple-800' },
      'custom': { label: 'Personnalisé', color: 'bg-gray-100 text-gray-800' },
    }
    
    return typeMap[type as keyof typeof typeMap] || { label: type, color: 'bg-gray-100 text-gray-800' }
  }

  const filteredEmails = emails.filter(email => {
    const matchesSearch = email.to.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         email.subject.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || email.status === statusFilter
    const matchesType = typeFilter === "all" || email.type === typeFilter
    
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
          <h1 className="text-3xl font-bold tracking-tight">Emails</h1>
          <p className="text-muted-foreground">
            Gérez vos emails et templates
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => resetTemplateForm()}>
                <FileText className="mr-2 h-4 w-4" />
                Nouveau template
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Nouveau template</DialogTitle>
                <DialogDescription>
                  Créez un template d'email réutilisable.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="template-name">Nom du template *</Label>
                  <Input
                    id="template-name"
                    value={templateData.name}
                    onChange={(e) => setTemplateData({...templateData, name: e.target.value})}
                    placeholder="Nom du template"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="template-type">Type</Label>
                  <Select value={templateData.type} onValueChange={(value) => setTemplateData({...templateData, type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Personnalisé</SelectItem>
                      <SelectItem value="invoice">Facture</SelectItem>
                      <SelectItem value="project">Projet</SelectItem>
                      <SelectItem value="reminder">Rappel</SelectItem>
                      <SelectItem value="welcome">Bienvenue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="template-subject">Sujet *</Label>
                  <Input
                    id="template-subject"
                    value={templateData.subject}
                    onChange={(e) => setTemplateData({...templateData, subject: e.target.value})}
                    placeholder="Sujet de l'email"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="template-content">Contenu *</Label>
                  <Textarea
                    id="template-content"
                    value={templateData.content}
                    onChange={(e) => setTemplateData({...templateData, content: e.target.value})}
                    placeholder="Contenu de l'email"
                    rows={8}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleCreateTemplate} disabled={!templateData.name || !templateData.subject || !templateData.content}>
                  Créer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isComposeDialogOpen} onOpenChange={setIsComposeDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="mr-2 h-4 w-4" />
                Composer
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Composer un email</DialogTitle>
                <DialogDescription>
                  Envoyez un email personnalisé.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="to">Destinataire *</Label>
                  <Input
                    id="to"
                    type="email"
                    value={formData.to}
                    onChange={(e) => setFormData({...formData, to: e.target.value})}
                    placeholder="email@exemple.com"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="subject">Sujet *</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    placeholder="Sujet de l'email"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="content">Message *</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    placeholder="Votre message"
                    rows={8}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsComposeDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleSendEmail} disabled={!formData.to || !formData.subject || !formData.content}>
                  <Send className="mr-2 h-4 w-4" />
                  Envoyer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Templates */}
      {templates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Templates disponibles
            </CardTitle>
            <CardDescription>
              Cliquez sur un template pour l'utiliser
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }}
                  className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => useTemplate(template)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{template.name}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeBadge(template.type).color}`}>
                      {getTypeBadge(template.type).label}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{template.subject}</p>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un email..."
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
            <SelectItem value="SENT">Envoyé</SelectItem>
            <SelectItem value="PENDING">En attente</SelectItem>
            <SelectItem value="FAILED">Échec</SelectItem>
            <SelectItem value="DRAFT">Brouillon</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <Mail className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="invoice">Facture</SelectItem>
            <SelectItem value="project">Projet</SelectItem>
            <SelectItem value="reminder">Rappel</SelectItem>
            <SelectItem value="welcome">Bienvenue</SelectItem>
            <SelectItem value="custom">Personnalisé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Emails List */}
      <div className="space-y-4">
        {filteredEmails.map((email, index) => {
          const statusBadge = getStatusBadge(email.status)
          const typeBadge = getTypeBadge(email.type)
          
          return (
            <motion.div
              key={email.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white">
                        <Mail className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">{email.subject}</h3>
                          <Badge 
                            variant={statusBadge.variant}
                            className="text-xs"
                          >
                            <statusBadge.icon className="mr-1 h-3 w-3" />
                            {statusBadge.label}
                          </Badge>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeBadge.color}`}>
                            {typeBadge.label}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                          <span>À: {email.to}</span>
                          {email.sentAt && (
                            <span>Envoyé le {new Date(email.sentAt).toLocaleDateString('fr-FR')}</span>
                          )}
                          {email.invoice && (
                            <span>Facture: {email.invoice.invoiceNumber}</span>
                          )}
                          {email.project && (
                            <span>Projet: {email.project.name}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setSelectedEmail(email)
                          setIsViewDialogOpen(true)
                        }}>
                          <Eye className="mr-2 h-4 w-4" />
                          Voir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {filteredEmails.length === 0 && (
        <div className="text-center py-12">
          <Mail className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">Aucun email</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {searchTerm || statusFilter !== "all" || typeFilter !== "all"
              ? 'Aucun email ne correspond à vos filtres.' 
              : 'Commencez par composer votre premier email.'}
          </p>
        </div>
      )}

      {/* View Email Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Détails de l'email</DialogTitle>
          </DialogHeader>
          {selectedEmail && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label>Destinataire</Label>
                <div className="p-2 bg-gray-50 rounded">{selectedEmail.to}</div>
              </div>
              
              <div className="grid gap-2">
                <Label>Sujet</Label>
                <div className="p-2 bg-gray-50 rounded">{selectedEmail.subject}</div>
              </div>
              
              <div className="grid gap-2">
                <Label>Statut</Label>
                <div className="flex items-center space-x-2">
                  <Badge variant={getStatusBadge(selectedEmail.status).variant}>
                    {getStatusBadge(selectedEmail.status).label}
                  </Badge>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeBadge(selectedEmail.type).color}`}>
                    {getTypeBadge(selectedEmail.type).label}
                  </span>
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label>Date de création</Label>
                <div className="p-2 bg-gray-50 rounded">
                  {new Date(selectedEmail.createdAt).toLocaleString('fr-FR')}
                </div>
              </div>
              
              {selectedEmail.sentAt && (
                <div className="grid gap-2">
                  <Label>Date d'envoi</Label>
                  <div className="p-2 bg-gray-50 rounded">
                    {new Date(selectedEmail.sentAt).toLocaleString('fr-FR')}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 