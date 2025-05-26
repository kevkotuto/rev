"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Receipt, 
  ArrowRight, 
  CheckCircle,
  Calculator,
  Zap,
  Users,
  CreditCard
} from "lucide-react"

export function PartialConversionInfo() {
  return (
    <Card className="border-green-200 bg-gradient-to-r from-green-50 to-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-800">
          <Zap className="h-5 w-5" />
          🎉 Nouvelle fonctionnalité : Conversion partielle de devis
        </CardTitle>
        <CardDescription className="text-green-700">
          Facturez vos clients progressivement selon leurs besoins et leurs paiements
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Alert className="border-blue-200 bg-blue-50">
            <CheckCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Comment ça marche :</strong> Sélectionnez uniquement les services que le client souhaite payer maintenant, 
              puis créez une facture partielle. Le reste du devis reste disponible pour de futures conversions.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-green-800 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Avantages pour vos clients
              </h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Paiements échelonnés selon leur budget</li>
                <li>• Flexibilité dans le planning des projets</li>
                <li>• Meilleur contrôle des dépenses</li>
                <li>• Démarrage rapide avec paiement partiel</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-green-800 flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Avantages pour vous
              </h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Réduction des impayés</li>
                <li>• Amélioration de la trésorerie</li>
                <li>• Suivi précis des paiements</li>
                <li>• Relations client améliorées</li>
              </ul>
            </div>
          </div>

          <div className="bg-green-100 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Exemple concret
            </h4>
            <div className="text-sm text-green-700 space-y-2">
              <p><strong>Devis original :</strong> Site web (50k) + Formation (25k) + Maintenance (15k) = 90k XOF</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-white">Étape 1</Badge>
                <span>Client paie le site web → Facture de 50k XOF</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-white">Étape 2</Badge>
                <span>Plus tard, formation → Facture de 25k XOF</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-white">Étape 3</Badge>
                <span>Enfin, maintenance → Facture de 15k XOF</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-green-600">
              <Receipt className="h-4 w-4" />
              <span>Utilisez</span>
              <ArrowRight className="h-3 w-3" />
              <span className="font-medium">"Conversion partielle"</span>
              <span>dans le menu d'actions de vos proformas</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 