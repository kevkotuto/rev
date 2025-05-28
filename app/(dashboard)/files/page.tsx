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
  Trash2, 
  Upload,
  Download,
  File,
  Image,
  FileText,
  Archive,
  Filter,
  FolderOpen,
  Calendar,
  Eye,
  Play,
  Video,
  Music,
  Code,
  Maximize2,
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
import { FileUpload } from "@/components/ui/file-upload"
import { motion } from "motion/react"
import { toast } from "sonner"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"

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
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  const { confirm, ConfirmDialog } = useConfirmDialog()

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
    confirm({
      title: "Supprimer le fichier",
      description: "Êtes-vous sûr de vouloir supprimer ce fichier ? Cette action est irréversible.",
      confirmText: "Supprimer",
      variant: "destructive",
      onConfirm: async () => {
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
    })
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
    if (mimeType.startsWith('video/')) return Video
    if (mimeType.startsWith('audio/')) return Music
    if (mimeType.includes('pdf') || mimeType.includes('document')) return FileText
    if (mimeType.includes('zip') || mimeType.includes('archive')) return Archive
    if (mimeType.includes('javascript') || mimeType.includes('json') || mimeType.includes('html') || mimeType.includes('css')) return Code
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
    if (mimeType.includes('javascript') || mimeType.includes('json') || mimeType.includes('html') || mimeType.includes('css')) return 'Code'
    return 'Fichier'
  }

  const getFileTypeBadge = (mimeType: string) => {
    const typeColors = {
      'image': 'bg-green-100 text-green-800 border-green-200',
      'video': 'bg-purple-100 text-purple-800 border-purple-200',
      'audio': 'bg-orange-100 text-orange-800 border-orange-200',
      'pdf': 'bg-red-100 text-red-800 border-red-200',
      'document': 'bg-blue-100 text-blue-800 border-blue-200',
      'spreadsheet': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'archive': 'bg-violet-100 text-violet-800 border-violet-200',
      'code': 'bg-slate-100 text-slate-800 border-slate-200',
      'default': 'bg-gray-100 text-gray-800 border-gray-200'
    }

    let colorKey = 'default'
    if (mimeType.startsWith('image/')) colorKey = 'image'
    else if (mimeType.startsWith('video/')) colorKey = 'video'
    else if (mimeType.startsWith('audio/')) colorKey = 'audio'
    else if (mimeType.includes('pdf')) colorKey = 'pdf'
    else if (mimeType.includes('document') || mimeType.includes('word')) colorKey = 'document'
    else if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) colorKey = 'spreadsheet'
    else if (mimeType.includes('zip') || mimeType.includes('archive')) colorKey = 'archive'
    else if (mimeType.includes('javascript') || mimeType.includes('json') || mimeType.includes('html') || mimeType.includes('css')) colorKey = 'code'

    return {
      label: getFileTypeLabel(mimeType),
      color: typeColors[colorKey as keyof typeof typeColors]
    }
  }

  const openPreview = (file: FileItem) => {
    setPreviewFile(file)
    setIsPreviewOpen(true)
  }

  const isPreviewable = (mimeType: string) => {
    return mimeType.startsWith('image/') || 
           mimeType.startsWith('video/') || 
           mimeType.startsWith('audio/') ||
           mimeType.includes('pdf')
  }

  const truncateFileName = (fileName: string, maxLength: number = 25) => {
    if (fileName.length <= maxLength) return fileName
    
    const lastDotIndex = fileName.lastIndexOf('.')
    if (lastDotIndex === -1) {
      // Pas d'extension
      return fileName.substring(0, maxLength - 3) + '...'
    }
    
    const extension = fileName.substring(lastDotIndex)
    const nameWithoutExt = fileName.substring(0, lastDotIndex)
    const availableLength = maxLength - extension.length - 3 // 3 pour "..."
    
    if (availableLength <= 0) {
      return '...' + extension
    }
    
    return nameWithoutExt.substring(0, availableLength) + '...' + extension
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">Fichiers</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Gérez vos fichiers et documents par projet
          </p>
        </div>
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto shrink-0">
              <Upload className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Uploader un fichier</span>
              <span className="sm:hidden">Uploader</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Uploader un fichier</DialogTitle>
              <DialogDescription>
                Sélectionnez un fichier à uploader (max 200MB). Tous les types de fichiers sont autorisés.
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto max-h-[60vh] px-1">
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="file">Fichier *</Label>
                  <Input
                    id="file"
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    accept="*/*"
                    className="cursor-pointer"
                  />
                  {selectedFile && (
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center text-white shrink-0">
                          {(() => {
                            const IconComponent = getFileIcon(selectedFile.type)
                            return <IconComponent className="h-5 w-5" />
                          })()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm" title={selectedFile.name}>
                            {truncateFileName(selectedFile.name, 30)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(selectedFile.size)} • {getFileTypeLabel(selectedFile.type)}
                          </p>
                        </div>
                      </div>
                    </div>
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
                          <span className="truncate">{project.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsUploadDialogOpen(false)}
                className="w-full sm:w-auto"
              >
                Annuler
              </Button>
              <Button 
                onClick={handleFileUpload} 
                disabled={!selectedFile || uploading}
                className="w-full sm:w-auto"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Upload en cours...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Uploader
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">Statistiques des fichiers</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="text-center sm:text-left">
              <div className="text-xl sm:text-2xl font-bold text-blue-600">{filteredFiles.length}</div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Fichier{filteredFiles.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="text-center sm:text-left">
              <div className="text-xl sm:text-2xl font-bold text-green-600">{formatFileSize(totalSize)}</div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Taille totale
              </p>
            </div>
            <div className="text-center sm:text-left">
              <div className="text-xl sm:text-2xl font-bold text-purple-600">
                {filteredFiles.filter(f => f.mimeType.startsWith('image/')).length}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">Images</p>
            </div>
            <div className="text-center sm:text-left">
              <div className="text-xl sm:text-2xl font-bold text-orange-600">
                {filteredFiles.filter(f => f.mimeType.startsWith('video/') || f.mimeType.startsWith('audio/')).length}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">Médias</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un fichier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex gap-2 sm:gap-3">
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <FolderOpen className="mr-2 h-4 w-4" />
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
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="vidéo">Vidéos</SelectItem>
              <SelectItem value="audio">Audio</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="document">Documents</SelectItem>
              <SelectItem value="tableur">Tableurs</SelectItem>
              <SelectItem value="archive">Archives</SelectItem>
              <SelectItem value="code">Code</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Files Grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
              <Card className="group hover:shadow-lg transition-all duration-200 hover:scale-[1.02] overflow-hidden">
                {/* Preview Section */}
                <div className="relative aspect-video bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                  {file.mimeType.startsWith('image/') ? (
                    <div className="relative w-full h-full">
                      <img
                        src={file.path}
                        alt={file.originalName}
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          e.currentTarget.nextElementSibling?.classList.remove('hidden')
                        }}
                      />
                      <div className="hidden absolute inset-0 flex items-center justify-center bg-gray-100">
                        <FileIcon className="h-8 w-8 text-gray-400" />
                      </div>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="bg-white/90 hover:bg-white text-gray-900"
                          onClick={() => openPreview(file)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Aperçu
                        </Button>
                      </div>
                    </div>
                  ) : file.mimeType.startsWith('video/') ? (
                    <div className="relative w-full h-full bg-gray-900 flex items-center justify-center">
                      <video
                        src={file.path}
                        className="w-full h-full object-cover"
                        muted
                        preload="metadata"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                            <Play className="h-6 w-6 text-white ml-1" />
                          </div>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="bg-white/90 hover:bg-white text-gray-900 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => openPreview(file)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Lire
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : file.mimeType.startsWith('audio/') ? (
                    <div className="relative w-full h-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center">
                          <Music className="h-8 w-8 text-white" />
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="bg-white/90 hover:bg-white text-gray-900 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => openPreview(file)}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Écouter
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                          <FileIcon className="h-8 w-8 text-white" />
                        </div>
                        {isPreviewable(file.mimeType) && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="bg-white/90 hover:bg-white text-gray-900 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => openPreview(file)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Aperçu
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Type Badge */}
                  <div className="absolute top-2 left-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${typeBadge.color}`}>
                      {typeBadge.label}
                    </span>
                  </div>

                  {/* Actions Menu */}
                  <div className="absolute top-2 right-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="secondary" 
                          size="sm"
                          className="h-8 w-8 p-0 bg-white/90 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {isPreviewable(file.mimeType) && (
                          <DropdownMenuItem onClick={() => openPreview(file)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Aperçu
                          </DropdownMenuItem>
                        )}
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
                  </div>
                </div>

                {/* File Info */}
                <CardContent className="p-3 sm:p-4">
                  <div className="space-y-2">
                    {/* File Name */}
                    <div className="min-w-0">
                      <h3 className="font-medium text-sm" title={file.originalName}>
                        {truncateFileName(file.originalName)}
                      </h3>
                    </div>

                    {/* File Details */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-medium">{formatFileSize(file.size)}</span>
                      <div className="flex items-center">
                        <Calendar className="mr-1 h-3 w-3" />
                        {new Date(file.createdAt).toLocaleDateString('fr-FR')}
                      </div>
                    </div>

                    {/* Project Badge */}
                    {file.project && (
                      <div className="pt-1">
                        <Badge variant="outline" className="text-xs truncate max-w-full">
                          <FolderOpen className="mr-1 h-3 w-3 shrink-0" />
                          <span className="truncate">{file.project.name}</span>
                        </Badge>
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

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2 border-b">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-lg" title={previewFile?.originalName}>
                  {previewFile && truncateFileName(previewFile.originalName, 50)}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-4 mt-1">
                  <span>{previewFile && formatFileSize(previewFile.size)}</span>
                  <span>{previewFile && getFileTypeLabel(previewFile.mimeType)}</span>
                  {previewFile?.project && (
                    <Badge variant="outline" className="text-xs">
                      {previewFile.project.name}
                    </Badge>
                  )}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => previewFile && handleDownload(previewFile)}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Télécharger
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPreviewOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto">
            {previewFile && (
              <div className="p-4">
                {previewFile.mimeType.startsWith('image/') && (
                  <div className="flex justify-center">
                    <img
                      src={previewFile.path}
                      alt={previewFile.originalName}
                      className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                    />
                  </div>
                )}
                
                {previewFile.mimeType.startsWith('video/') && (
                  <div className="flex justify-center">
                    <video
                      src={previewFile.path}
                      controls
                      className="max-w-full max-h-[70vh] rounded-lg shadow-lg"
                      preload="metadata"
                    >
                      Votre navigateur ne supporte pas la lecture vidéo.
                    </video>
                  </div>
                )}
                
                {previewFile.mimeType.startsWith('audio/') && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-24 h-24 bg-orange-500 rounded-full flex items-center justify-center mb-6">
                      <Music className="h-12 w-12 text-white" />
                    </div>
                    <h3 className="text-lg font-medium mb-4 text-center" title={previewFile.originalName}>
                      {truncateFileName(previewFile.originalName, 40)}
                    </h3>
                    <audio
                      src={previewFile.path}
                      controls
                      className="w-full max-w-md"
                      preload="metadata"
                    >
                      Votre navigateur ne supporte pas la lecture audio.
                    </audio>
                  </div>
                )}
                
                {previewFile.mimeType.includes('pdf') && (
                  <div className="flex justify-center">
                    <iframe
                      src={previewFile.path}
                      className="w-full h-[70vh] border rounded-lg"
                      title={previewFile.originalName}
                    />
                  </div>
                )}
                
                {!isPreviewable(previewFile.mimeType) && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                                         <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-6">
                       {(() => {
                         const IconComponent = getFileIcon(previewFile.mimeType)
                         return <IconComponent className="h-12 w-12 text-gray-500" />
                       })()}
                     </div>
                    <h3 className="text-lg font-medium mb-2">
                      Aperçu non disponible
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Ce type de fichier ne peut pas être prévisualisé dans le navigateur.
                    </p>
                    <Button onClick={() => handleDownload(previewFile)}>
                      <Download className="h-4 w-4 mr-2" />
                      Télécharger le fichier
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog />
    </div>
  )
} 