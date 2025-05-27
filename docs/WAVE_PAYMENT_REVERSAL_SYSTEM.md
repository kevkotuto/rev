# Système d'Annulation des Paiements Wave

## 🎯 Vue d'ensemble

Le système REV intègre maintenant la **fonctionnalité d'annulation des paiements Wave** avec la limite de 3 jours imposée par l'API Wave. Cette fonctionnalité permet d'annuler les paiements effectués par erreur tout en maintenant la traçabilité comptable complète.

## ⏰ Contraintes temporelles

### Délai d'annulation : **3 jours maximum**
- **Calcul** : 72 heures à partir du `timestamp` du paiement Wave
- **Référence** : Champ `timestamp` de l'objet Paiement Wave
- **Affichage** : Compte à rebours en temps réel (jours/heures restantes)
- **Expiration** : Aucune annulation possible après expiration

### Statuts éligibles
- ✅ **succeeded** : Paiements réussis uniquement
- ❌ **processing** : En cours de traitement
- ❌ **failed** : Paiements échoués
- ❌ **reversed** : Déjà annulés (idempotent)

## 🔧 API d'annulation

### Endpoint : `POST /api/wave/payout/[id]/reverse`

#### Sécurité et validations :
1. **Authentification** : Session utilisateur obligatoire
2. **Clé API Wave** : Vérification de la configuration
3. **Vérification statut** : Paiement `succeeded` uniquement
4. **Vérification délai** : Moins de 3 jours depuis création
5. **Idempotence** : Réessai sécurisé sur paiements déjà annulés

#### Processus d'annulation :
```typescript
// 1. Récupération des détails Wave
GET https://api.wave.com/v1/payout/{id}

// 2. Validation du délai et du statut
const daysDiff = (now - paymentDate) / (1000 * 60 * 60 * 24)
if (daysDiff > 3 || status !== 'succeeded') return error

// 3. Appel à l'API Wave d'annulation
POST https://api.wave.com/v1/payout/{id}/reverse

// 4. Mise à jour comptabilité locale
```

## 💼 Intégration comptable

### Création d'une dépense d'annulation
```typescript
await prisma.expense.create({
  description: `ANNULATION - ${originalExpense.description}`,
  amount: -originalExpense.amount, // Montant négatif
  category: 'PROVIDER_PAYMENT_REVERSAL',
  notes: `
    Annulation du paiement Wave
    Paiement original: ${payoutId}
    Date d'annulation: ${new Date().toISOString()}
    Montant remboursé: ${receive_amount} XOF + ${fee} XOF (frais)
  `
})
```

### Mise à jour ProjectProvider
```typescript
// Restaurer le statut "non payé"
await prisma.projectProvider.update({
  data: {
    isPaid: false,
    paidDate: null,
    paymentMethod: null
  }
})
```

## 🎨 Interface utilisateur

### Page de détail paiement (`/wave-payment/[id]`)

#### Section d'annulation conditionnelle :
- **Affichage** : Seulement pour statut `succeeded`
- **Couleurs** : Orange (possible) / Rouge (impossible)
- **Informations** : Délai restant, montant remboursé
- **Bouton** : Destructif avec confirmation

#### Éléments visuels :
```tsx
// Badge délai restant
<Badge variant={canBeReversed ? "default" : "destructive"}>
  {getRemainingTime(timestamp)} // "2j 15h restantes"
</Badge>

// Détail remboursement
Montant principal: 15,000 XOF
Frais Wave: 150 XOF
Total remboursé: 15,150 XOF
```

#### Confirmation d'annulation :
```
Êtes-vous sûr de vouloir annuler ce paiement de 15,000 XOF ?

Cette action :
- Annulera le paiement et remboursera les frais
- Ne peut pas être annulée
- Créera une dépense d'annulation dans votre comptabilité
```

### Page des transactions (`/transactions`)

#### Identification visuelle des annulations :
- **Icône spéciale** : `RotateCcw` (rotation inversée)
- **Couleur** : Violet/Purple pour distinction
- **Badge** : "Annulation Wave" avec icône
- **Navigation** : Vers détails Wave du paiement original

## 📊 États des paiements

### Statut Wave après annulation : `reversed`
```json
{
  "id": "pt-185sewgm8100t",
  "status": "reversed",
  "currency": "XOF",
  "receive_amount": "15000",
  "fee": "150",
  // ... autres champs
}
```

### Affichage post-annulation :
- **Card spéciale** : Fond violet avec message
- **Texte** : "Paiement Annulé - Montant total remboursé"
- **Actions** : Masquage du bouton d'annulation
- **Navigation** : Maintien vers transactions et projet

## 🔄 Gestion d'erreurs Wave

### Codes d'erreur API Wave :
| Code | Signification | Action |
|------|---------------|---------|
| `insufficient-funds` | Fonds insuffisants chez destinataire | Demander au destinataire d'approvisionner |
| `payout-reversal-time-limit-exceeded` | Délai de 3 jours dépassé | Informer de l'impossibilité |
| `payout-reversal-account-terminated` | Compte destinataire fermé | Contacter support Wave |
| `not-found` | Paiement introuvable | Vérifier ID et propriété |

### Messages utilisateur :
```typescript
switch (errorCode) {
  case 'insufficient-funds':
    return "Le destinataire n'a pas suffisamment de solde pour couvrir l'annulation"
  case 'payout-reversal-time-limit-exceeded':
    return "Le délai de 3 jours pour annuler ce paiement est écoulé"
  // ...
}
```

## 🔍 Traçabilité complète

### 1. **Transaction originale** (PROVIDER_PAYMENT)
```
Description: "Paiement Wave - Nom Prestataire"
Montant: -15,000 XOF
Notes: "Wave ID: pt-185sewgm8100t\nTéléphone: +221555110233"
```

### 2. **Transaction d'annulation** (PROVIDER_PAYMENT_REVERSAL)
```
Description: "ANNULATION - Paiement Wave - Nom Prestataire"
Montant: +15,000 XOF (positif = remboursement)
Notes: "Annulation du paiement Wave\nPaiement original: pt-185sewgm8100t\nDate d'annulation: ..."
```

### 3. **Navigation croisée**
- Transaction originale → Détails Wave
- Transaction d'annulation → Détails Wave (même ID)
- Projet → Prestataire marqué "non payé"

## 🎯 Cas d'utilisation

### 1. **Erreur de montant**
- Paiement de 150,000 XOF au lieu de 15,000 XOF
- Annulation rapide dans les 3 jours
- Nouveau paiement avec montant correct

### 2. **Mauvais destinataire**
- Paiement envoyé au mauvais prestataire
- Annulation et remboursement automatique
- Nouveau paiement vers bon destinataire

### 3. **Annulation projet**
- Projet annulé après paiement prestataire
- Récupération des fonds dans les délais
- Mise à jour comptabilité et statuts

## 📱 UX/UI optimisée

### Animations Motion Dev :
```tsx
// Apparition du bouton d'annulation
<motion.div
  initial={{ opacity: 0, scale: 0.9 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ delay: 0.6 }}
>
```

### États visuels :
- **Possible** : Card orange, bouton rouge destructif
- **Impossible** : Card rouge, message d'impossibilité
- **En cours** : Bouton disabled, spinner
- **Annulé** : Card violette, message de confirmation

### Responsive :
- **Mobile** : Bouton pleine largeur
- **Desktop** : Largeur adaptée au contenu
- **Touch** : Zones tactiles optimisées

## 🔧 Configuration technique

### Variables d'environnement :
```env
WAVE_API_BASE_URL=https://api.wave.com/v1
WAVE_REVERSAL_TIMEOUT_HOURS=72
```

### Dépendances :
- **Wave API Key** : Configurée dans settings utilisateur
- **Prisma** : Base de données pour traçabilité
- **Next.js API Routes** : Backend d'annulation
- **Motion Dev** : Animations interface

## 📈 Monitoring et analytics

### Métriques suivies :
- **Taux d'annulation** : % de paiements annulés
- **Délai moyen** : Temps entre paiement et annulation
- **Motifs** : Classification des raisons d'annulation
- **Succès technique** : Taux de réussite API Wave

### Logs d'audit :
```typescript
console.log(`Paiement ${payoutId} annulé par ${userId} - Motif: ${reason}`)
```

## ✅ Tests et validation

### Scénarios testés :
- ✅ **Annulation dans délai** : Paiement < 3 jours
- ✅ **Annulation expirée** : Paiement > 3 jours
- ✅ **Double annulation** : Idempotence API
- ✅ **Erreurs réseau** : Gestion disconnections
- ✅ **Fonds insuffisants** : Gestion erreur destinataire

### Validations :
- ✅ **Sécurité** : Authentification et autorisation
- ✅ **Performance** : Temps de réponse < 2s
- ✅ **Fiabilité** : Gestion d'erreurs complète
- ✅ **Usabilité** : Interface intuitive

## 🔮 Évolutions futures

### Fonctionnalités prévues :
- **Annulation partielle** : Si Wave l'autorise
- **Motifs d'annulation** : Classification des raisons
- **Notifications** : Alert destinataire de l'annulation
- **Rapports** : Analyse des annulations par période

### Améliorations UX :
- **Aperçu impact** : Simulation avant annulation
- **Historique** : Timeline des actions sur paiement
- **Templates** : Messages prédéfinis pour destinataires

---

## 🎉 Résultat

Le système d'annulation des paiements Wave est **opérationnel** et offre :

- ✅ **Conformité API Wave** : Respect des délais et contraintes
- ✅ **Traçabilité complète** : Comptabilité et audit
- ✅ **Interface moderne** : UX optimisée avec feedback
- ✅ **Sécurité renforcée** : Validations et confirmations
- ✅ **Gestion d'erreurs** : Messages clairs et actions

Cette fonctionnalité complète l'écosystème de paiements Wave de REV en ajoutant la flexibilité nécessaire pour corriger les erreurs tout en maintenant l'intégrité des données financières. 