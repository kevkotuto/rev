"use client"

import React, { useState } from "react"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  CreditCard, 
  Banknote, 
  Building2, 
  DollarSign, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2
} from "lucide-react"
import { toast } from "sonner"

interface Provider {
  id: string
  name: string
  email?: string
  phone?: string
  bankName?: string
  bankAccount?: string
  bankIban?: string
}

interface PaymentDialogProps {
  isOpen: boolean
  onClose: () => void
  provider: Provider
  projectId?: string
  projectProviderId?: string
  defaultAmount?: number
  onPaymentSuccess?: () => void
  title?: string
  description?: string
}

export default function ProviderPaymentDialog({
  isOpen,
  onClose,
  provider,
  projectId,
  projectProviderId,
  defaultAmount,
  onPaymentSuccess,
  title = "Payer le prestataire",
  description = "Choisissez votre méthode de paiement"
}: PaymentDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState<'WAVE' | 'MANUAL'>('WAVE')
  const [amount, setAmount] = useState(defaultAmount?.toString() || '')
  const [notes, setNotes] = useState('')
  const [markAsProjectPaid, setMarkAsProjectPaid] = useState(!!projectProviderId)
  const [isProcessing, setIsProcessing] = useState(false)

  const canUseWave = !!provider.phone
  const hasValidAmount = parseFloat(amount) > 0

  const handleWavePayment = async () => {
    if (!hasValidAmount || !canUseWave) return

    setIsProcessing(true)
    try {
      const response = await fetch(`/api/providers/${provider.id}/payout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          projectProviderId,
          notes: notes || undefined
        })
      })

      const data = await response.json()

      if (response.ok) {
        if (data.waveResponse?.status === 'succeeded') {
          toast.success('Paiement Wave effectué avec succès !')
          handleSuccess()
        } else if (data.waveResponse?.status === 'processing') {
          toast.success('Paiement Wave initié, en cours de traitement...')
          handleSuccess()
        } else {
          toast.error('Erreur lors du paiement Wave')
        }
      } else {
        toast.error(data.message || 'Erreur lors du paiement Wave')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors du paiement Wave')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleManualPayment = async () => {
    if (!hasValidAmount) return

    setIsProcessing(true)
    try {
      if (projectProviderId && markAsProjectPaid) {
        // Marquer comme payé dans le projet
        const response = await fetch(`/api/project-providers/${projectProviderId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isPaid: true,
            paymentMethod: 'CASH',
            paidAt: new Date().toISOString()
          })
        })

        if (response.ok) {
          toast.success('Prestataire marqué comme payé avec succès !')
          handleSuccess()
        } else {
          const data = await response.json()
          toast.error(data.message || 'Erreur lors du marquage')
        }
      } else {
        // Créer une dépense manuelle
        const response = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: `Paiement prestataire - ${provider.name}`,
            amount: parseFloat(amount),
            category: 'PROVIDER_PAYMENT',
            type: projectId ? 'PROJECT' : 'GENERAL',
            date: new Date().toISOString(),
            notes: notes || `Paiement manuel à ${provider.name}`,
            projectId: projectId || null
          })
        })

        if (response.ok) {
          toast.success('Paiement enregistré comme dépense !')
          handleSuccess()
        } else {
          const data = await response.json()
          toast.error(data.message || 'Erreur lors de l\'enregistrement')
        }
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors du paiement manuel')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSuccess = () => {
    onPaymentSuccess?.()
    onClose()
    setAmount('')
    setNotes('')
    setMarkAsProjectPaid(!!projectProviderId)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informations prestataire */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Bénéficiaire</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{provider.name}</span>
                {canUseWave ? (
                  <Badge className="bg-green-100 text-green-800">
                    <CreditCard className="w-3 h-3 mr-1" />
                    Wave disponible
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Téléphone requis
                  </Badge>
                )}
              </div>
              {provider.email && (
                <p className="text-sm text-muted-foreground">{provider.email}</p>
              )}
              {provider.phone && (
                <p className="text-sm text-muted-foreground">{provider.phone}</p>
              )}
            </CardContent>
          </Card>

          {/* Montant */}
          <div className="space-y-2">
            <Label htmlFor="amount">Montant à payer (XOF) *</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Entrez le montant"
              min="1"
              step="1"
            />
            {hasValidAmount && (
              <p className="text-sm text-muted-foreground">
                Montant : {formatCurrency(parseFloat(amount))}
              </p>
            )}
          </div>

          {/* Méthode de paiement */}
          <div className="space-y-3">
            <Label>Méthode de paiement</Label>
            <div className="grid gap-3">
              {/* Wave Payment */}
              <Card 
                className={`cursor-pointer transition-colors ${
                  paymentMethod === 'WAVE' 
                    ? 'ring-2 ring-blue-500 bg-blue-50' 
                    : canUseWave ? 'hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'
                }`}
                onClick={() => canUseWave && setPaymentMethod('WAVE')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">Paiement Wave</h4>
                        <p className="text-sm text-muted-foreground">
                          {canUseWave ? `Envoi direct sur ${provider.phone}` : 'Numéro de téléphone requis'}
                        </p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      checked={paymentMethod === 'WAVE'}
                      disabled={!canUseWave}
                      onChange={() => canUseWave && setPaymentMethod('WAVE')}
                      className="w-4 h-4"
                      title="Sélectionner le paiement Wave"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Manual Payment */}
              <Card 
                className={`cursor-pointer transition-colors ${
                  paymentMethod === 'MANUAL' 
                    ? 'ring-2 ring-green-500 bg-green-50' 
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => setPaymentMethod('MANUAL')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <Banknote className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">Paiement manuel</h4>
                        <p className="text-sm text-muted-foreground">
                          Espèces, virement, ou autre méthode
                        </p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      checked={paymentMethod === 'MANUAL'}
                      onChange={() => setPaymentMethod('MANUAL')}
                      className="w-4 h-4"
                      title="Sélectionner le paiement manuel"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Options pour paiement manuel dans un projet */}
          {paymentMethod === 'MANUAL' && projectProviderId && (
            <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
              <Checkbox
                id="markAsProjectPaid"
                checked={markAsProjectPaid}
                onCheckedChange={(checked) => setMarkAsProjectPaid(checked as boolean)}
              />
              <Label htmlFor="markAsProjectPaid" className="text-sm">
                Marquer comme payé dans le projet
              </Label>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Informations complémentaires sur le paiement"
              rows={3}
            />
          </div>

          {/* Informations bancaires si disponibles */}
          {provider.bankName && (
            <Card className="bg-gray-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Informations bancaires
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p><span className="font-medium">Banque :</span> {provider.bankName}</p>
                {provider.bankAccount && (
                  <p><span className="font-medium">Compte :</span> {provider.bankAccount}</p>
                )}
                {provider.bankIban && (
                  <p><span className="font-medium">IBAN :</span> {provider.bankIban}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Annuler
          </Button>
          {paymentMethod === 'WAVE' ? (
            <Button 
              onClick={handleWavePayment}
              disabled={!hasValidAmount || !canUseWave || isProcessing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Traitement...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Payer via Wave
                </>
              )}
            </Button>
          ) : (
            <Button 
              onClick={handleManualPayment}
              disabled={!hasValidAmount || isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirmer le paiement
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 