"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Building2, 
  Upload, 
  X, 
  Save,
  MapPin,
  Phone,
  Mail,
  Globe,
  CreditCard,
  FileText
} from "lucide-react"
import { motion } from "motion/react"
import { toast } from "sonner"

interface CompanySettings {
  id?: string
  name: string
  description?: string
  logo?: string
  address: string
  city: string
  postalCode?: string
  country: string
  phone: string
  email: string
  website?: string
  rccm?: string
  nif?: string
  bankName?: string
  bankAccount?: string
  bankIban?: string
  bankSwift?: string
  legalForm?: string
  capital?: string
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [settings, setSettings] = useState<CompanySettings>({
    name: "",
    description: "",
    logo: "",
    address: "",
    city: "",
    postalCode: "",
    country: "Côte d'Ivoire",
    phone: "",
    email: "",
    website: "",
    rccm: "",
    nif: "",
    bankName: "",
    bankAccount: "",
    bankIban: "",
    bankSwift: "",
    legalForm: "",
    capital: ""
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings/company')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error)
      toast.error('Erreur lors du chargement des paramètres')
    } finally {
      setLoading(false)
    }
  }

  const validateField = (field: string, value: string) => {
    const newErrors = { ...errors }
    
    switch (field) {
      case 'name':
        if (!value.trim()) {
          newErrors.name = 'Le nom de l\'entreprise est requis'
        } else {
          delete newErrors.name
        }
        break
      case 'address':
        if (!value.trim()) {
          newErrors.address = 'L\'adresse est requise'
        } else {
          delete newErrors.address
        }
        break
      case 'city':
        if (!value.trim()) {
          newErrors.city = 'La ville est requise'
        } else {
          delete newErrors.city
        }
        break
      case 'phone':
        if (!value.trim()) {
          newErrors.phone = 'Le téléphone est requis'
        } else {
          delete newErrors.phone
        }
        break
      case 'email':
        if (!value.trim()) {
          newErrors.email = 'L\'email est requis'
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          newErrors.email = 'Email invalide'
        } else {
          delete newErrors.email
        }
        break
      case 'website':
        if (value.trim() && !/^https?:\/\/.+/.test(value)) {
          newErrors.website = 'URL invalide (doit commencer par http:// ou https://)'
        } else {
          delete newErrors.website
        }
        break
    }
    
    setErrors(newErrors)
  }

  const handleFieldChange = (field: string, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }))
    validateField(field, value)
  }

  const hasErrors = () => {
    return Object.keys(errors).length > 0
  }

  const handleSave = async () => {
    // Valider tous les champs requis
    const requiredFields = ['name', 'address', 'city', 'phone', 'email']
    const newErrors: Record<string, string> = {}
    
    requiredFields.forEach(field => {
      const value = settings[field as keyof CompanySettings] as string
      if (!value?.trim()) {
        switch (field) {
          case 'name':
            newErrors.name = 'Le nom de l\'entreprise est requis'
            break
          case 'address':
            newErrors.address = 'L\'adresse est requise'
            break
          case 'city':
            newErrors.city = 'La ville est requise'
            break
          case 'phone':
            newErrors.phone = 'Le téléphone est requis'
            break
          case 'email':
            newErrors.email = 'L\'email est requis'
            break
        }
      }
    })

    // Valider l'email
    if (settings.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.email)) {
      newErrors.email = 'Email invalide'
    }

    // Valider le site web
    if (settings.website && settings.website.trim() && !/^https?:\/\/.+/.test(settings.website)) {
      newErrors.website = 'URL invalide (doit commencer par http:// ou https://)'
    }

    setErrors(newErrors)

    if (Object.keys(newErrors).length > 0) {
      toast.error('Veuillez corriger les erreurs avant de sauvegarder')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/settings/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        toast.success('Paramètres sauvegardés avec succès')
        setErrors({})
      } else {
        const errorData = await response.json()
        toast.error(errorData.message || 'Erreur lors de la sauvegarde')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'logo')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        setSettings(prev => ({ ...prev, logo: data.url }))
        toast.success('Logo uploadé avec succès')
      } else {
        toast.error('Erreur lors de l\'upload du logo')
      }
    } catch (error) {
      console.error('Erreur upload:', error)
      toast.error('Erreur lors de l\'upload du logo')
    } finally {
      setUploading(false)
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
          <p className="text-muted-foreground">
            Configurez les informations de votre entreprise
          </p>
          {hasErrors() && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700 font-medium">
                ⚠️ {Object.keys(errors).length} erreur(s) à corriger :
              </p>
              <ul className="text-xs text-red-600 mt-1 list-disc list-inside">
                {Object.entries(errors).map(([field, error]) => (
                  <li key={field}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <Button onClick={handleSave} disabled={saving || hasErrors()}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Informations générales */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Informations générales
              </CardTitle>
              <CardDescription>
                Informations de base de votre entreprise
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Logo */}
              <div className="space-y-2">
                <Label>Logo de l'entreprise</Label>
                <div className="flex items-center gap-4">
                  {settings.logo ? (
                    <div className="relative">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={settings.logo} />
                        <AvatarFallback>{settings.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                        onClick={() => setSettings(prev => ({ ...prev, logo: "" }))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Avatar className="h-16 w-16">
                      <AvatarFallback>
                        <Upload className="h-6 w-6" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={uploading}
                      className="hidden"
                      id="logo-upload"
                    />
                    <Label htmlFor="logo-upload" className="cursor-pointer">
                      <Button type="button" variant="outline" disabled={uploading} asChild>
                        <span>
                          {uploading ? 'Upload...' : 'Choisir un logo'}
                        </span>
                      </Button>
                    </Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nom de l'entreprise *</Label>
                <Input
                  id="name"
                  value={settings.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  placeholder="Nom de votre entreprise"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={settings.description}
                  onChange={(e) => setSettings(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description de votre activité"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="legalForm">Forme juridique</Label>
                  <Input
                    id="legalForm"
                    value={settings.legalForm}
                    onChange={(e) => setSettings(prev => ({ ...prev, legalForm: e.target.value }))}
                    placeholder="SARL, SAS, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capital">Capital</Label>
                  <Input
                    id="capital"
                    value={settings.capital}
                    onChange={(e) => setSettings(prev => ({ ...prev, capital: e.target.value }))}
                    placeholder="1 000 000 FCFA"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Adresse */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Adresse
              </CardTitle>
              <CardDescription>
                Localisation de votre entreprise
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Adresse *</Label>
                <Textarea
                  id="address"
                  value={settings.address}
                  onChange={(e) => handleFieldChange('address', e.target.value)}
                  placeholder="Adresse complète"
                  className={errors.address ? 'border-red-500' : ''}
                />
                {errors.address && (
                  <p className="text-sm text-red-500">{errors.address}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Ville *</Label>
                  <Input
                    id="city"
                    value={settings.city}
                    onChange={(e) => handleFieldChange('city', e.target.value)}
                    placeholder="Abidjan"
                    className={errors.city ? 'border-red-500' : ''}
                  />
                  {errors.city && (
                    <p className="text-sm text-red-500">{errors.city}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Code postal</Label>
                  <Input
                    id="postalCode"
                    value={settings.postalCode}
                    onChange={(e) => setSettings(prev => ({ ...prev, postalCode: e.target.value }))}
                    placeholder="00225"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Pays</Label>
                <Input
                  id="country"
                  value={settings.country}
                  onChange={(e) => setSettings(prev => ({ ...prev, country: e.target.value }))}
                  placeholder="Côte d'Ivoire"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Contact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Contact
              </CardTitle>
              <CardDescription>
                Informations de contact
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone *</Label>
                <Input
                  id="phone"
                  value={settings.phone}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  placeholder="+225 XX XX XX XX"
                  className={errors.phone ? 'border-red-500' : ''}
                />
                {errors.phone && (
                  <p className="text-sm text-red-500">{errors.phone}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={settings.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  placeholder="contact@entreprise.com"
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Site web</Label>
                <Input
                  id="website"
                  value={settings.website}
                  onChange={(e) => handleFieldChange('website', e.target.value)}
                  placeholder="https://www.entreprise.com"
                  className={errors.website ? 'border-red-500' : ''}
                />
                {errors.website && (
                  <p className="text-sm text-red-500">{errors.website}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Optionnel. Doit commencer par http:// ou https://
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Informations légales */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informations légales
              </CardTitle>
              <CardDescription>
                Numéros d'identification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rccm">RCCM</Label>
                <Input
                  id="rccm"
                  value={settings.rccm}
                  onChange={(e) => setSettings(prev => ({ ...prev, rccm: e.target.value }))}
                  placeholder="CI-ABJ-2024-B-XXXXX"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nif">NIF</Label>
                <Input
                  id="nif"
                  value={settings.nif}
                  onChange={(e) => setSettings(prev => ({ ...prev, nif: e.target.value }))}
                  placeholder="XXXXXXXXX"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Informations bancaires */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="md:col-span-2"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Informations bancaires
              </CardTitle>
              <CardDescription>
                Coordonnées bancaires pour les factures
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bankName">Nom de la banque</Label>
                <Input
                  id="bankName"
                  value={settings.bankName}
                  onChange={(e) => setSettings(prev => ({ ...prev, bankName: e.target.value }))}
                  placeholder="Banque Atlantique"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bankAccount">Numéro de compte</Label>
                  <Input
                    id="bankAccount"
                    value={settings.bankAccount}
                    onChange={(e) => setSettings(prev => ({ ...prev, bankAccount: e.target.value }))}
                    placeholder="XXXXXXXXXXXXXXXXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankIban">IBAN</Label>
                  <Input
                    id="bankIban"
                    value={settings.bankIban}
                    onChange={(e) => setSettings(prev => ({ ...prev, bankIban: e.target.value }))}
                    placeholder="CI XX XXXX XXXX XXXX XXXX XXXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankSwift">Code SWIFT</Label>
                  <Input
                    id="bankSwift"
                    value={settings.bankSwift}
                    onChange={(e) => setSettings(prev => ({ ...prev, bankSwift: e.target.value }))}
                    placeholder="BATLCIAB"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
} 