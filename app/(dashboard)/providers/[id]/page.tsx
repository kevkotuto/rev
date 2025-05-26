"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  ArrowLeft,
  Edit, 
  Mail,
  Phone,
  MapPin,
  Building,
  User,
  Calendar,
  DollarSign,
  FileText,
  Eye,
  CreditCard,
  Banknote
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
import { Input } from "@/components/ui/input"
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
  projectProviders: Array<{
    id: string
    amount: number
    isPaid: boolean
    paidDate?: string
    paymentMethod?: string
    project: {
      id: string
      name: string
      status: string
      logo?: string
    }
  }>
}

export default function ProviderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const providerId = params.id as string

  const [provider, setProvider] = useState<Provider | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

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
    if (providerId) {
      fetchProvider()
    }
  }, [providerId])

  const fetchProvider = async () => {
    try {
      const response = await fetch(`/api/providers/${providerId}`)
      if (response.ok) {
        const data = await response.json()
        setProvider(data)
        setForm({
          name: data.name,
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
          company: data.company || "",
          role: data.role || "",
          photo: data.photo || "",
          notes: data.notes || "",
          bankName: data.bankName || "",
          bankAccount: data.bankAccount || "",
          bankIban: data.bankIban || ""
        })
      } else if (response.status === 404) {
        toast.error("Prestataire non trouvé")
        router.push("/providers")
      }
    } catch (error) {
      console.error('Erreur lors du chargement du prestataire:', error)
      toast.error('Erreur lors du chargement du prestataire')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProvider = async () => {
    try {
      const response = await fetch(`/api/providers/${providerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })

      if (response.ok) {
        toast.success('Prestataire mis à jour avec succès')
        setIsEditDialogOpen(false)
        fetchProvider()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erreur lors de la mise à jour')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      IN_PROGRESS: { label: "En cours", color: "bg-blue-100 text-blue-800" },
      COMPLETED: { label: "Terminé", color: "bg-green-100 text-green-800" },
      ON_HOLD: { label: "En pause", color: "bg-yellow-100 text-yellow-800" },
      CANCELLED: { label: "Annulé", color: "bg-red-100 text-red-800" }
    }
    return badges[status as keyof typeof badges] || badges.IN_PROGRESS
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!provider) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold">Prestataire non trouvé</h3>
        <p className="text-muted-foreground">Le prestataire demandé n'existe pas ou a été supprimé.</p>
        <Button onClick={() => router.push("/providers")} className="mt-4">
          Retour aux prestataires
        </Button>
      </div>
    )
  }

  const totalEarnings = provider.projectProviders.reduce((sum, pp) => sum + pp.amount, 0)
  const totalPaid = provider.projectProviders.filter(pp => pp.isPaid).reduce((sum, pp) => sum + pp.amount, 0)
  const totalPending = totalEarnings - totalPaid

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push("/providers")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={provider.photo} alt={provider.name} />
              <AvatarFallback className="text-lg font-semibold bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                {provider.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{provider.name}</h1>
              <p className="text-muted-foreground">
                {provider.role && `${provider.role} • `}
                {provider.company && `${provider.company} • `}
                Prestataire depuis le {new Date(provider.createdAt).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
        </div>
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Edit className="w-4 h-4 mr-2" />
              Modifier
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Modifier le prestataire</DialogTitle>
              <DialogDescription>
                Modifiez les informations du prestataire
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
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
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
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Spécialité/Rôle</Label>
                  <Input
                    id="role"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
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
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Adresse</Label>
                  <Input
                    id="address"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="photo">URL de la photo</Label>
                <Input
                  id="photo"
                  value={form.photo}
                  onChange={(e) => setForm({ ...form, photo: e.target.value })}
                  placeholder="https://exemple.com/photo.jpg"
                />
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
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankAccount">Numéro de compte</Label>
                    <Input
                      id="bankAccount"
                      value={form.bankAccount}
                      onChange={(e) => setForm({ ...form, bankAccount: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  <Label htmlFor="bankIban">IBAN</Label>
                  <Input
                    id="bankIban"
                    value={form.bankIban}
                    onChange={(e) => setForm({ ...form, bankIban: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleUpdateProvider} disabled={!form.name}>
                Mettre à jour
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Métriques */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Projets</p>
                <p className="text-2xl font-bold">{provider.projectProviders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total gagné</p>
                <p className="text-2xl font-bold">{formatCurrency(totalEarnings)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Payé</p>
                <p className="text-2xl font-bold">{formatCurrency(totalPaid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">En attente</p>
                <p className="text-2xl font-bold">{formatCurrency(totalPending)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Informations du prestataire */}
        <Card>
          <CardHeader>
            <CardTitle>Informations du prestataire</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {provider.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{provider.email}</span>
              </div>
            )}
            {provider.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{provider.phone}</span>
              </div>
            )}
            {provider.company && (
              <div className="flex items-center gap-3">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{provider.company}</span>
              </div>
            )}
            {provider.address && (
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{provider.address}</span>
              </div>
            )}
            
            {/* Informations bancaires */}
            {(provider.bankName || provider.bankAccount || provider.bankIban) && (
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Informations bancaires
                </h4>
                <div className="space-y-2 text-sm">
                  {provider.bankName && (
                    <div>
                      <span className="text-muted-foreground">Banque: </span>
                      <span>{provider.bankName}</span>
                    </div>
                  )}
                  {provider.bankAccount && (
                    <div>
                      <span className="text-muted-foreground">Compte: </span>
                      <span>{provider.bankAccount}</span>
                    </div>
                  )}
                  {provider.bankIban && (
                    <div>
                      <span className="text-muted-foreground">IBAN: </span>
                      <span>{provider.bankIban}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {provider.notes && (
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Notes</h4>
                <p className="text-sm text-muted-foreground">{provider.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Projets récents */}
        <Card>
          <CardHeader>
            <CardTitle>Projets récents</CardTitle>
          </CardHeader>
          <CardContent>
            {provider.projectProviders.length > 0 ? (
              <div className="space-y-3">
                {provider.projectProviders.slice(0, 5).map((pp) => {
                  const statusBadge = getStatusBadge(pp.project.status)
                  return (
                    <div key={pp.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        {pp.project.logo ? (
                          <img src={pp.project.logo} alt={pp.project.name} className="w-8 h-8 rounded object-cover" />
                        ) : (
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded flex items-center justify-center text-white text-xs font-semibold">
                            {pp.project.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-sm">{pp.project.name}</p>
                          <div className="flex items-center gap-2">
                            <Badge className={`${statusBadge.color} text-xs`}>
                              {statusBadge.label}
                            </Badge>
                            <Badge variant={pp.isPaid ? "default" : "secondary"} className="text-xs">
                              {pp.isPaid ? "Payé" : "En attente"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">{formatCurrency(pp.amount)}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/projects/${pp.project.id}`)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
                {provider.projectProviders.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center pt-2">
                    Et {provider.projectProviders.length - 5} autres projets...
                  </p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Aucun projet pour ce prestataire
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 