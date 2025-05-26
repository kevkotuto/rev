"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { toast } from "sonner"

interface PDFStatusProps {
  proformaId: string
  invoiceNumber: string
}

export function PDFStatus({ proformaId, invoiceNumber }: PDFStatusProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleDownloadPDF = async () => {
    setIsGenerating(true)
    
    try {
      const response = await fetch(`/api/proformas/${proformaId}/pdf`)
      
      if (response.ok) {
        // Créer un blob à partir de la réponse
        const blob = await response.blob()
        
        // Créer un URL temporaire pour le téléchargement
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `proforma-${invoiceNumber}.pdf`
        document.body.appendChild(a)
        a.click()
        
        // Nettoyer
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        toast.success('PDF téléchargé avec succès ! 📄')
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors de la génération du PDF')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors du téléchargement du PDF')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownloadPDF}
      disabled={isGenerating}
      className="flex items-center gap-2"
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Génération...
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          Télécharger PDF
        </>
      )}
    </Button>
  )
} 