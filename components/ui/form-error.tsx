import { AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface FormErrorProps {
  message?: string | null
  className?: string
}

export function FormError({ message, className }: FormErrorProps) {
  if (!message) return null

  return (
    <div className={cn(
      "flex items-center gap-2 text-sm text-red-600 mt-1",
      className
    )}>
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

interface FormFieldProps {
  children: React.ReactNode
  error?: string | null
  className?: string
}

export function FormField({ children, error, className }: FormFieldProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {children}
      <FormError message={error} />
    </div>
  )
} 