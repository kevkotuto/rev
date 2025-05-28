"use client"

import React, { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { 
  Pen, 
  Eraser, 
  RotateCcw, 
  Download, 
  Upload, 
  Trash2, 
  CheckCircle,
  PenTool,
  Save
} from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface SignatureCanvasProps {
  currentSignature?: string
  onSignatureChange: (signatureDataUrl: string | null) => void
  className?: string
}

export function SignatureCanvas({ 
  currentSignature, 
  onSignatureChange, 
  className = "" 
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [saving, setSaving] = useState(false)

  // Configuration du canvas
  const canvasWidth = 400
  const canvasHeight = 200

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Configuration du contexte
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    // Charger la signature existante si elle existe
    if (currentSignature) {
      const img = new Image()
      img.onload = () => {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight)
        ctx.fillRect(0, 0, canvasWidth, canvasHeight)
        ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight)
        setHasSignature(true)
      }
      img.src = currentSignature
    }
  }, [currentSignature, isDialogOpen])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    setIsDrawing(true)
    setHasSignature(true)

    let x, y
    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left
      y = e.touches[0].clientY - rect.top
    } else {
      x = e.clientX - rect.left
      y = e.clientY - rect.top
    }

    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let x, y
    if ('touches' in e) {
      e.preventDefault()
      x = e.touches[0].clientX - rect.left
      y = e.touches[0].clientY - rect.top
    } else {
      x = e.clientX - rect.left
      y = e.clientY - rect.top
    }

    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvasWidth, canvasHeight)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)
    setHasSignature(false)
  }

  const saveSignature = async () => {
    const canvas = canvasRef.current
    if (!canvas || !hasSignature) {
      toast.error('Veuillez dessiner votre signature avant de sauvegarder')
      return
    }

    setSaving(true)
    try {
      // Convertir le canvas en data URL
      const dataUrl = canvas.toDataURL('image/png')
      
      // Appeler la fonction de callback
      onSignatureChange(dataUrl)
      
      setIsDialogOpen(false)
      toast.success('Signature sauvegardée avec succès !')
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      toast.error('Erreur lors de la sauvegarde de la signature')
    } finally {
      setSaving(false)
    }
  }

  const removeSignature = () => {
    onSignatureChange(null)
    clearCanvas()
    toast.success('Signature supprimée')
  }

  const downloadSignature = () => {
    const canvas = canvasRef.current
    if (!canvas || !hasSignature) {
      toast.error('Aucune signature à télécharger')
      return
    }

    const link = document.createElement('a')
    link.download = 'ma-signature.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
    toast.success('Signature téléchargée')
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-medium">Signature numérique</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Dessinez votre signature pour l'utiliser automatiquement sur vos devis et factures
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <PenTool className="w-4 h-4" />
              {currentSignature ? 'Modifier' : 'Créer'} signature
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pen className="w-5 h-5" />
                Signature numérique
              </DialogTitle>
              <DialogDescription>
                Dessinez votre signature dans la zone ci-dessous. Elle sera automatiquement ajoutée à vos devis et factures.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Zone de dessin */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Zone de signature</CardTitle>
                  <CardDescription>
                    Utilisez votre souris ou votre doigt pour dessiner
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                    <canvas
                      ref={canvasRef}
                      width={canvasWidth}
                      height={canvasHeight}
                      className="border border-gray-200 rounded bg-white cursor-crosshair touch-none"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      style={{ width: '100%', maxWidth: '400px', height: 'auto' }}
                    />
                  </div>
                  
                  {/* Outils */}
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearCanvas}
                        className="flex items-center gap-1"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Effacer
                      </Button>
                      {hasSignature && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={downloadSignature}
                          className="flex items-center gap-1"
                        >
                          <Download className="w-4 h-4" />
                          Télécharger
                        </Button>
                      )}
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      {hasSignature ? '✓ Signature prête' : 'Dessinez votre signature'}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Instructions */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <PenTool className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-blue-900">Conseils pour une belle signature</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Écrivez naturellement, comme sur papier</li>
                        <li>• Utilisez des traits fluides et continus</li>
                        <li>• Évitez les détails trop fins qui pourraient mal s'afficher</li>
                        <li>• Votre signature sera redimensionnée automatiquement dans les documents</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button 
                onClick={saveSignature} 
                disabled={!hasSignature || saving}
                className="flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Sauvegarder
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Aperçu de la signature actuelle */}
      {currentSignature && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Signature actuelle</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={removeSignature}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex items-center justify-center">
              <img 
                src={currentSignature} 
                alt="Signature actuelle"
                className="max-w-full max-h-24 object-contain"
              />
            </div>
            <div className="flex items-center gap-2 mt-3 text-sm text-green-600">
              <CheckCircle className="w-4 h-4" />
              Cette signature sera automatiquement ajoutée à vos devis et factures
            </div>
          </CardContent>
        </Card>
      )}

      {!currentSignature && (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <PenTool className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucune signature configurée</p>
              <p className="text-xs mt-1">Cliquez sur "Créer signature" pour commencer</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 