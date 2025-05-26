"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CreditCard, Loader2, ExternalLink } from "lucide-react"
import { toast } from "sonner"

interface WavePaymentButtonProps {
  invoiceId: string
  amount: number
  description?: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  onSuccess?: (paymentUrl: string) => void
  onError?: (error: string) => void
  className?: string
  children?: React.ReactNode
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  disabled?: boolean
}

export function WavePaymentButton({
  invoiceId,
  amount,
  description,
  customerName,
  customerEmail,
  customerPhone,
  onSuccess,
  onError,
  className,
  children,
  variant = "default",
  size = "default",
  disabled = false
}: WavePaymentButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handlePayment = async () => {
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/wave/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          invoiceId,
          amount,
          description,
          customerName,
          customerEmail,
          customerPhone
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la création du lien de paiement')
      }

      if (data.success && data.paymentUrl) {
        // Rediriger vers Wave CI
        window.location.href = data.paymentUrl
        
        // Callback de succès
        onSuccess?.(data.paymentUrl)
        
        toast.success('Redirection vers Wave CI...')
      } else {
        throw new Error('Lien de paiement non généré')
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      console.error('Erreur paiement Wave:', error)
      
      toast.error(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <Button
      onClick={handlePayment}
      disabled={disabled || isLoading}
      variant={variant}
      size={size}
      className={className}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Génération du lien...
        </>
      ) : (
        <>
          {children || (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Payer {formatCurrency(amount)} avec Wave
              <ExternalLink className="w-4 h-4 ml-2" />
            </>
          )}
        </>
      )}
    </Button>
  )
}

// Composant simplifié pour les cas d'usage basiques
interface SimpleWaveButtonProps {
  invoiceId: string
  amount: number
  label?: string
  className?: string
}

export function SimpleWaveButton({ 
  invoiceId, 
  amount, 
  label,
  className 
}: SimpleWaveButtonProps) {
  return (
    <WavePaymentButton
      invoiceId={invoiceId}
      amount={amount}
      className={className}
    >
      <CreditCard className="w-4 h-4 mr-2" />
      {label || `Payer avec Wave`}
      <ExternalLink className="w-4 h-4 ml-2" />
    </WavePaymentButton>
  )
} 