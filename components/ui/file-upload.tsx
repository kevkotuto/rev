"use client"

import React, { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Upload, X, File, CheckCircle, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"

interface FileUploadProps {
  onFileUploaded: (fileData: {
    url: string
    filename: string
    originalName: string
    size: number
    mimeType: string
  }) => void
  uploadEndpoint: string
  acceptedTypes?: string
  maxSizeMB?: number
  className?: string
  projectId?: string
  clientId?: string
  providerId?: string
  description?: string
}

export function FileUpload({ 
  onFileUploaded,
  uploadEndpoint,
  acceptedTypes = "*/*",
  maxSizeMB = 200,
  className = "",
  projectId,
  clientId,
  providerId,
  description
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleFileSelect = async (file: File) => {
    // Vérifier la taille du fichier
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Le fichier ne doit pas dépasser ${maxSizeMB}MB`)
      return
    }

    setSelectedFile(file)
    await uploadFile(file)
  }

  const uploadFile = async (file: File) => {
    setUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'document')
      
      if (projectId) formData.append('projectId', projectId)
      if (clientId) formData.append('clientId', clientId)
      if (providerId) formData.append('providerId', providerId)
      if (description) formData.append('description', description)

      // Simuler le progrès d'upload
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      const response = await fetch(uploadEndpoint, {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (response.ok) {
        const data = await response.json()
        onFileUploaded(data)
        toast.success('Fichier uploadé avec succès ! 📁')
        setSelectedFile(null)
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors de l\'upload')
      }
    } catch (error) {
      console.error('Erreur upload:', error)
      toast.error('Erreur lors de l\'upload du fichier')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const removeSelectedFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <Label>Upload de fichier</Label>
      
      {/* Zone de drop */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200 ${
          dragOver 
            ? 'border-blue-500 bg-blue-50 scale-105' 
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-sm text-gray-600 mb-2">
          Glissez-déposez un fichier ou cliquez pour sélectionner
        </p>
        <p className="text-xs text-gray-500">
          Tous types de fichiers acceptés • Maximum {maxSizeMB}MB
        </p>
      </div>

      {/* Fichier sélectionné */}
      {selectedFile && !uploading && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <File className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">{selectedFile.name}</p>
                  <p className="text-sm text-blue-700">{formatFileSize(selectedFile.size)}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={removeSelectedFile}
                className="text-blue-600 hover:text-blue-800"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progrès d'upload */}
      {uploading && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Upload className="h-5 w-5 text-green-600 animate-pulse" />
              <span className="text-sm font-medium text-green-800">
                Upload en cours...
              </span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-xs text-green-700 mt-2">
              {uploadProgress}% terminé
            </p>
          </CardContent>
        </Card>
      )}

      {/* Input caché */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes}
        onChange={handleFileChange}
        className="hidden"
        aria-label="Sélectionner un fichier"
      />

      {/* Bouton d'upload alternatif */}
      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="w-full"
      >
        <Upload className="w-4 h-4 mr-2" />
        {uploading ? 'Upload en cours...' : 'Choisir un fichier'}
      </Button>

      {/* Informations sur les limites */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• Taille maximum : {maxSizeMB}MB</p>
        <p>• Tous les types de fichiers sont acceptés</p>
        <p>• Glisser-déposer supporté</p>
      </div>
    </div>
  )
} 