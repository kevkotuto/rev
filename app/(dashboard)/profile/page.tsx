"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { User, Mail, Building, MapPin, Phone, Key, CreditCard, Send, Zap } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface UserProfile {
  id: string
  name: string
  email: string
  companyName?: string
  address?: string
  phone?: string
  currency: string
  smtpHost?: string
  smtpPort?: number
  smtpUser?: string
  smtpFrom?: string
  waveApiKey?: string
  waveWebhookUrl?: string
  waveWebhookSecret?: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)
  const [testingWebhook, setTestingWebhook] = useState(false)
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false)
  const [isWebhookTestDialogOpen, setIsWebhookTestDialogOpen] = useState(false)
  const [testEmail, setTestEmail] = useState("")
  const [webhookTestResult, setWebhookTestResult] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    companyName: "",
    address: "",
    phone: "",
    currency: "XOF",
    smtpHost: "",
    smtpPort: "587",
    smtpUser: "",
    smtpPassword: "",
    smtpFrom: "",
    waveApiKey: "",
    waveWebhookUrl: "",
    waveWebhookSecret: ""
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile')
      if (response.ok) {
        const data = await response.json()
        setProfile(data)
        setFormData({
          name: data.name || "",
          email: data.email || "",
          companyName: data.companyName || "",
          address: data.address || "",
          phone: data.phone || "",
          currency: data.currency || "XOF",
          smtpHost: data.smtpHost || "",
          smtpPort: data.smtpPort?.toString() || "587",
          smtpUser: data.smtpUser || "",
          smtpPassword: "",
          smtpFrom: data.smtpFrom || "",
          waveApiKey: data.waveApiKey || "",
          waveWebhookUrl: data.waveWebhookUrl || "",
          waveWebhookSecret: data.waveWebhookSecret || ""
        })
      }
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error)
      toast.error('Erreur lors du chargement du profil')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const updateData = {
        ...formData,
        smtpPort: parseInt(formData.smtpPort) || 587,
        smtpPassword: formData.smtpPassword || undefined
      }

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        toast.success('Profil mis à jour avec succès')
        fetchProfile()
      } else {
        toast.error('Erreur lors de la mise à jour du profil')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la mise à jour du profil')
    } finally {
      setSaving(false)
    }
  }

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast.error('Veuillez saisir un email de test')
      return
    }

    setTestingEmail(true)
    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Email de test envoyé avec succès !')
        setIsTestDialogOpen(false)
        setTestEmail("")
      } else {
        toast.error(data.message || 'Erreur lors de l\'envoi de l\'email de test')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de l\'envoi de l\'email de test')
    } finally {
      setTestingEmail(false)
    }
  }

  const handleTestWebhook = async () => {
    if (!formData.waveApiKey) {
      toast.error('Veuillez d\'abord configurer votre clé API Wave')
      return
    }

    setTestingWebhook(true)
    setWebhookTestResult(null)
    
    try {
      const response = await fetch('/api/wave/test-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          waveApiKey: formData.waveApiKey,
          merchantName: formData.companyName || profile?.name || 'Test Merchant'
        })
      })

      const data = await response.json()

      if (response.ok) {
        setWebhookTestResult(data)
        
        // Mettre à jour automatiquement le secret webhook si reçu
        if (data.webhookSecret) {
          setFormData(prev => ({
            ...prev,
            waveWebhookSecret: data.webhookSecret
          }))
          toast.success('Secret webhook récupéré et configuré automatiquement !')
        } else {
          toast.success('Test webhook envoyé avec succès !')
        }
      } else {
        toast.error(data.message || 'Erreur lors du test webhook')
        setWebhookTestResult({ error: data.message || 'Erreur inconnue' })
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors du test webhook')
      setWebhookTestResult({ error: 'Erreur de connexion' })
    } finally {
      setTestingWebhook(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profil</h1>
        <p className="text-muted-foreground">
          Gérez vos informations personnelles et configurations
        </p>
      </div>

      <div className="grid gap-6">
        {/* Informations personnelles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              Informations personnelles
            </CardTitle>
            <CardDescription>
              Vos informations de base et coordonnées
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom complet *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Votre nom complet"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="votre@email.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Nom de l'entreprise</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                  placeholder="Nom de votre entreprise"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="+33 1 23 45 67 89"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Adresse</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                placeholder="Votre adresse complète"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Devise par défaut</Label>
              <select
                id="currency"
                aria-label="Devise par défaut"
                value={formData.currency}
                onChange={(e) => setFormData({...formData, currency: e.target.value})}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="XOF">XOF (Franc CFA)</option>
                <option value="EUR">EUR (Euro)</option>
                <option value="USD">USD (Dollar)</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Configuration SMTP */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mail className="mr-2 h-5 w-5" />
              Configuration SMTP
            </CardTitle>
            <CardDescription>
              Configurez votre serveur SMTP pour l'envoi d'emails
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtpHost">Serveur SMTP</Label>
                <Input
                  id="smtpHost"
                  value={formData.smtpHost}
                  onChange={(e) => setFormData({...formData, smtpHost: e.target.value})}
                  placeholder="smtp.gmail.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpPort">Port SMTP</Label>
                <Input
                  id="smtpPort"
                  type="number"
                  value={formData.smtpPort}
                  onChange={(e) => setFormData({...formData, smtpPort: e.target.value})}
                  placeholder="587"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtpUser">Nom d'utilisateur SMTP</Label>
                <Input
                  id="smtpUser"
                  value={formData.smtpUser}
                  onChange={(e) => setFormData({...formData, smtpUser: e.target.value})}
                  placeholder="votre@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpPassword">Mot de passe SMTP</Label>
                <Input
                  id="smtpPassword"
                  type="password"
                  value={formData.smtpPassword}
                  onChange={(e) => setFormData({...formData, smtpPassword: e.target.value})}
                  placeholder="Laissez vide pour ne pas changer"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtpFrom">Email expéditeur</Label>
              <Input
                id="smtpFrom"
                value={formData.smtpFrom}
                onChange={(e) => setFormData({...formData, smtpFrom: e.target.value})}
                placeholder="noreply@votre-entreprise.com"
              />
            </div>

            {/* Bouton de test */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Test de configuration</h4>
                  <p className="text-sm text-muted-foreground">
                    Envoyez un email de test pour vérifier votre configuration SMTP
                  </p>
                </div>
                <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Send className="w-4 h-4 mr-2" />
                      Tester
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Test de configuration SMTP</DialogTitle>
                      <DialogDescription>
                        Saisissez un email pour recevoir un message de test
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="testEmail">Email de test</Label>
                        <Input
                          id="testEmail"
                          type="email"
                          value={testEmail}
                          onChange={(e) => setTestEmail(e.target.value)}
                          placeholder="test@exemple.com"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsTestDialogOpen(false)}>
                        Annuler
                      </Button>
                      <Button onClick={handleTestEmail} disabled={testingEmail || !testEmail}>
                        {testingEmail ? 'Envoi...' : 'Envoyer le test'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuration Wave CI */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="mr-2 h-5 w-5" />
              Configuration Wave CI
            </CardTitle>
            <CardDescription>
              Configurez votre intégration Wave CI pour les paiements
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="waveApiKey">Clé API Wave</Label>
                  <Input
                    id="waveApiKey"
                    type="password"
                    value={formData.waveApiKey}
                    onChange={(e) => setFormData({...formData, waveApiKey: e.target.value})}
                    placeholder="Votre clé API Wave"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="waveWebhookSecret">Secret Webhook Wave</Label>
                  <Input
                    id="waveWebhookSecret"
                    type="password"
                    value={formData.waveWebhookSecret}
                    onChange={(e) => setFormData({...formData, waveWebhookSecret: e.target.value})}
                    placeholder="Secret fourni par Wave après configuration"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>URL Webhook Wave (Générée automatiquement)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/wave` : '/api/webhooks/wave'}
                    readOnly
                    className="bg-gray-50"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/wave`)
                        toast.success('URL copiée dans le presse-papiers')
                      }
                    }}
                  >
                    Copier
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Copiez cette URL et configurez-la dans votre tableau de bord Wave CI comme URL de webhook
                </p>
              </div>

              {/* Bouton de test webhook */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Test de webhook Wave</h4>
                    <p className="text-sm text-muted-foreground">
                      Testez votre configuration webhook et récupérez automatiquement le secret
                    </p>
                  </div>
                  <Dialog open={isWebhookTestDialogOpen} onOpenChange={setIsWebhookTestDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" disabled={!formData.waveApiKey}>
                        <Zap className="w-4 h-4 mr-2" />
                        Test Webhook
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Test de webhook Wave CI</DialogTitle>
                        <DialogDescription>
                          Ce test va envoyer un événement de test à votre webhook et récupérer automatiquement le secret de signature
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h4 className="font-medium text-blue-800 mb-2">Comment ça fonctionne :</h4>
                          <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                            <li>Un événement de test est envoyé via l'API Wave</li>
                            <li>Wave envoie le webhook à votre URL configurée</li>
                            <li>Le système capture automatiquement le secret de signature</li>
                            <li>Le secret est enregistré dans votre profil</li>
                            <li>Les futurs webhooks seront correctement validés</li>
                          </ol>
                        </div>

                        {webhookTestResult && (
                          <div className={`p-4 rounded-lg border ${webhookTestResult.error ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                            <h4 className={`font-medium mb-2 ${webhookTestResult.error ? 'text-red-800' : 'text-green-800'}`}>
                              {webhookTestResult.error ? 'Erreur' : 'Succès'}
                            </h4>
                            {webhookTestResult.error ? (
                              <p className="text-sm text-red-700">{webhookTestResult.error}</p>
                            ) : (
                              <div className="space-y-2 text-sm text-green-700">
                                <p>✅ Webhook test envoyé avec succès</p>
                                {webhookTestResult.webhookSecret && (
                                  <p>✅ Secret webhook récupéré et configuré</p>
                                )}
                                {webhookTestResult.testEventId && (
                                  <p>📝 ID de l'événement test: {webhookTestResult.testEventId}</p>
                                )}
                                <p>🔄 Votre webhook est maintenant configuré pour recevoir les paiements</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsWebhookTestDialogOpen(false)}>
                          Fermer
                        </Button>
                        <Button onClick={handleTestWebhook} disabled={testingWebhook || !formData.waveApiKey}>
                          {testingWebhook ? 'Test en cours...' : 'Lancer le test'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">Configuration Wave CI</h4>
              <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                <li>Connectez-vous à votre tableau de bord Wave CI</li>
                <li>Allez dans les paramètres de votre compte</li>
                <li>Ajoutez l'URL webhook ci-dessus</li>
                <li>Récupérez votre clé API et saisissez-la dans le premier champ</li>
                <li><strong>Utilisez le bouton "Test Webhook"</strong> pour configurer automatiquement le secret</li>
                <li>Sauvegardez vos paramètres ici</li>
                <li>Testez un paiement pour vérifier la configuration</li>
              </ol>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
              <h4 className="font-medium text-green-800 mb-2">✅ Configuration automatique</h4>
              <p className="text-sm text-green-700">
                Le bouton "Test Webhook" configure automatiquement le secret de signature. 
                Plus besoin de le saisir manuellement !
              </p>
            </div>

          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
          </Button>
        </div>
      </div>
    </div>
  )
} 