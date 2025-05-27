# Traçabilité Complète des Paiements Wave

## 🎯 Vue d'ensemble

Le système REV assure une **traçabilité complète** de tous les paiements Wave des prestataires dans toute l'application. Chaque paiement Wave (avec ou sans projet) est automatiquement enregistré et affiché partout.

## 📊 Où apparaissent les paiements Wave ?

### 1. **Dashboard Principal** (`/dashboard`)

#### Affichage dans les statistiques :
- ✅ **Total des dépenses** : Inclut automatiquement tous les paiements Wave
- ✅ **Bénéfice net** : Revenus - Dépenses (avec paiements Wave)
- ✅ **Métriques en temps réel** : Calculs mis à jour avec chaque paiement

#### API impliquée :
```typescript
// /api/dashboard/stats
prisma.expense.aggregate({
  where: { 
    userId,
    ...expenseDateFilter  // Inclut category: 'PROVIDER_PAYMENT'
  },
  _sum: { amount: true }
})
```

### 2. **Page Transactions** (`/transactions`)

#### Affichage unifié :
- ✅ **Toutes les transactions** : Revenus + Dépenses incluant paiements Wave
- ✅ **Navigation intelligente** : Clic sur paiement → page projet ou dépenses
- ✅ **Filtrage par période** : Paiements Wave inclus dans tous les filtres

#### Données affichées :
```typescript
{
  id: `expense-${expense.id}`,
  type: 'expense',
  description: 'Paiement Wave - [Nom Prestataire]',
  amount: montant,
  category: 'PROVIDER_PAYMENT',
  relatedType: 'project' | 'expense',
  relatedData: { projectName, clientName }
}
```

### 3. **Page Prestataire** (`/providers/[id]`)

#### Nouvel historique des paiements :
- ✅ **Section dédiée** : "Historique des paiements"
- ✅ **Tous les paiements** : Wave + manuels avec détails
- ✅ **Informations complètes** : Date, montant, projet, notes, Wave ID

#### API créée :
```typescript
// /api/providers/[id]/payments
// Récupère toutes les dépenses PROVIDER_PAYMENT pour ce prestataire
```

### 4. **Pages Finances** (`/finance`, `/expenses`)

#### Inclusion automatique :
- ✅ **Catégorie PROVIDER_PAYMENT** : Tous les paiements Wave apparaissent
- ✅ **Filtrage par catégorie** : Option de voir uniquement les paiements prestataires
- ✅ **Suivi budgétaire** : Impact sur les budgets projets

### 5. **Page Statistiques** (`/statistics`)

#### Métriques enrichies :
- ✅ **Dépenses par catégorie** : PROVIDER_PAYMENT visible
- ✅ **Tendances temporelles** : Évolution des paiements prestataires
- ✅ **Analyses par projet** : Coûts prestataires par projet

## 🔄 Flux de traçabilité

### Paiement Wave AVEC projet :

```
1. User clique "Payer Wave" → provider-payment-dialog.tsx
2. API Call → /api/providers/[id]/payout
3. Wave API → /v1/payout (numéro téléphone)
4. Success → Create Expense (category: PROVIDER_PAYMENT)
5. Expense → projectId = projet.id
6. Update ProjectProvider → isPaid = true
7. Affichage automatique dans :
   - Dashboard (dépenses)
   - Transactions (avec lien projet)
   - Prestataire (historique)
   - Finances (dépenses projet)
   - Statistiques (métriques projet)
```

### Paiement Wave SANS projet :

```
1. User clique "Payer Wave" → provider-payment-dialog.tsx
2. API Call → /api/providers/[id]/payout
3. Wave API → /v1/payout (numéro téléphone)
4. Success → Create Expense (category: PROVIDER_PAYMENT)
5. Expense → projectId = null, type = GENERAL
6. Affichage automatique dans :
   - Dashboard (dépenses totales)
   - Transactions (avec lien dépense)
   - Prestataire (historique)
   - Finances (dépenses générales)
   - Statistiques (métriques globales)
```

## 📝 Structure des données créées

### Dépense automatique :
```typescript
{
  description: "Paiement Wave - [Nom Prestataire]",
  amount: montant_payé,
  category: "PROVIDER_PAYMENT",
  type: "PROJECT" | "GENERAL",
  date: new Date(),
  notes: "[Notes utilisateur]\nWave ID: [Wave_Transaction_ID]\nTéléphone: [phone]",
  userId: session.user.id,
  projectId: projet_id_ou_null
}
```

### Mise à jour projet (si applicable) :
```typescript
{
  isPaid: true,
  paidDate: new Date(),
  paymentMethod: "WAVE"
}
```

## 🎨 Interface utilisateur

### Composant unifié :
- **ProviderPaymentDialog** : Utilisé partout (projets + prestataires)
- **Validation visuelle** : Téléphone requis pour Wave
- **Retour utilisateur** : Messages de succès/erreur clairs

### Pages d'accès :
1. **`/providers/[id]`** → Bouton "Payer" (en-tête)
2. **`/projects/[id]`** → Bouton "Payer Wave" (si téléphone configuré)
3. **Futures** : `/providers` (actions en lot)

## 🔍 Vérification de la traçabilité

### Test complet :
```bash
1. Configurer Wave API Key (/settings)
2. Ajouter numéro téléphone à un prestataire
3. Effectuer paiement Wave (avec/sans projet)
4. Vérifier apparition dans :
   ✅ Dashboard → Dépenses totales
   ✅ Transactions → Nouvelle transaction
   ✅ Prestataire → Historique paiements
   ✅ Finances → Dépenses PROVIDER_PAYMENT
   ✅ Statistiques → Métriques mises à jour
```

### APIs de vérification :
- `GET /api/transactions` → Paiement dans la liste
- `GET /api/providers/[id]/payments` → Historique prestataire
- `GET /api/dashboard/stats` → Métriques actualisées
- `GET /api/expenses` → Dépense PROVIDER_PAYMENT

## ⚡ Temps réel

### Mise à jour immédiate :
- **Dashboard** : Rechargement auto des stats
- **Transactions** : Nouvelle transaction en tête de liste
- **Prestataire** : Historique actualisé
- **Projet** : Statut "Payé" mis à jour

### Performance :
- **Requêtes optimisées** : Index sur category, userId, date
- **Agrégations efficaces** : Utilisation de `prisma.aggregate`
- **Cache intelligent** : Invalidation ciblée après paiement

## 📈 Métriques suivies

### Globales :
- Total dépenses prestataires
- Évolution mensuelle paiements Wave
- Répartition par méthode de paiement

### Par prestataire :
- Historique complet des paiements
- Montants totaux reçus
- Fréquence des paiements

### Par projet :
- Coûts prestataires par projet
- Status de paiement en temps réel
- Budget vs dépenses réelles

## 🚀 État actuel

- ✅ **Traçabilité complète** implémentée
- ✅ **API Wave corrigée** (/v1/payout avec téléphone)
- ✅ **Interface unifiée** (ProviderPaymentDialog)
- ✅ **Affichage partout** (Dashboard, Transactions, Prestataire, Finances)
- ✅ **Données enrichies** (Wave ID, téléphone, notes)
- ✅ **Navigation intelligente** (liens contextuels)

## 🎯 Résultat final

**Aucun paiement Wave n'est perdu !** 

Chaque paiement de prestataire (avec ou sans projet) est automatiquement :
1. **Enregistré** comme dépense catégorisée
2. **Affiché** dans toutes les pages financières
3. **Traçable** avec ID Wave et numéros de téléphone
4. **Navigable** vers les pages associées
5. **Comptabilisé** dans toutes les statistiques

Le système assure une **visibilité complète** et une **traçabilité parfaite** de tous les flux financiers vers les prestataires. 