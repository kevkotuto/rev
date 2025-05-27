"use client"

import { Suspense } from "react"
import { PaymentErrorContent } from "./payment-error-content"

export default function PaymentErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-500"></div>
      </div>
    }>
      <PaymentErrorContent />
    </Suspense>
  )
} 