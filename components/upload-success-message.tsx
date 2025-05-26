"use client"

import { CheckCircle, Upload, FileText, Image, Video, Archive } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function UploadSuccessMessage() {
  return (
    <Card className="border-green-200 bg-green-50">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <CheckCircle className="h-8 w-8 text-green-600 mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-green-800 mb-2">
              🎉 Configuration d'upload mise à jour !
            </h3>
            <p className="text-green-700 mb-4">
              Votre système d'upload a été amélioré avec de nouvelles capacités :
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800">Taille maximum</span>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  200MB par fichier
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800">Types de fichiers</span>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Tous types acceptés
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-green-800">Types de fichiers supportés :</h4>
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1 text-sm text-green-700">
                  <Image className="h-3 w-3" />
                  Images
                </div>
                <div className="flex items-center gap-1 text-sm text-green-700">
                  <Video className="h-3 w-3" />
                  Vidéos
                </div>
                <div className="flex items-center gap-1 text-sm text-green-700">
                  <FileText className="h-3 w-3" />
                  Documents
                </div>
                <div className="flex items-center gap-1 text-sm text-green-700">
                  <Archive className="h-3 w-3" />
                  Archives
                </div>
                <span className="text-sm text-green-700">et bien plus...</span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-green-100 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Nouveautés :</strong> Interface glisser-déposer améliorée, 
                barre de progression en temps réel, et association automatique aux projets et clients.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 