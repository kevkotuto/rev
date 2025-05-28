import { z } from "zod"

// Auth schemas
export const signInSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
})

export const signUpSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
})

// Client schemas
export const clientSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  email: z.string().email("Email invalide").optional().or(z.literal("")).or(z.undefined()),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  company: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  photo: z.string().optional().or(z.literal("")),
}).transform((data) => ({
  ...data,
  email: data.email === "" ? undefined : data.email,
  phone: data.phone === "" ? undefined : data.phone,
  address: data.address === "" ? undefined : data.address,
  company: data.company === "" ? undefined : data.company,
  notes: data.notes === "" ? undefined : data.notes,
  photo: data.photo === "" ? undefined : data.photo,
}))

// Project schemas
export const projectSchema = z.object({
  name: z.string().min(1, "Le nom du projet est requis"),
  description: z.string().optional(),
  type: z.enum(["PERSONAL", "CLIENT", "DEVELOPMENT", "MAINTENANCE", "CONSULTING"]),
  amount: z.number().min(0, "Le montant doit être positif"),
  status: z.enum(["IN_PROGRESS", "COMPLETED", "ON_HOLD", "CANCELLED"]),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  clientId: z.string().nullable().optional(),
  logo: z.string().optional(),
})

// Service schemas
export const serviceSchema = z.object({
  description: z.string().min(1, "La description est requise"),
  amount: z.number().min(0, "Le montant doit être positif"),
  projectId: z.string().min(1, "Le projet est requis"),
})

// Provider schemas
export const providerSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  phone: z.string().optional(),
  role: z.string().optional(),
  amount: z.number().min(0, "Le montant doit être positif"),
  projectId: z.string().optional(),
})

// Invoice schemas
export const invoiceSchema = z.object({
  type: z.enum(["PROFORMA", "INVOICE"], {
    errorMap: () => ({ message: "Le type doit être 'PROFORMA' ou 'INVOICE'" })
  }),
  amount: z.number({
    required_error: "Le montant est requis",
    invalid_type_error: "Le montant doit être un nombre"
  }).min(0.01, "Le montant doit être supérieur à 0"),
  dueDate: z.string().optional().or(z.literal("")).transform(val => val === "" ? undefined : val),
  paidDate: z.string().optional().or(z.literal("")).transform(val => val === "" ? undefined : val),
  projectId: z.string().optional().or(z.literal("")).transform(val => val === "" ? undefined : val),
  notes: z.string().optional().or(z.literal("")).transform(val => val === "" ? undefined : val),
  clientName: z.string().min(1, "Le nom du client est requis").optional().or(z.literal("")).transform(val => val === "" ? undefined : val),
  clientEmail: z.string().email("Format d'email invalide").optional().or(z.literal("")).transform(val => val === "" ? undefined : val),
  clientAddress: z.string().optional().or(z.literal("")).transform(val => val === "" ? undefined : val),
  clientPhone: z.string().optional().or(z.literal("")).transform(val => val === "" ? undefined : val),
  generatePaymentLink: z.boolean().default(false),
}).refine((data) => {
  // Si aucun projet n'est sélectionné, le nom du client devient obligatoire
  if (!data.projectId && !data.clientName) {
    return false
  }
  return true
}, {
  message: "Le nom du client est requis si aucun projet n'est sélectionné",
  path: ["clientName"]
})

// Expense schemas
export const expenseSchema = z.object({
  description: z.string().min(1, "La description est requise"),
  amount: z.number().min(0, "Le montant doit être positif"),
  category: z.string().optional(),
  date: z.string().transform((str) => new Date(str)),
  notes: z.string().optional().or(z.literal("")).transform(val => val === "" ? undefined : val),
  type: z.enum(["GENERAL", "PROJECT", "SUBSCRIPTION"]),
  projectId: z.string().nullable().optional().or(z.literal("")).transform(val => val === "" || val === null ? null : val),
  // Champs pour les abonnements
  isSubscription: z.boolean().optional().default(false),
  subscriptionPeriod: z.enum(["MONTHLY", "YEARLY"]).optional(),
  nextRenewalDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  reminderDays: z.number().min(1).max(365).optional().default(30),
})

// User profile schemas
export const userProfileSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères").or(z.literal("")),
  companyName: z.string().optional(),
  companyLogo: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  currency: z.string().default("XOF"),
  smtpHost: z.string().optional(),
  smtpPort: z.number().optional(),
  smtpUser: z.string().optional(),
  smtpFrom: z.string().email("Email invalide").optional().or(z.literal("")),
  signature: z.string().optional(),
})

// Types
export type SignInInput = z.infer<typeof signInSchema>
export type SignUpInput = z.infer<typeof signUpSchema>
export type ClientInput = z.infer<typeof clientSchema>
export type ProjectInput = z.infer<typeof projectSchema>
export type ServiceInput = z.infer<typeof serviceSchema>
export type ProviderInput = z.infer<typeof providerSchema>
export type InvoiceInput = z.infer<typeof invoiceSchema>
export type ExpenseInput = z.infer<typeof expenseSchema>
export type UserProfileInput = z.infer<typeof userProfileSchema> 