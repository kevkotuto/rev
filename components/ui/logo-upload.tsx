"use client"

import React, { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, X, Image as ImageIcon } from "lucide-react"
import { toast } from "sonner"

interface LogoUploadProps {
  currentLogo?: string
  onLogoChange: (logoUrl: string | null) => void
  uploadEndpoint: string
  entityName: string
  className?: string
}

export function LogoUpload({ 
  currentLogo, 
  onLogoChange, 
  uploadEndpoint, 
  entityName,
  className = ""
}: LogoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image')
      return
    }

    if (file.size > 200 * 1024 * 1024) {
      toast.error('Le fichier ne doit pas dépasser 200MB')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('logo', file)

      const response = await fetch(uploadEndpoint, {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        onLogoChange(data.logoUrl)
        toast.success('Logo uploadé avec succès')
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors de l\'upload')
      }
    } catch (error) {
      console.error('Erreur upload:', error)
      toast.error('Erreur lors de l\'upload du logo')
    } finally {
      setUploading(false)
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

  const handleRemoveLogo = async () => {
    try {
      const response = await fetch(uploadEndpoint, {
        method: 'DELETE'
      })

      if (response.ok) {
        onLogoChange(null)
        toast.success('Logo supprimé avec succès')
      } else {
        toast.error('Erreur lors de la suppression du logo')
      }
    } catch (error) {
      console.error('Erreur suppression:', error)
      toast.error('Erreur lors de la suppression du logo')
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <Label>Logo du {entityName}</Label>
      
      {currentLogo ? (
        <div className="relative inline-block">
          <img 
            src={currentLogo} 
            alt={`Logo ${entityName}`}
            className="w-24 h-24 object-cover rounded-lg border"
          />
          <Button
            variant="destructive"
            size="sm"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
            onClick={handleRemoveLogo}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            dragOver 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-sm text-gray-600 mb-2">
            Glissez-déposez une image ou cliquez pour sélectionner
          </p>
          <p className="text-xs text-gray-500">
            Tous types de fichiers jusqu'à 200MB
          </p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        aria-label={`Sélectionner un logo pour ${entityName}`}
      />

      {!currentLogo && (
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full"
        >
          <Upload className="w-4 h-4 mr-2" />
          {uploading ? 'Upload en cours...' : 'Choisir un fichier'}
        </Button>
      )}
    </div>
  )
} 