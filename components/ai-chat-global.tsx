"use client"

import { useSession } from "next-auth/react"
import { AIChatFloating } from "./ai-chat-floating"

export function AIChatGlobal() {
  const { data: session, status } = useSession()

  // Afficher le chat seulement si l'utilisateur est connecté
  if (status === "loading") return null
  if (!session?.user) return null

  return <AIChatFloating />
} 