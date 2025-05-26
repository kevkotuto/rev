export const APP_NAME = "REV"
export const APP_DESCRIPTION = "Gestion d'activité freelance"

export const CURRENCIES = [
  { value: "FCFA", label: "FCFA (Franc CFA)" },
  { value: "EUR", label: "EUR (Euro)" },
  { value: "USD", label: "USD (Dollar)" },
] as const

export const PROJECT_STATUSES = [
  { value: "IN_PROGRESS", label: "En cours", color: "bg-blue-500" },
  { value: "COMPLETED", label: "Terminé", color: "bg-green-500" },
  { value: "ON_HOLD", label: "En attente", color: "bg-yellow-500" },
  { value: "CANCELLED", label: "Annulé", color: "bg-red-500" },
] as const

export const INVOICE_STATUSES = [
  { value: "PENDING", label: "En attente", color: "bg-yellow-500" },
  { value: "PAID", label: "Payée", color: "bg-green-500" },
  { value: "OVERDUE", label: "En retard", color: "bg-red-500" },
  { value: "CANCELLED", label: "Annulée", color: "bg-gray-500" },
] as const

export const INVOICE_TYPES = [
  { value: "PROFORMA", label: "Proforma" },
  { value: "INVOICE", label: "Facture" },
] as const

export const PROJECT_TYPES = [
  { value: "PERSONAL", label: "Personnel" },
  { value: "CLIENT", label: "Client" },
] as const

export const EXPENSE_TYPES = [
  { value: "GENERAL", label: "Général" },
  { value: "PROJECT", label: "Projet" },
] as const

export const EXPENSE_CATEGORIES = [
  "Matériel informatique",
  "Logiciels",
  "Formation",
  "Transport",
  "Hébergement",
  "Marketing",
  "Frais bancaires",
  "Assurance",
  "Autres",
] as const 