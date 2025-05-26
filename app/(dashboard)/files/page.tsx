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
  Trash2, 
  Upload,
  Download,
  File,
  Image,
  FileText,
  Archive,
  Filter,
  FolderOpen,
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
import { FileUpload } from "@/components/ui/file-upload"
import { motion } from "motion/react"
import { toast } from "sonner"

interface FileItem {
  id: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  path: string
  createdAt: string
  project?: {
    id: string
    name: string
  }
}

interface Project {
  id: string
  name: string
}

export default function FilesPage() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [projectFilter, setProjectFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState("none")

  useEffect(() => {
    fetchFiles()
    fetchProjects()
  }, [])

  const fetchFiles = async () => {
    try {
      const response = await fetch('/api/files')
      if (response.ok) {
        const data = await response.json()
        setFiles(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des fichiers:', error)
      toast.error('Erreur lors du chargement des fichiers')
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

  const handleFileUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('type', 'document') // Spécifier le type pour la page fichiers
      if (selectedProjectId && selectedProjectId !== "none") {
        formData.append('projectId', selectedProjectId)
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        toast.success('Fichier uploadé avec succès')
        setIsUploadDialogOpen(false)
        setSelectedFile(null)
        setSelectedProjectId("none")
        fetchFiles()
      } else {
        toast.error('Erreur lors de l\'upload du fichier')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de l\'upload du fichier')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce fichier ?')) return

    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Fichier supprimé avec succès')
        fetchFiles()
      } else {
        toast.error('Erreur lors de la suppression du fichier')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la suppression du fichier')
    }
  }

  const handleDownload = (file: FileItem) => {
    const link = document.createElement('a')
    link.href = file.path
    link.download = file.originalName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return Image
    if (mimeType.includes('pdf') || mimeType.includes('document')) return FileText
    if (mimeType.includes('zip') || mimeType.includes('archive')) return Archive
    return File
  }

  const getFileTypeLabel = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return 'Image'
    if (mimeType.includes('pdf')) return 'PDF'
    if (mimeType.includes('document') || mimeType.includes('word')) return 'Document'
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'Tableur'
    if (mimeType.includes('zip') || mimeType.includes('archive')) return 'Archive'
    return 'Fichier'
  }

  const getFileTypeBadge = (mimeType: string) => {
    const typeColors = {
      'image': 'bg-green-100 text-green-800',
      'pdf': 'bg-red-100 text-red-800',
      'document': 'bg-blue-100 text-blue-800',
      'spreadsheet': 'bg-emerald-100 text-emerald-800',
      'archive': 'bg-purple-100 text-purple-800',
      'default': 'bg-gray-100 text-gray-800'
    }

    let colorKey = 'default'
    if (mimeType.startsWith('image/')) colorKey = 'image'
    else if (mimeType.includes('pdf')) colorKey = 'pdf'
    else if (mimeType.includes('document') || mimeType.includes('word')) colorKey = 'document'
    else if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) colorKey = 'spreadsheet'
    else if (mimeType.includes('zip') || mimeType.includes('archive')) colorKey = 'archive'

    return {
      label: getFileTypeLabel(mimeType),
      color: typeColors[colorKey as keyof typeof typeColors]
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.originalName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesProject = projectFilter === "all" || file.project?.id === projectFilter
    const matchesType = typeFilter === "all" || getFileTypeLabel(file.mimeType).toLowerCase() === typeFilter.toLowerCase()
    
    return matchesSearch && matchesProject && matchesType
  })

  const totalSize = filteredFiles.reduce((sum, file) => sum + file.size, 0)

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
          <h1 className="text-3xl font-bold tracking-tight">Fichiers</h1>
          <p className="text-muted-foreground">
            Gérez vos fichiers et documents par projet
          </p>
        </div>
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Uploader un fichier
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Uploader un fichier</DialogTitle>
              <DialogDescription>
                Sélectionnez un fichier à uploader (max 200MB). Tous les types de fichiers sont autorisés.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="file">Fichier *</Label>
                <Input
                  id="file"
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  accept="*/*"
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">
                    {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </p>
                )}
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="project">Projet (optionnel)</Label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
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
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                Annuler
              </Button>
              <Button 
                onClick={handleFileUpload} 
                disabled={!selectedFile || uploading}
              >
                {uploading ? 'Upload en cours...' : 'Uploader'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Statistiques des fichiers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-2xl font-bold">{filteredFiles.length}</div>
              <p className="text-sm text-muted-foreground">
                Fichier{filteredFiles.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div>
              <div className="text-2xl font-bold">{formatFileSize(totalSize)}</div>
              <p className="text-sm text-muted-foreground">
                Taille totale
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex items-center space-x-4 flex-wrap gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un fichier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-[180px]">
            <FolderOpen className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Projet" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les projets</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="image">Images</SelectItem>
            <SelectItem value="pdf">PDF</SelectItem>
            <SelectItem value="document">Documents</SelectItem>
            <SelectItem value="tableur">Tableurs</SelectItem>
            <SelectItem value="archive">Archives</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Files Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredFiles.map((file, index) => {
          const FileIcon = getFileIcon(file.mimeType)
          const typeBadge = getFileTypeBadge(file.mimeType)
          
          return (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white">
                      <FileIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm font-medium truncate">
                        {file.originalName}
                      </CardTitle>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleDownload(file)}>
                        <Download className="mr-2 h-4 w-4" />
                        Télécharger
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteFile(file.id)}
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
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeBadge.color}`}>
                        {typeBadge.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </span>
                    </div>

                    {file.project && (
                      <Badge variant="outline" className="text-xs">
                        {file.project.name}
                      </Badge>
                    )}

                    <div className="flex items-center text-xs text-muted-foreground">
                      <Calendar className="mr-1 h-3 w-3" />
                      {new Date(file.createdAt).toLocaleDateString('fr-FR')}
                    </div>

                    {file.mimeType.startsWith('image/') && (
                      <div className="mt-2">
                        <img
                          src={file.path}
                          alt={file.originalName}
                          className="w-full h-20 object-cover rounded-md"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {filteredFiles.length === 0 && (
        <div className="text-center py-12">
          <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">Aucun fichier</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {searchTerm || projectFilter !== "all" || typeFilter !== "all"
              ? 'Aucun fichier ne correspond à vos filtres.' 
              : 'Commencez par uploader votre premier fichier.'}
          </p>
        </div>
      )}
    </div>
  )
} 