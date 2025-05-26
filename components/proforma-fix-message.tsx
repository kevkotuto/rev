"use client"

import { CheckCircle, Calculator, Receipt, AlertTriangle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface ProformaFixMessageProps {
  onRefresh?: () => void
}

export function ProformaFixMessage({ onRefresh }: ProformaFixMessageProps) {
  return (
    <Card className="border-green-200 bg-green-50">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <CheckCircle className="h-8 w-8 text-green-600 mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-green-800 mb-2">
              ✅ Problème de calcul des proformas corrigé !
            </h3>
            <p className="text-green-700 mb-4">
              Le problème de double comptage dans les montants des proformas a été résolu :
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <span className="font-medium text-green-800">Avant (problème)</span>
                </div>
                <div className="bg-red-100 border border-red-200 rounded p-3">
                  <p className="text-sm text-red-800">
                    <strong>Total = Budget projet + Somme des services</strong><br/>
                    Exemple : 150k (services) + 300k (budget) = 450k ❌
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800">Maintenant (corrigé)</span>
                </div>
                <div className="bg-green-100 border border-green-200 rounded p-3">
                  <p className="text-sm text-green-800">
                    <strong>Total = Somme des services uniquement</strong><br/>
                    Exemple : 150k (services) = 150k ✅
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <h4 className="font-medium text-green-800">Corrections apportées :</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Calcul correct : Prix unitaire × Quantité pour chaque service</li>
                <li>• Total proforma = Somme des services (pas d'addition avec le budget projet)</li>
                <li>• Affichage détaillé des services dans les proformas</li>
                <li>• Cohérence entre les statistiques et les montants affichés</li>
              </ul>
            </div>

            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <Receipt className="h-3 w-3 mr-1" />
                Proformas mises à jour
              </Badge>
              {onRefresh && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onRefresh}
                  className="text-green-700 border-green-300 hover:bg-green-100"
                >
                  🔄 Actualiser les données
                </Button>
              )}
            </div>

            <div className="mt-4 p-3 bg-green-100 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Action recommandée :</strong> Vérifiez vos proformas existantes et 
                utilisez l'option "Synchroniser" pour mettre à jour les montants si nécessaire.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 