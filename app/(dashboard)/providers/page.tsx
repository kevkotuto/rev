"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Plus, 
  Search,
  Edit, 
  Trash2, 
  User,
  Phone,
  Mail,
  MapPin,
  Building,
  CreditCard,
  UserCheck
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { motion } from "motion/react"
import { toast } from "sonner"

interface Provider {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  company?: string
  role?: string
  photo?: string
  notes?: string
  bankName?: string
  bankAccount?: string
  bankIban?: string
  createdAt: string
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    company: "",
    role: "",
    photo: "",
    notes: "",
    bankName: "",
    bankAccount: "",
    bankIban: ""
  })

  useEffect(() => {
    fetchProviders()
  }, [])

  const fetchProviders = async () => {
    try {
      const response = await fetch('/api/providers')
      if (response.ok) {
        const data = await response.json()
        setProviders(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des prestataires:', error)
      toast.error('Erreur lors du chargement des prestataires')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      const url = selectedProvider ? `/api/providers/${selectedProvider.id}` : '/api/providers'
      const method = selectedProvider ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })

      if (response.ok) {
        toast.success(selectedProvider ? 'Prestataire mis à jour' : 'Prestataire créé')
        setIsDialogOpen(false)
        resetForm()
        fetchProviders()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors de la sauvegarde')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce prestataire ?')) return

    try {
      const response = await fetch(`/api/providers/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Prestataire supprimé')
        fetchProviders()
      } else {
        toast.error('Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la suppression')
    }
  }

  const openDialog = (provider?: Provider) => {
    if (provider) {
      setSelectedProvider(provider)
      setForm({
        name: provider.name,
        email: provider.email || "",
        phone: provider.phone || "",
        address: provider.address || "",
        company: provider.company || "",
        role: provider.role || "",
        photo: provider.photo || "",
        notes: provider.notes || "",
        bankName: provider.bankName || "",
        bankAccount: provider.bankAccount || "",
        bankIban: provider.bankIban || ""
      })
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
  }

  const resetForm = () => {
    setSelectedProvider(null)
    setForm({
      name: "",
      email: "",
      phone: "",
      address: "",
      company: "",
      role: "",
      photo: "",
      notes: "",
      bankName: "",
      bankAccount: "",
      bankIban: ""
    })
  }

  const filteredProviders = providers.filter(provider =>
    provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    provider.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    provider.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    provider.company?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
          <h1 className="text-3xl font-bold tracking-tight">Prestataires</h1>
          <p className="text-muted-foreground">
            Gérez vos prestataires et sous-traitants
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau prestataire
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {selectedProvider ? 'Modifier le prestataire' : 'Nouveau prestataire'}
              </DialogTitle>
              <DialogDescription>
                {selectedProvider ? 'Modifiez les informations du prestataire' : 'Ajoutez un nouveau prestataire à votre équipe'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Nom du prestataire"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="email@exemple.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+225 XX XX XX XX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Spécialité/Rôle</Label>
                  <Input
                    id="role"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    placeholder="Développeur, Designer, etc."
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company">Entreprise</Label>
                  <Input
                    id="company"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    placeholder="Nom de l'entreprise"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Adresse</Label>
                  <Input
                    id="address"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Adresse complète"
                  />
                </div>
              </div>
              
              {/* Informations bancaires */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Informations bancaires</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bankName">Banque</Label>
                    <Input
                      id="bankName"
                      value={form.bankName}
                      onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                      placeholder="Nom de la banque"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankAccount">Numéro de compte</Label>
                    <Input
                      id="bankAccount"
                      value={form.bankAccount}
                      onChange={(e) => setForm({ ...form, bankAccount: e.target.value })}
                      placeholder="Numéro de compte"
                    />
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  <Label htmlFor="bankIban">IBAN</Label>
                  <Input
                    id="bankIban"
                    value={form.bankIban}
                    onChange={(e) => setForm({ ...form, bankIban: e.target.value })}
                    placeholder="Code IBAN"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Notes sur ce prestataire..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSubmit} disabled={!form.name}>
                {selectedProvider ? 'Mettre à jour' : 'Créer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Barre de recherche */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un prestataire..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Grille des prestataires */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredProviders.map((provider) => (
          <motion.div
            key={provider.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                      {provider.photo ? (
                        <img 
                          src={provider.photo} 
                          alt={provider.name} 
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        provider.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{provider.name}</CardTitle>
                      {provider.role && (
                        <Badge variant="secondary" className="mt-1">
                          {provider.role}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDialog(provider)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(provider.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {provider.company && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building className="h-4 w-4" />
                    {provider.company}
                  </div>
                )}
                {provider.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {provider.email}
                  </div>
                )}
                {provider.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {provider.phone}
                  </div>
                )}
                {provider.address && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {provider.address}
                  </div>
                )}
                {(provider.bankName || provider.bankAccount) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CreditCard className="h-4 w-4" />
                    Infos bancaires disponibles
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  Créé le {new Date(provider.createdAt).toLocaleDateString('fr-FR')}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredProviders.length === 0 && (
        <div className="text-center py-12">
          <UserCheck className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-semibold">
            {searchTerm ? 'Aucun prestataire trouvé' : 'Aucun prestataire'}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {searchTerm 
              ? 'Essayez de modifier votre recherche'
              : 'Commencez par ajouter votre premier prestataire.'
            }
          </p>
          {!searchTerm && (
            <Button className="mt-4" onClick={() => openDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau prestataire
            </Button>
          )}
        </div>
      )}
    </div>
  )
} 