"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Send, 
  Eye, 
  User, 
  Mail, 
  Building, 
  AlertCircle,
  CheckCircle,
  Loader2
} from "lucide-react"
import { toast } from "sonner"

interface EmailPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoiceId: string
  invoiceType: "INVOICE" | "PROFORMA"
  onEmailSent?: () => void
}

interface EmailPreviewData {
  invoice?: {
    id: string
    invoiceNumber: string
    type: string
    amount: number
  }
  proforma?: {
    id: string
    invoiceNumber: string
    type: string
    amount: number
  }
  defaultRecipient: string
  defaultSubject: string
  emailContent: string
  client?: {
    name: string
    email: string
  }
  customClient?: {
    name: string
    email: string
  }
}

export function EmailPreviewDialog({ 
  open, 
  onOpenChange, 
  invoiceId, 
  invoiceType, 
  onEmailSent 
}: EmailPreviewDialogProps) {
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [previewData, setPreviewData] = useState<EmailPreviewData | null>(null)
  const [formData, setFormData] = useState({
    to: "",
    subject: "",
    message: ""
  })

  useEffect(() => {
    if (open && invoiceId) {
      fetchPreviewData()
    }
  }, [open, invoiceId, invoiceType])

  const fetchPreviewData = async () => {
    setLoading(true)
    try {
      const endpoint = invoiceType === "PROFORMA" 
        ? `/api/proformas/${invoiceId}/email-preview`
        : `/api/invoices/${invoiceId}/email-preview`
      
      const response = await fetch(endpoint)
      if (response.ok) {
        const data = await response.json()
        setPreviewData(data)
        setFormData({
          to: data.defaultRecipient,
          subject: data.defaultSubject,
          message: generateDefaultMessage(data)
        })
      } else {
        toast.error('Erreur lors du chargement de la prévisualisation')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors du chargement de la prévisualisation')
    } finally {
      setLoading(false)
    }
  }

  const generateDefaultMessage = (data: EmailPreviewData) => {
    const docType = data.invoice?.type === "PROFORMA" ? "proforma" : "facture"
    const docNumber = data.invoice?.invoiceNumber || data.proforma?.invoiceNumber
    const clientName = data.client?.name || data.customClient?.name || "Client"
    
    return `Bonjour ${clientName},

Veuillez trouver ci-joint votre ${docType} n°${docNumber} au format PDF.

N'hésitez pas à me contacter si vous avez des questions.

Cordialement`
  }

  const handleSendEmail = async () => {
    if (!formData.to || !formData.subject) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }

    setSending(true)
    try {
      const response = await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'invoice',
          to: formData.to,
          subject: formData.subject,
          invoiceId: invoiceId,
          attachPDF: true, // Toujours attacher le PDF
          customMessage: formData.message || undefined // Utiliser le message personnalisé
        })
      })

      if (response.ok) {
        const result = await response.json()
        toast.success('📧 Email envoyé avec succès avec le PDF en pièce jointe !')
        onOpenChange(false)
        onEmailSent?.()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors de l\'envoi de l\'email')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de l\'envoi de l\'email')
    } finally {
      setSending(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Préparation de l'email</DialogTitle>
            <DialogDescription>
              Chargement des informations...
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Chargement de la prévisualisation...</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!previewData) {
    return null
  }

  const docData = previewData.invoice || previewData.proforma
  const docType = docData?.type === "PROFORMA" ? "Proforma" : "Facture"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Mail className="h-5 w-5" />
            <span>Envoyer {docType} par email</span>
          </DialogTitle>
          <DialogDescription>
            Prévisualisez et personnalisez l'email avant l'envoi
          </DialogDescription>
        </DialogHeader>

        {/* Informations du document */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>{docType} {docData?.invoiceNumber}</span>
              <Badge variant="outline">{formatCurrency(docData?.amount || 0)}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Client du projet */}
              {previewData.client && (
                <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                  <Building className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">Client du projet</p>
                    <p className="text-sm text-blue-700">{previewData.client.name}</p>
                    <p className="text-sm text-blue-600">{previewData.client.email}</p>
                  </div>
                </div>
              )}
              
              {/* Client personnalisé */}
              {previewData.customClient && (
                <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                  <User className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900">Client personnalisé</p>
                    <p className="text-sm text-green-700">{previewData.customClient.name}</p>
                    <p className="text-sm text-green-600">{previewData.customClient.email}</p>
                  </div>
                </div>
              )}
            </div>
            
            {!previewData.client && !previewData.customClient && (
              <div className="flex items-center space-x-2 p-3 bg-amber-50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <p className="text-sm text-amber-700">Aucun client associé. Veuillez saisir manuellement l'email de destination.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="compose" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="compose" className="flex items-center space-x-2">
              <Send className="h-4 w-4" />
              <span>Composer</span>
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center space-x-2">
              <Eye className="h-4 w-4" />
              <span>Aperçu</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="compose" className="space-y-4">
            <div className="grid gap-4">
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
                <Label htmlFor="message">Message personnalisé</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  placeholder="Message d'accompagnement (optionnel)"
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">
                  Ce message apparaîtra dans l'email avec le {docType.toLowerCase()} en pièce jointe PDF.
                </p>
              </div>

              {/* Indication PDF */}
              <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-900">PDF automatiquement joint</p>
                  <p className="text-xs text-green-700">
                    Le {docType.toLowerCase()} sera automatiquement généré et joint à l'email au format PDF
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="preview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Aperçu de l'email</CardTitle>
                <CardDescription>
                  Voici comment votre email apparaîtra au destinataire
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
                  <div 
                    dangerouslySetInnerHTML={{ 
                      __html: previewData.emailContent 
                    }} 
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span>📎 Le {docType.toLowerCase()} sera joint en PDF automatiquement</span>
          </div>
          
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleSendEmail} 
              disabled={!formData.to || !formData.subject || sending}
            >
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Envoyer
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 