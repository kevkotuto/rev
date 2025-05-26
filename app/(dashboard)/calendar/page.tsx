"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { 
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  FolderOpen,
  CheckSquare,
  AlertTriangle,
  Plus,
  Bell,
  Edit,
  Trash2,
  Move,
  MoreHorizontal,
  CalendarPlus,
  Users,
  Target,
  FileText
} from "lucide-react"
import { motion } from "motion/react"
import { toast } from "sonner"

interface CalendarEvent {
  id: string
  title: string
  type: 'task' | 'project' | 'invoice' | 'reminder'
  date: string
  status: string
  priority?: string
  description?: string
  reminder?: boolean
  reminderTime?: string
  project?: {
    id: string
    name: string
  }
}

interface CreateEventData {
  title: string
  type: 'task' | 'project' | 'invoice' | 'reminder'
  date: string
  description?: string
  priority?: string
  projectId?: string
  reminder?: boolean
  reminderTime?: string
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [view, setView] = useState<'month' | 'week'>('month')
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [createEventData, setCreateEventData] = useState<CreateEventData>({
    title: '',
    type: 'task',
    date: '',
    description: '',
    priority: 'MEDIUM',
    reminder: false
  })

  useEffect(() => {
    fetchEvents()
    fetchProjects()
  }, [currentDate])

  const fetchEvents = async () => {
    try {
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
      
      const response = await fetch(`/api/calendar?start=${startDate.toISOString()}&end=${endDate.toISOString()}`)
      if (response.ok) {
        const data = await response.json()
        setEvents(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement du calendrier:', error)
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

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []
    
    // Jours du mois précédent
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i)
      days.push({ date: prevDate, isCurrentMonth: false })
    }
    
    // Jours du mois actuel
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      days.push({ date, isCurrentMonth: true })
    }
    
    // Jours du mois suivant pour compléter la grille
    const remainingDays = 42 - days.length
    for (let day = 1; day <= remainingDays; day++) {
      const nextDate = new Date(year, month + 1, day)
      days.push({ date: nextDate, isCurrentMonth: false })
    }
    
    return days
  }

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return events.filter(event => event.date.split('T')[0] === dateStr)
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'task': return CheckSquare
      case 'project': return FolderOpen
      case 'invoice': return Clock
      case 'reminder': return Bell
      default: return CalendarIcon
    }
  }

  // Fonctions de drag and drop
  const handleDragStart = (event: CalendarEvent, e: React.DragEvent) => {
    setDraggedEvent(event)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (targetDate: Date, e: React.DragEvent) => {
    e.preventDefault()
    if (!draggedEvent) return

    const newDate = targetDate.toISOString().split('T')[0]
    
    try {
      const response = await fetch(`/api/calendar/${draggedEvent.id}/move`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newDate })
      })

      if (response.ok) {
        // Mettre à jour l'événement localement
        setEvents(prev => prev.map(event => 
          event.id === draggedEvent.id 
            ? { ...event, date: newDate }
            : event
        ))
        toast.success('Événement déplacé avec succès')
      } else {
        toast.error('Erreur lors du déplacement')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors du déplacement')
    }

    setDraggedEvent(null)
  }

  // Fonctions CRUD
  const handleCreateEvent = async () => {
    if (!createEventData.title.trim()) {
      toast.error('Le titre est requis')
      return
    }

    try {
      const response = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createEventData)
      })

      if (response.ok) {
        const newEvent = await response.json()
        setEvents(prev => [...prev, newEvent])
        setShowCreateDialog(false)
        setCreateEventData({
          title: '',
          type: 'task',
          date: '',
          description: '',
          priority: 'MEDIUM',
          reminder: false
        })
        toast.success('Événement créé avec succès')
      } else {
        toast.error('Erreur lors de la création')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la création')
    }
  }

  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event)
    setCreateEventData({
      title: event.title,
      type: event.type,
      date: event.date.split('T')[0],
      description: event.description || '',
      priority: event.priority || 'MEDIUM',
      projectId: event.project?.id,
      reminder: event.reminder || false,
      reminderTime: event.reminderTime
    })
    setShowEditDialog(true)
  }

  const handleUpdateEvent = async () => {
    if (!editingEvent) return

    try {
      const response = await fetch(`/api/calendar/${editingEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createEventData)
      })

      if (response.ok) {
        const updatedEvent = await response.json()
        setEvents(prev => prev.map(event => 
          event.id === editingEvent.id ? updatedEvent : event
        ))
        setShowEditDialog(false)
        setEditingEvent(null)
        toast.success('Événement mis à jour avec succès')
      } else {
        toast.error('Erreur lors de la mise à jour')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) return

    try {
      const response = await fetch(`/api/calendar/${eventId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setEvents(prev => prev.filter(event => event.id !== eventId))
        toast.success('Événement supprimé avec succès')
      } else {
        toast.error('Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la suppression')
    }
  }

  const openCreateDialog = (date?: Date) => {
    if (date) {
      setCreateEventData(prev => ({
        ...prev,
        date: date.toISOString().split('T')[0]
      }))
    }
    setShowCreateDialog(true)
  }

  const getEventColor = (type: string, status: string, priority?: string) => {
    if (type === 'task') {
      if (priority === 'URGENT') return 'bg-red-500'
      if (priority === 'HIGH') return 'bg-orange-500'
      if (status === 'DONE') return 'bg-green-500'
      return 'bg-blue-500'
    }
    if (type === 'project') {
      if (status === 'COMPLETED') return 'bg-green-500'
      if (status === 'ON_HOLD') return 'bg-yellow-500'
      return 'bg-purple-500'
    }
    if (type === 'invoice') {
      if (status === 'PAID') return 'bg-green-500'
      if (status === 'OVERDUE') return 'bg-red-500'
      return 'bg-orange-500'
    }
    return 'bg-gray-500'
  }

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ]

  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isSelected = (date: Date) => {
    return selectedDate && date.toDateString() === selectedDate.toDateString()
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendrier</h1>
          <p className="text-muted-foreground">
            Vue d'ensemble de vos tâches, projets et échéances
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Créer
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                setCreateEventData(prev => ({ ...prev, type: 'task' }))
                openCreateDialog()
              }}>
                <CheckSquare className="mr-2 h-4 w-4" />
                Nouvelle tâche
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setCreateEventData(prev => ({ ...prev, type: 'project' }))
                openCreateDialog()
              }}>
                <FolderOpen className="mr-2 h-4 w-4" />
                Nouveau projet
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setCreateEventData(prev => ({ ...prev, type: 'reminder' }))
                openCreateDialog()
              }}>
                <Bell className="mr-2 h-4 w-4" />
                Nouveau rappel
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                setCreateEventData(prev => ({ ...prev, type: 'invoice' }))
                openCreateDialog()
              }}>
                <FileText className="mr-2 h-4 w-4" />
                Nouvelle facture
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button
            variant={view === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('month')}
          >
            Mois
          </Button>
          <Button
            variant={view === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('week')}
          >
            Semaine
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Calendrier principal */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <CalendarIcon className="mr-2 h-5 w-5" />
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateMonth('prev')}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentDate(new Date())}
                  >
                    Aujourd'hui
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateMonth('next')}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* En-têtes des jours */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map(day => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Grille du calendrier */}
              <div className="grid grid-cols-7 gap-1">
                {getDaysInMonth(currentDate).map((day, index) => {
                  const dayEvents = getEventsForDate(day.date)
                  
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.01 }}
                      className={`
                        min-h-[100px] p-2 border rounded-lg cursor-pointer transition-colors relative
                        ${day.isCurrentMonth ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 text-muted-foreground'}
                        ${isToday(day.date) ? 'ring-2 ring-blue-500' : ''}
                        ${isSelected(day.date) ? 'bg-blue-50 border-blue-300' : 'border-gray-200'}
                        ${draggedEvent ? 'hover:bg-blue-100 hover:border-blue-400' : ''}
                      `}
                      onClick={() => setSelectedDate(day.date)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(day.date, e)}
                      onDoubleClick={() => openCreateDialog(day.date)}
                    >
                      <div className={`text-sm font-medium mb-1 ${isToday(day.date) ? 'text-blue-600' : ''}`}>
                        {day.date.getDate()}
                      </div>
                      
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map(event => {
                          const EventIcon = getEventIcon(event.type)
                          const eventColor = getEventColor(event.type, event.status, event.priority)
                          
                          return (
                            <div
                              key={event.id}
                              draggable
                              onDragStart={(e) => handleDragStart(event, e)}
                              className={`text-xs p-1 rounded text-white truncate cursor-move group relative ${eventColor} hover:opacity-80`}
                              title={event.title}
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedDate(day.date)
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center min-w-0">
                                  <EventIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                                  <span className="truncate">{event.title}</span>
                                  {event.reminder && (
                                    <Bell className="h-2 w-2 ml-1 flex-shrink-0" />
                                  )}
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 text-white hover:bg-white/20"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <MoreHorizontal className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleEditEvent(event)}>
                                      <Edit className="mr-2 h-3 w-3" />
                                      Modifier
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handleDeleteEvent(event.id)}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="mr-2 h-3 w-3" />
                                      Supprimer
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          )
                        })}
                        {dayEvents.length > 3 && (
                          <div className="text-xs text-muted-foreground cursor-pointer hover:text-blue-600"
                               onClick={() => setSelectedDate(day.date)}>
                            +{dayEvents.length - 3} autre{dayEvents.length - 3 > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                      
                      {/* Zone de drop pour créer un nouvel événement */}
                      {day.isCurrentMonth && dayEvents.length === 0 && (
                        <div 
                          className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation()
                            openCreateDialog(day.date)
                          }}
                        >
                          <Plus className="h-4 w-4 text-gray-400" />
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panneau latéral */}
        <div className="space-y-6">
          {/* Événements du jour sélectionné */}
          {selectedDate && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {selectedDate.toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getEventsForDate(selectedDate).map(event => {
                    const EventIcon = getEventIcon(event.type)
                    
                    return (
                      <div key={event.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 group">
                        <div className={`p-1 rounded ${getEventColor(event.type, event.status, event.priority)}`}>
                          <EventIcon className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-sm">{event.title}</div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditEvent(event)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Modifier
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteEvent(event.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          
                          {event.description && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {event.description}
                            </div>
                          )}
                          
                          {event.project && (
                            <div className="text-xs text-muted-foreground">
                              📁 {event.project.name}
                            </div>
                          )}
                          
                          <div className="flex items-center space-x-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {event.type === 'task' ? 'Tâche' : 
                               event.type === 'project' ? 'Projet' : 
                               event.type === 'reminder' ? 'Rappel' : 'Facture'}
                            </Badge>
                            
                            {event.priority && event.priority === 'URGENT' && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Urgent
                              </Badge>
                            )}
                            
                            {event.priority && event.priority === 'HIGH' && (
                              <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                                Priorité élevée
                              </Badge>
                            )}
                            
                            {event.reminder && (
                              <Badge variant="outline" className="text-xs">
                                <Bell className="h-3 w-3 mr-1" />
                                {event.reminderTime || 'Rappel'}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  
                  {getEventsForDate(selectedDate).length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      <CalendarIcon className="mx-auto h-8 w-8 mb-2" />
                      <p className="text-sm mb-3">Aucun événement ce jour</p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openCreateDialog(selectedDate)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Ajouter un événement
                      </Button>
                    </div>
                  )}
                  
                  {getEventsForDate(selectedDate).length > 0 && (
                    <div className="mt-4 pt-3 border-t">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => openCreateDialog(selectedDate)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Ajouter un événement
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Légende */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Légende</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span className="text-sm">Tâches normales</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-orange-500 rounded"></div>
                  <span className="text-sm">Tâches prioritaires</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span className="text-sm">Tâches urgentes</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-purple-500 rounded"></div>
                  <span className="text-sm">Projets en cours</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span className="text-sm">Terminé/Payé</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                  <span className="text-sm">En pause</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistiques rapides */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ce mois</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Tâches à faire</span>
                  <Badge variant="secondary">
                    {events.filter(e => e.type === 'task' && e.status !== 'DONE').length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Projets actifs</span>
                  <Badge variant="secondary">
                    {events.filter(e => e.type === 'project' && e.status === 'IN_PROGRESS').length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Factures en attente</span>
                  <Badge variant="secondary">
                    {events.filter(e => e.type === 'invoice' && e.status === 'PENDING').length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Échéances urgentes</span>
                  <Badge variant="destructive">
                    {events.filter(e => e.priority === 'URGENT' || e.status === 'OVERDUE').length}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog de création d'événement */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Créer un nouvel événement</DialogTitle>
            <DialogDescription>
              Ajoutez un nouvel événement à votre calendrier
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Titre *</Label>
              <Input
                id="title"
                value={createEventData.title}
                onChange={(e) => setCreateEventData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Titre de l'événement"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="type">Type</Label>
                <Select 
                  value={createEventData.type} 
                  onValueChange={(value: any) => setCreateEventData(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="task">Tâche</SelectItem>
                    <SelectItem value="project">Projet</SelectItem>
                    <SelectItem value="reminder">Rappel</SelectItem>
                    <SelectItem value="invoice">Facture</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={createEventData.date}
                  onChange={(e) => setCreateEventData(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
            </div>

            {createEventData.type === 'task' && (
              <div className="grid gap-2">
                <Label htmlFor="priority">Priorité</Label>
                <Select 
                  value={createEventData.priority} 
                  onValueChange={(value) => setCreateEventData(prev => ({ ...prev, priority: value }))}
                >
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
            )}

            {projects.length > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="project">Projet (optionnel)</Label>
                <Select 
                  value={createEventData.projectId || ""} 
                  onValueChange={(value) => setCreateEventData(prev => ({ ...prev, projectId: value || undefined }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un projet" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Aucun projet</SelectItem>
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
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={createEventData.description}
                onChange={(e) => setCreateEventData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description de l'événement"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="reminder"
                checked={createEventData.reminder}
                onChange={(e) => setCreateEventData(prev => ({ ...prev, reminder: e.target.checked }))}
                className="rounded"
                aria-label="Activer les rappels"
              />
              <Label htmlFor="reminder">Activer les rappels</Label>
            </div>

            {createEventData.reminder && (
              <div className="grid gap-2">
                <Label htmlFor="reminderTime">Heure du rappel</Label>
                <Input
                  id="reminderTime"
                  type="time"
                  value={createEventData.reminderTime || ""}
                  onChange={(e) => setCreateEventData(prev => ({ ...prev, reminderTime: e.target.value }))}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateEvent}>
              Créer l'événement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog d'édition d'événement */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Modifier l'événement</DialogTitle>
            <DialogDescription>
              Modifiez les détails de votre événement
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">Titre *</Label>
              <Input
                id="edit-title"
                value={createEventData.title}
                onChange={(e) => setCreateEventData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Titre de l'événement"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-type">Type</Label>
                <Select 
                  value={createEventData.type} 
                  onValueChange={(value: any) => setCreateEventData(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="task">Tâche</SelectItem>
                    <SelectItem value="project">Projet</SelectItem>
                    <SelectItem value="reminder">Rappel</SelectItem>
                    <SelectItem value="invoice">Facture</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-date">Date</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={createEventData.date}
                  onChange={(e) => setCreateEventData(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
            </div>

            {createEventData.type === 'task' && (
              <div className="grid gap-2">
                <Label htmlFor="edit-priority">Priorité</Label>
                <Select 
                  value={createEventData.priority} 
                  onValueChange={(value) => setCreateEventData(prev => ({ ...prev, priority: value }))}
                >
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
            )}

            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={createEventData.description}
                onChange={(e) => setCreateEventData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description de l'événement"
                rows={3}
              />
            </div>

                         <div className="flex items-center space-x-2">
               <input
                 type="checkbox"
                 id="edit-reminder"
                 checked={createEventData.reminder}
                 onChange={(e) => setCreateEventData(prev => ({ ...prev, reminder: e.target.checked }))}
                 className="rounded"
                 aria-label="Activer les rappels"
               />
               <Label htmlFor="edit-reminder">Activer les rappels</Label>
             </div>

            {createEventData.reminder && (
              <div className="grid gap-2">
                <Label htmlFor="edit-reminderTime">Heure du rappel</Label>
                <Input
                  id="edit-reminderTime"
                  type="time"
                  value={createEventData.reminderTime || ""}
                  onChange={(e) => setCreateEventData(prev => ({ ...prev, reminderTime: e.target.value }))}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleUpdateEvent}>
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 