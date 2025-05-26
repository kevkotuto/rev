import { format } from "date-fns"
import { fr } from "date-fns/locale"

export function formatCurrency(amount: number, currency: string = "FCFA"): string {
  if (currency === "FCFA") {
    return `${amount.toLocaleString("fr-FR")} FCFA`
  }
  
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency === "EUR" ? "EUR" : "USD",
  }).format(amount)
}

export function formatDate(date: Date | string, formatStr: string = "dd/MM/yyyy"): string {
  const dateObj = typeof date === "string" ? new Date(date) : date
  return format(dateObj, formatStr, { locale: fr })
}

export function formatDateTime(date: Date | string): string {
  return formatDate(date, "dd/MM/yyyy à HH:mm")
}

export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date
  const now = new Date()
  const diffInMs = now.getTime() - dateObj.getTime()
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
  const diffInHours = Math.floor(diffInMinutes / 60)
  const diffInDays = Math.floor(diffInHours / 24)

  if (diffInMinutes < 1) {
    return "À l'instant"
  } else if (diffInMinutes < 60) {
    return `Il y a ${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""}`
  } else if (diffInHours < 24) {
    return `Il y a ${diffInHours} heure${diffInHours > 1 ? "s" : ""}`
  } else if (diffInDays < 7) {
    return `Il y a ${diffInDays} jour${diffInDays > 1 ? "s" : ""}`
  } else {
    return formatDate(dateObj)
  }
}

export function generateInvoiceNumber(prefix: string = "INV"): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const timestamp = Date.now().toString().slice(-6)
  
  return `${prefix}-${year}${month}-${timestamp}`
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
} 