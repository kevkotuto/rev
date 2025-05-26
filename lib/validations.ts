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
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
  photo: z.string().optional(),
})

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
  type: z.enum(["PROFORMA", "INVOICE"]),
  amount: z.number().min(0, "Le montant doit être positif"),
  dueDate: z.string().datetime().nullable().optional(),
  projectId: z.string().nullable().optional(),
  notes: z.string().optional(),
  clientName: z.string().optional(),
  clientEmail: z.string().email().optional(),
  clientAddress: z.string().optional(),
  clientPhone: z.string().optional(),
})

// Expense schemas
export const expenseSchema = z.object({
  description: z.string().min(1, "La description est requise"),
  amount: z.number().min(0, "Le montant doit être positif"),
  category: z.string().optional(),
  date: z.date(),
  notes: z.string().optional(),
  type: z.enum(["GENERAL", "PROJECT"]),
  projectId: z.string().optional(),
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