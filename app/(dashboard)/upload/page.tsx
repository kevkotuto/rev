"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileUpload } from "@/components/ui/file-upload"
import { 
  Upload, 
  CheckCircle, 
  File,
  Image,
  FileText,
  Archive,
  Video,
  Music,
  Download,
  Trash2,
  FolderOpen
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { motion } from "motion/react"
import { toast } from "sonner"

interface UploadedFile {
  id: string
  url: string
  filename: string
  originalName: string
  size: number
  mimeType: string
  createdAt: string
}

interface Project {
  id: string
  name: string
}

interface Client {
  id: string
  name: string
}

export default function UploadPage() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>("")
  const [selectedClientId, setSelectedClientId] = useState<string>("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProjects()
    fetchClients()
    fetchRecentFiles()
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

  const fetchRecentFiles = async () => {
    try {
      const response = await fetch('/api/files?limit=10')
      if (response.ok) {
        const data = await response.json()
        setUploadedFiles(data.slice(0, 10)) // Limiter aux 10 derniers
      }
    } catch (error) {
      console.error('Erreur lors du chargement des fichiers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUploaded = (fileData: any) => {
    // Ajouter le nouveau fichier à la liste
    setUploadedFiles(prev => [
      {
        id: Date.now().toString(),
        ...fileData,
        createdAt: new Date().toISOString()
      },
      ...prev.slice(0, 9) // Garder seulement les 10 derniers
    ])
    
    // Réinitialiser les champs
    setDescription("")
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return Image
    if (mimeType.startsWith('video/')) return Video
    if (mimeType.startsWith('audio/')) return Music
    if (mimeType.includes('pdf') || mimeType.includes('document')) return FileText
    if (mimeType.includes('zip') || mimeType.includes('archive')) return Archive
    return File
  }

  const getFileTypeLabel = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return 'Image'
    if (mimeType.startsWith('video/')) return 'Vidéo'
    if (mimeType.startsWith('audio/')) return 'Audio'
    if (mimeType.includes('pdf')) return 'PDF'
    if (mimeType.includes('document') || mimeType.includes('word')) return 'Document'
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'Tableur'
    if (mimeType.includes('zip') || mimeType.includes('archive')) return 'Archive'
    return 'Fichier'
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleDownload = (file: UploadedFile) => {
    const link = document.createElement('a')
    link.href = file.url
    link.download = file.originalName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Upload de Fichiers</h1>
          <p className="text-muted-foreground mt-2">
            Uploadez vos fichiers jusqu'à 200MB • Tous types acceptés
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Upload className="h-8 w-8 text-blue-600" />
          <Badge variant="secondary" className="text-lg px-3 py-1">
            Max 200MB
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Zone d'upload principale */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Uploader un fichier
              </CardTitle>
              <CardDescription>
                Glissez-déposez ou sélectionnez un fichier. Tous les types sont acceptés.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Sélection du projet */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Projet (optionnel)</Label>
                  <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
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

                <div className="space-y-2">
                  <Label>Client (optionnel)</Label>
                  <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Aucun client</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>Description (optionnelle)</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Décrivez le fichier..."
                  rows={3}
                />
              </div>

              {/* Composant d'upload */}
              <FileUpload
                onFileUploaded={handleFileUploaded}
                uploadEndpoint="/api/upload"
                maxSizeMB={200}
                projectId={selectedProjectId || undefined}
                clientId={selectedClientId || undefined}
                description={description || undefined}
              />
            </CardContent>
          </Card>

          {/* Informations sur les limites */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900 mb-2">Fonctionnalités d'upload</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Taille maximum : 200MB par fichier</li>
                    <li>• Tous les types de fichiers acceptés</li>
                    <li>• Glisser-déposer supporté</li>
                    <li>• Association automatique aux projets et clients</li>
                    <li>• Stockage sécurisé et organisé</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar avec fichiers récents */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Fichiers récents
              </CardTitle>
              <CardDescription>
                Les 10 derniers fichiers uploadés
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : uploadedFiles.length > 0 ? (
                <div className="space-y-3">
                  {uploadedFiles.map((file, index) => {
                    const IconComponent = getFileIcon(file.mimeType)
                    return (
                      <motion.div
                        key={file.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <IconComponent className="h-8 w-8 text-blue-600" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {file.originalName}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {getFileTypeLabel(file.mimeType)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(file.createdAt)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(file)}
                          className="shrink-0"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <File className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Aucun fichier récent</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Statistiques */}
          <Card>
            <CardHeader>
              <CardTitle>Statistiques</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Fichiers récents</span>
                  <span className="font-medium">{uploadedFiles.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Taille totale</span>
                  <span className="font-medium">
                    {formatFileSize(uploadedFiles.reduce((acc, file) => acc + file.size, 0))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Limite par fichier</span>
                  <span className="font-medium text-green-600">200MB</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 