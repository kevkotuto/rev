"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function AITestDebug() {
  const [message, setMessage] = useState("")
  const [response, setResponse] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const testAPI = async () => {
    setLoading(true)
    setError("")
    setResponse("")

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message || "Bonjour, peux-tu me dire si tu fonctionnes correctement ?",
          history: []
        })
      })

      const data = await res.json()
      
      if (!res.ok) {
        setError(`Erreur ${res.status}: ${data.message || data.error}`)
      } else {
        setResponse(data.message)
      }
    } catch (err) {
      setError(`Erreur réseau: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const testCreateProject = async () => {
    setLoading(true)
    setError("")
    setResponse("")

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: "Crée-moi un projet appelé 'beautelic' de type développement web avec un montant de 500000 XOF",
          history: []
        })
      })

      const data = await res.json()
      
      if (!res.ok) {
        setError(`Erreur ${res.status}: ${data.message || data.error}`)
      } else {
        setResponse(data.message)
      }
    } catch (err) {
      setError(`Erreur réseau: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const testCreateTasks = async () => {
    setLoading(true)
    setError("")
    setResponse("")

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: "Crée-moi les tâches pour le projet beautelic : installation de Next.js, création des pages, publication sur o2switch et connexion aux APIs",
          history: []
        })
      })

      const data = await res.json()
      
      if (!res.ok) {
        setError(`Erreur ${res.status}: ${data.message || data.error}`)
      } else {
        setResponse(data.message)
      }
    } catch (err) {
      setError(`Erreur réseau: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔧 Test Debug IA
          <Badge variant={loading ? "secondary" : "default"}>
            {loading ? "En cours..." : "Prêt"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message de test personnalisé..."
            className="flex-1"
          />
          <Button onClick={testAPI} disabled={loading}>
            Test API
          </Button>
        </div>

        <div className="flex gap-2">
          <Button onClick={testCreateProject} disabled={loading} variant="outline">
            Test Créer Projet
          </Button>
          <Button onClick={testCreateTasks} disabled={loading} variant="outline">
            Test Créer Tâches
          </Button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-semibold text-red-800">Erreur :</h4>
            <pre className="text-sm text-red-700 mt-2 whitespace-pre-wrap">{error}</pre>
          </div>
        )}

        {response && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-semibold text-green-800">Réponse :</h4>
            <pre className="text-sm text-green-700 mt-2 whitespace-pre-wrap">{response}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 