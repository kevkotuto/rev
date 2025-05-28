import { useState, useCallback } from 'react'
import { z } from 'zod'
import { toast } from 'sonner'

interface ValidationError {
  field: string
  message: string
}

interface UseFormValidationOptions<T> {
  schema: z.ZodSchema<T>
  onSuccess?: (data: T) => void | Promise<void>
  showToastOnError?: boolean
}

export function useFormValidation<T>({
  schema,
  onSuccess,
  showToastOnError = true
}: UseFormValidationOptions<T>) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isValidating, setIsValidating] = useState(false)

  const validate = useCallback(async (data: unknown): Promise<{ success: boolean; data?: T; errors?: ValidationError[] }> => {
    setIsValidating(true)
    setErrors({})

    try {
      const validatedData = schema.parse(data)
      setIsValidating(false)
      
      if (onSuccess) {
        await onSuccess(validatedData)
      }
      
      return { success: true, data: validatedData }
    } catch (error) {
      setIsValidating(false)
      
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {}
        const validationErrors: ValidationError[] = []
        
        error.errors.forEach((err) => {
          const field = err.path.join('.')
          const message = err.message
          fieldErrors[field] = message
          validationErrors.push({ field, message })
        })
        
        setErrors(fieldErrors)
        
        if (showToastOnError) {
          const firstError = validationErrors[0]
          toast.error(`Erreur de validation: ${firstError.message}`)
        }
        
        return { success: false, errors: validationErrors }
      }
      
      // Erreur inattendue
      const errorMessage = error instanceof Error ? error.message : 'Erreur de validation inattendue'
      if (showToastOnError) {
        toast.error(errorMessage)
      }
      
      return { success: false, errors: [{ field: 'general', message: errorMessage }] }
    }
  }, [schema, onSuccess, showToastOnError])

  const validateField = useCallback((fieldName: string, value: unknown): string | null => {
    try {
      // Créer un objet partiel pour valider un seul champ
      const partialData = { [fieldName]: value }
      
      // Utiliser safeParse pour éviter les erreurs
      const result = schema.safeParse(partialData)
      
      if (result.success) {
        // Supprimer l'erreur du champ s'il est maintenant valide
        setErrors(prev => {
          const newErrors = { ...prev }
          delete newErrors[fieldName]
          return newErrors
        })
        return null
      } else {
        // Chercher l'erreur spécifique au champ
        const fieldError = result.error.errors.find(err => err.path.includes(fieldName))
        if (fieldError) {
          const errorMessage = fieldError.message
          setErrors(prev => ({ ...prev, [fieldName]: errorMessage }))
          return errorMessage
        }
      }
      
      return null
    } catch (error) {
      return null
    }
  }, [schema])

  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])

  const clearFieldError = useCallback((fieldName: string) => {
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[fieldName]
      return newErrors
    })
  }, [])

  const hasErrors = Object.keys(errors).length > 0
  const getFieldError = useCallback((fieldName: string) => errors[fieldName] || null, [errors])

  return {
    validate,
    validateField,
    clearErrors,
    clearFieldError,
    errors,
    hasErrors,
    getFieldError,
    isValidating
  }
}

// Hook spécialisé pour les formulaires avec état
export function useFormWithValidation<T>(
  initialData: T,
  schema: z.ZodSchema<T>,
  onSubmit?: (data: T) => void | Promise<void>
) {
  const [formData, setFormData] = useState<T>(initialData)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { validate, validateField, errors, hasErrors, getFieldError, clearErrors } = useFormValidation({
    schema,
    onSuccess: async (validatedData) => {
      if (onSubmit) {
        setIsSubmitting(true)
        try {
          await onSubmit(validatedData)
        } finally {
          setIsSubmitting(false)
        }
      }
    }
  })

  const updateField = useCallback((fieldName: keyof T, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }))
    // Validation en temps réel optionnelle
    validateField(fieldName as string, value)
  }, [validateField])

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault()
    }
    return await validate(formData)
  }, [validate, formData])

  const resetForm = useCallback((newData?: Partial<T>) => {
    setFormData(prev => ({ ...initialData, ...newData }))
    clearErrors()
  }, [initialData, clearErrors])

  return {
    formData,
    setFormData,
    updateField,
    handleSubmit,
    resetForm,
    errors,
    hasErrors,
    getFieldError,
    isSubmitting
  }
} 