"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft,
  CreditCard,
  User,
  Phone,
  Calendar,
  Hash,
  Receipt,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  FileText,
  ExternalLink,
  Copy,
  Download,
  AlertTriangle,
  RotateCcw
} from "lucide-react"
import { motion } from "motion/react"
import { toast } from "sonner"

interface WavePaymentDetails {
  wave: {
    id: string
    currency: string
    receive_amount: string
    fee: string
    mobile: string
    name: string
    national_id?: string
    client_reference?: string
    payment_reason?: string
    status: 'processing' | 'failed' | 'succeeded' | 'reversed'
    timestamp: string
    aggregated_merchant_id?: string
  }
  local: {
    id: string
    description: string
    date: string
    notes?: string
    project?: {
      id: string
      name: string
    }
  } | null
}

export default function WavePaymentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const paymentId = params.id as string

  const [paymentDetails, setPaymentDetails] = useState<WavePaymentDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isReversing, setIsReversing] = useState(false)

  useEffect(() => {
    if (paymentId) {
      fetchPaymentDetails()
    }
  }, [paymentId])

  const fetchPaymentDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/wave/payout/${paymentId}`)
      
      if (response.ok) {
        const data = await response.json()
        setPaymentDetails(data)
      } else {
        const errorData = await response.json()
        setError(errorData.message || "Erreur lors de la récupération du paiement")
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error)
      setError("Erreur lors de la récupération des détails du paiement")
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copié dans le presse-papiers`)
  }

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(numAmount)
  }

  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const handleReversePayment = async () => {
    if (!paymentDetails) return

    const confirmMessage = `Êtes-vous sûr de vouloir annuler ce paiement de ${formatCurrency(paymentDetails.wave.receive_amount)} ?\n\nCette action :\n- Annulera le paiement et remboursera les frais\n- Ne peut pas être annulée\n- Créera une dépense d'annulation dans votre comptabilité`

    if (!confirm(confirmMessage)) return

    try {
      setIsReversing(true)
      
      const response = await fetch(`/api/wave/payout/${paymentId}/reverse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (response.ok) {
        if (data.status === 'already_reversed') {
          toast.info('Ce paiement a déjà été annulé')
        } else {
          toast.success('Paiement annulé avec succès ! Le remboursement est en cours.')
        }
        
        // Recharger les détails pour voir le nouveau statut
        fetchPaymentDetails()
      } else {
        toast.error(data.message || 'Erreur lors de l\'annulation du paiement')
        if (data.details) {
          toast.error(data.details)
        }
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de l\'annulation du paiement')
    } finally {
      setIsReversing(false)
    }
  }

  const canBeReversed = (paymentDetails: WavePaymentDetails) => {
    if (!paymentDetails) return false
    
    const { wave } = paymentDetails
    
    // Vérifier le statut
    if (wave.status !== 'succeeded') return false
    
    // Vérifier le délai de 3 jours
    const paymentDate = new Date(wave.timestamp)
    const now = new Date()
    const daysDiff = (now.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24)
    
    return daysDiff <= 3
  }

  const getRemainingTime = (timestamp: string) => {
    const paymentDate = new Date(timestamp)
    const now = new Date()
    const hoursRemaining = 72 - ((now.getTime() - paymentDate.getTime()) / (1000 * 60 * 60))
    
    if (hoursRemaining <= 0) return "Délai expiré"
    
    const days = Math.floor(hoursRemaining / 24)
    const hours = Math.floor(hoursRemaining % 24)
    
    return `${days}j ${hours}h restantes`
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'succeeded':
        return {
          icon: CheckCircle,
          label: 'Réussi',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          description: 'Le paiement a été traité avec succès'
        }
      case 'processing':
        return {
          icon: Clock,
          label: 'En cours',
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          description: 'Le paiement est en cours de traitement'
        }
      case 'failed':
        return {
          icon: XCircle,
          label: 'Échoué',
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          description: 'Le paiement a échoué'
        }
      case 'reversed':
        return {
          icon: RotateCcw,
          label: 'Annulé',
          color: 'text-purple-600',
          bgColor: 'bg-purple-100',
          description: 'Le paiement a été annulé et remboursé'
        }
      default:
        return {
          icon: Clock,
          label: 'Inconnu',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          description: 'Statut inconnu'
        }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-red-600">Erreur</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => router.push("/transactions")} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux transactions
        </Button>
      </div>
    )
  }

  if (!paymentDetails) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">Paiement non trouvé</h3>
        <p className="text-muted-foreground mb-4">Le paiement demandé n'existe pas ou n'est pas accessible.</p>
        <Button onClick={() => router.push("/transactions")} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux transactions
        </Button>
      </div>
    )
  }

  const { wave, local } = paymentDetails
  const statusInfo = getStatusInfo(wave.status)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push("/transactions")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Détail du paiement Wave</h1>
            <p className="text-muted-foreground">
              ID: {wave.id} • {formatDateTime(wave.timestamp)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => copyToClipboard(wave.id, "ID du paiement")}
          >
            <Copy className="w-4 h-4 mr-2" />
            Copier ID
          </Button>
        </div>
      </div>

      {/* Statut du paiement */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${statusInfo.bgColor}`}>
                  <statusInfo.icon className={`h-6 w-6 ${statusInfo.color}`} />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Paiement {statusInfo.label}</h3>
                  <p className="text-muted-foreground">{statusInfo.description}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-green-600">
                  {formatCurrency(wave.receive_amount)}
                </div>
                <p className="text-sm text-muted-foreground">
                  Frais: {formatCurrency(wave.fee)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Informations du destinataire */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Destinataire
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Nom</span>
                <span className="font-medium">{wave.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Téléphone</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{wave.mobile}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(wave.mobile, "Numéro de téléphone")}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              {wave.national_id && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">ID National</span>
                  <span className="font-medium">{wave.national_id}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Détails du paiement */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Détails du paiement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Devise</span>
                <Badge variant="outline">{wave.currency}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Montant brut</span>
                <span className="font-medium">{formatCurrency(wave.receive_amount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Frais</span>
                <span className="font-medium text-red-600">{formatCurrency(wave.fee)}</span>
              </div>
              <div className="border-t pt-4">
                <div className="flex items-center justify-between font-semibold">
                  <span>Total envoyé</span>
                  <span>{formatCurrency(parseFloat(wave.receive_amount) + parseFloat(wave.fee))}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Informations de transaction */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Informations de transaction
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <span className="text-muted-foreground">ID Transaction</span>
                <div className="flex items-center gap-2">
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                    {wave.id}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(wave.id, "ID de transaction")}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              
              {wave.client_reference && (
                <div className="space-y-2">
                  <span className="text-muted-foreground">Référence client</span>
                  <div className="flex items-center gap-2">
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                      {wave.client_reference}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(wave.client_reference!, "Référence client")}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <span className="text-muted-foreground">Date et heure</span>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{formatDateTime(wave.timestamp)}</span>
                </div>
              </div>

              {wave.payment_reason && (
                <div className="space-y-2">
                  <span className="text-muted-foreground">Motif du paiement</span>
                  <p className="text-sm bg-gray-50 p-2 rounded">{wave.payment_reason}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Informations locales */}
        {local && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Informations REV
                </CardTitle>
                <CardDescription>
                  Données enregistrées dans votre système
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <span className="text-muted-foreground">Description</span>
                  <p className="font-medium">{local.description}</p>
                </div>
                
                <div className="space-y-2">
                  <span className="text-muted-foreground">Date d'enregistrement</span>
                  <p className="font-medium">{new Date(local.date).toLocaleDateString('fr-FR')}</p>
                </div>

                {local.project && (
                  <div className="space-y-2">
                    <span className="text-muted-foreground">Projet associé</span>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-100 text-blue-800">
                        {local.project.name}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/projects/${local.project!.id}`)}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}

                {local.notes && (
                  <div className="space-y-2">
                    <span className="text-muted-foreground">Notes</span>
                    <p className="text-sm bg-gray-50 p-2 rounded whitespace-pre-wrap">
                      {local.notes}
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/expenses/${local.id}`)}
                    className="w-full"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Voir la dépense associée
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Annulation du paiement - Section spéciale */}
      {paymentDetails && paymentDetails.wave.status === 'succeeded' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className={`${canBeReversed(paymentDetails) ? 'border-orange-200 bg-orange-50' : 'border-red-200 bg-red-50'}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                Annulation du paiement
              </CardTitle>
              <CardDescription>
                {canBeReversed(paymentDetails) 
                  ? "Vous pouvez annuler ce paiement dans les 3 jours suivant sa création"
                  : "Le délai d'annulation de 3 jours est dépassé"
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Délai d'annulation</span>
                <Badge 
                  variant={canBeReversed(paymentDetails) ? "default" : "destructive"}
                  className={canBeReversed(paymentDetails) ? "bg-orange-100 text-orange-800" : ""}
                >
                  {getRemainingTime(paymentDetails.wave.timestamp)}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <span className="text-muted-foreground">Montant qui sera remboursé</span>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm">Montant principal</span>
                    <span className="font-medium">{formatCurrency(paymentDetails.wave.receive_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Frais Wave</span>
                    <span className="font-medium">{formatCurrency(paymentDetails.wave.fee)}</span>
                  </div>
                  <div className="border-t pt-1 flex justify-between font-semibold">
                    <span>Total remboursé</span>
                    <span className="text-green-600">
                      {formatCurrency(parseFloat(paymentDetails.wave.receive_amount) + parseFloat(paymentDetails.wave.fee))}
                    </span>
                  </div>
                </div>
              </div>

              {canBeReversed(paymentDetails) ? (
                <div className="pt-4 border-t">
                  <Button
                    variant="destructive"
                    onClick={handleReversePayment}
                    disabled={isReversing}
                    className="w-full"
                  >
                    {isReversing ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        Annulation en cours...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Annuler ce paiement
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Cette action est irréversible et créera une dépense d'annulation
                  </p>
                </div>
              ) : (
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-medium">Annulation impossible</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Les paiements ne peuvent être annulés que dans les 72 heures suivant leur création
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Message pour les paiements déjà annulés */}
      {paymentDetails && paymentDetails.wave.status === 'reversed' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-purple-100">
                  <RotateCcw className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-purple-600">Paiement Annulé</h3>
                  <p className="text-muted-foreground">
                    Ce paiement a été annulé et le montant total de {formatCurrency(parseFloat(paymentDetails.wave.receive_amount) + parseFloat(paymentDetails.wave.fee))} a été remboursé.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button
                variant="outline"
                onClick={() => router.push("/transactions")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour aux transactions
              </Button>
              
              <Button
                variant="outline"
                onClick={() => copyToClipboard(JSON.stringify(wave, null, 2), "Données du paiement")}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copier les données
              </Button>

              {local?.project && (
                <Button
                  variant="outline"
                  onClick={() => router.push(`/projects/${local.project!.id}`)}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Voir le projet
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
} 