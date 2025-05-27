"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Receipt, 
  CheckCircle, 
  Clock,
  ArrowRight,
  Calculator,
  Info,
  Building2,
  User,
  Mail,
  Phone,
  MapPin
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { motion } from "motion/react"
import { toast } from "sonner"

interface ConversionStatus {
  proforma: {
    id: string
    invoiceNumber: string
    amount: number
    status: string
    createdAt: string
  }
  project: {
    id: string
    name: string
    client: {
      name: string
      email?: string
      phone?: string
      address?: string
    }
  } | null
  conversionStats: {
    totalAmount: number
    invoicedAmount: number
    remainingAmount: number
    conversionPercentage: number
    isFullyConverted: boolean
    numberOfConversions: number
  }
  services: Array<{
    id: string
    name: string
    description?: string
    unitPrice: number
    originalQuantity: number
    invoicedQuantity: number
    remainingQuantity: number
    unit?: string
    totalValue: number
    invoicedValue: number
    remainingValue: number
    isFullyInvoiced: boolean
    invoicedItems: Array<{
      id: string
      quantity: number
      totalPrice: number
      invoiceNumber: string
      invoiceId: string
      invoiceDate: string
    }>
  }>
  conversions: Array<{
    id: string
    invoiceNumber: string
    amount: number
    status: string
    createdAt: string
    items: Array<{
      id: string
      name: string
      description?: string
      unitPrice: number
      quantity: number
      unit?: string
      totalPrice: number
    }>
  }>
  availableForConversion: Array<{
    id: string
    name: string
    description?: string
    unitPrice: number
    remainingQuantity: number
    unit?: string
    remainingValue: number
  }>
}

interface PartialInvoiceConversionProps {
  proformaId: string
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function PartialInvoiceConversion({
  proformaId,
  isOpen,
  onClose,
  onSuccess
}: PartialInvoiceConversionProps) {
  const [status, setStatus] = useState<ConversionStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedServices, setSelectedServices] = useState<Record<string, number>>({})
  const [formData, setFormData] = useState({
    dueDate: "",
    notes: "",
    generatePaymentLink: false,
    paymentMethod: "CASH" as "WAVE" | "CASH" | "BANK_TRANSFER",
    markAsPaid: false,
    paidDate: new Date().toISOString().split('T')[0],
    clientInfo: {
      name: "",
      email: "",
      address: "",
      phone: ""
    }
  })

  useEffect(() => {
    if (isOpen && proformaId) {
      fetchConversionStatus()
    }
  }, [isOpen, proformaId])

  const fetchConversionStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/invoices/${proformaId}/conversion-status`)
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
        
        // Pré-remplir les informations client
        if (data.project?.client) {
          setFormData(prev => ({
            ...prev,
            clientInfo: {
              name: data.project.client.name || "",
              email: data.project.client.email || "",
              address: data.project.client.address || "",
              phone: data.project.client.phone || ""
            }
          }))
        }
      } else {
        toast.error('Erreur lors du chargement du statut de conversion')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors du chargement du statut de conversion')
    } finally {
      setLoading(false)
    }
  }

  const handleServiceSelection = (serviceId: string, quantity: number) => {
    setSelectedServices(prev => ({
      ...prev,
      [serviceId]: quantity
    }))
  }

  const calculateSelectedTotal = () => {
    if (!status) return 0
    
    return Object.entries(selectedServices).reduce((total, [serviceId, quantity]) => {
      const service = status.availableForConversion.find(s => s.id === serviceId)
      if (service && quantity > 0) {
        return total + (service.unitPrice * quantity)
      }
      return total
    }, 0)
  }

  const handleConvert = async () => {
    if (!status) return

    const selectedServicesList = Object.entries(selectedServices)
      .filter(([_, quantity]) => quantity > 0)
      .map(([serviceId, quantity]) => {
        const service = status.availableForConversion.find(s => s.id === serviceId)!
        return {
          id: serviceId,
          name: service.name,
          description: service.description,
          unitPrice: service.unitPrice,
          quantity,
          unit: service.unit,
          projectServiceId: serviceId
        }
      })

    if (selectedServicesList.length === 0) {
      toast.error('Veuillez sélectionner au moins un service')
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/invoices/${proformaId}/partial-convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedServices: selectedServicesList,
          clientInfo: formData.clientInfo,
          dueDate: formData.dueDate || undefined,
          notes: formData.notes || undefined,
          generatePaymentLink: formData.generatePaymentLink,
          paymentMethod: formData.paymentMethod,
          markAsPaid: formData.markAsPaid,
          paidDate: formData.markAsPaid ? formData.paidDate : undefined
        })
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(result.message)
        onSuccess?.()
        onClose()
        
        if (result.paymentLink) {
          window.open(result.paymentLink, '_blank')
        }
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors de la conversion')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la conversion')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR')
  }

  if (!status) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[800px]">
          <div className="flex items-center justify-center h-64">
            {loading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            ) : (
              <p>Erreur de chargement</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Conversion partielle en facture
          </DialogTitle>
          <DialogDescription>
            Sélectionnez les services à facturer pour {status.proforma.invoiceNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Statut de conversion */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Statut de conversion</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Progression</span>
                  <span className="text-sm font-medium">
                    {status.conversionStats.conversionPercentage.toFixed(1)}%
                  </span>
                </div>
                <Progress value={status.conversionStats.conversionPercentage} />
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <p className="text-muted-foreground">Total</p>
                    <p className="font-medium">{formatCurrency(status.conversionStats.totalAmount)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">Facturé</p>
                    <p className="font-medium text-green-600">{formatCurrency(status.conversionStats.invoicedAmount)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">Restant</p>
                    <p className="font-medium text-orange-600">{formatCurrency(status.conversionStats.remainingAmount)}</p>
                  </div>
                </div>

                {status.conversionStats.numberOfConversions > 0 && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      {status.conversionStats.numberOfConversions} facture(s) partielle(s) déjà créée(s)
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Services disponibles */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Services disponibles pour facturation</CardTitle>
            </CardHeader>
            <CardContent>
              {status.availableForConversion.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-muted-foreground">Tous les services ont été facturés</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {status.availableForConversion.map((service) => (
                    <motion.div
                      key={service.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{service.name}</h4>
                            <Badge variant="outline">
                              {service.remainingQuantity} {service.unit || 'unité(s)'} disponible(s)
                            </Badge>
                          </div>
                          {service.description && (
                            <p className="text-sm text-muted-foreground mb-2">{service.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm">
                            <span>Prix unitaire: {formatCurrency(service.unitPrice)}</span>
                            <span>Valeur restante: {formatCurrency(service.remainingValue)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`quantity-${service.id}`} className="text-sm">
                            Quantité:
                          </Label>
                          <Input
                            id={`quantity-${service.id}`}
                            type="number"
                            min="0"
                            max={service.remainingQuantity}
                            value={selectedServices[service.id] || 0}
                            onChange={(e) => handleServiceSelection(service.id, parseInt(e.target.value) || 0)}
                            className="w-20"
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Informations de facturation */}
          {Object.values(selectedServices).some(q => q > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Informations de facturation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Informations client */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientName">Nom du client</Label>
                    <Input
                      id="clientName"
                      value={formData.clientInfo.name}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        clientInfo: { ...prev.clientInfo, name: e.target.value }
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientEmail">Email</Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      value={formData.clientInfo.email}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        clientInfo: { ...prev.clientInfo, email: e.target.value }
                      }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clientAddress">Adresse</Label>
                  <Input
                    id="clientAddress"
                    value={formData.clientInfo.address}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      clientInfo: { ...prev.clientInfo, address: e.target.value }
                    }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientPhone">Téléphone</Label>
                    <Input
                      id="clientPhone"
                      value={formData.clientInfo.phone}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        clientInfo: { ...prev.clientInfo, phone: e.target.value }
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Date d'échéance</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Notes additionnelles pour cette facture partielle..."
                  />
                </div>

                {/* Options de paiement */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="generatePaymentLink"
                      checked={formData.generatePaymentLink}
                      onCheckedChange={(checked: boolean) => 
                        setFormData(prev => ({ ...prev, generatePaymentLink: checked }))
                      }
                    />
                    <Label htmlFor="generatePaymentLink">Générer un lien de paiement</Label>
                  </div>

                  {formData.generatePaymentLink && (
                    <div className="space-y-2">
                      <Label htmlFor="paymentMethod">Méthode de paiement</Label>
                      <Select 
                        value={formData.paymentMethod} 
                        onValueChange={(value: "WAVE" | "CASH" | "BANK_TRANSFER") => 
                          setFormData(prev => ({ ...prev, paymentMethod: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="WAVE">Wave CI</SelectItem>
                          <SelectItem value="CASH">Espèces</SelectItem>
                          <SelectItem value="BANK_TRANSFER">Virement bancaire</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="markAsPaid"
                      checked={formData.markAsPaid}
                      onCheckedChange={(checked: boolean) => 
                        setFormData(prev => ({ ...prev, markAsPaid: checked }))
                      }
                    />
                    <Label htmlFor="markAsPaid">Marquer comme payée immédiatement</Label>
                  </div>

                  {formData.markAsPaid && (
                    <div className="space-y-2">
                      <Label htmlFor="paidDate">Date de paiement</Label>
                      <Input
                        id="paidDate"
                        type="date"
                        value={formData.paidDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, paidDate: e.target.value }))}
                      />
                    </div>
                  )}
                </div>

                {/* Résumé */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Total à facturer:</span>
                    <span className="text-lg font-bold text-blue-600">
                      {formatCurrency(calculateSelectedTotal())}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button 
            onClick={handleConvert} 
            disabled={loading || Object.values(selectedServices).every(q => q === 0)}
          >
            {loading ? "Conversion..." : "Créer la facture partielle"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 