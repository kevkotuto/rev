import { toast } from "sonner"

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export async function fetcher<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new ApiError(
      errorData.message || "Une erreur est survenue",
      response.status,
      response.statusText
    )
  }

  return response.json()
}

export async function apiRequest<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    return await fetcher<T>(url, options)
  } catch (error) {
    if (error instanceof ApiError) {
      toast.error(error.message)
    } else {
      toast.error("Une erreur inattendue est survenue")
    }
    throw error
  }
}

// Utilitaires pour les différentes méthodes HTTP
export const api = {
  get: <T>(url: string) => apiRequest<T>(url),
  
  post: <T>(url: string, data: any) =>
    apiRequest<T>(url, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  
  put: <T>(url: string, data: any) =>
    apiRequest<T>(url, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  
  patch: <T>(url: string, data: any) =>
    apiRequest<T>(url, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  
  delete: <T>(url: string) =>
    apiRequest<T>(url, {
      method: "DELETE",
    }),
} 