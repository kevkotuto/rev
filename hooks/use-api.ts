import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

interface UseApiOptions {
  onSuccess?: (data: any) => void
  onError?: (error: Error) => void
  immediate?: boolean
}

interface UseApiReturn<T> {
  data: T | null
  loading: boolean
  error: Error | null
  execute: (url: string, options?: RequestInit) => Promise<T | null>
  refetch: () => Promise<T | null>
}

export function useApi<T = any>(
  initialUrl?: string,
  options: UseApiOptions = {}
): UseApiReturn<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [url, setUrl] = useState(initialUrl)

  const execute = useCallback(async (
    requestUrl: string,
    requestOptions?: RequestInit
  ): Promise<T | null> => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(requestUrl, {
        headers: {
          'Content-Type': 'application/json',
          ...requestOptions?.headers,
        },
        ...requestOptions,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      setData(result)
      options.onSuccess?.(result)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Une erreur est survenue')
      setError(error)
      options.onError?.(error)
      toast.error(error.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [options])

  const refetch = useCallback(() => {
    if (!url) return Promise.resolve(null)
    return execute(url)
  }, [url, execute])

  useEffect(() => {
    if (url && options.immediate !== false) {
      execute(url)
    }
  }, [url, execute, options.immediate])

  useEffect(() => {
    setUrl(initialUrl)
  }, [initialUrl])

  return {
    data,
    loading,
    error,
    execute,
    refetch,
  }
}

// Hook spécialisé pour les mutations (POST, PUT, DELETE)
export function useMutation<T = any>(options: UseApiOptions = {}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const mutate = useCallback(async (
    url: string,
    requestOptions?: RequestInit
  ): Promise<T | null> => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...requestOptions?.headers,
        },
        ...requestOptions,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      options.onSuccess?.(result)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Une erreur est survenue')
      setError(error)
      options.onError?.(error)
      toast.error(error.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [options])

  return {
    mutate,
    loading,
    error,
  }
} 