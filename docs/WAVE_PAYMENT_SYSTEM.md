# Système de Paiement Wave - Documentation Complète

## 🏗️ Architecture du système

Le système de paiement Wave REV est conçu pour être **cohérent** et **uniforme** dans toute l'application :

### 1. **Composant unifié `ProviderPaymentDialog`**

Un seul composant réutilisable gère tous les paiements de prestataires :
- **Paiements Wave automatiques** (via API /v1/payout)
- **Paiements manuels** (espèces, virement, etc.)
- **Intégration projets** (marquer comme payé dans le contexte projet)
- **Dépenses automatiques** (création de dépenses pour suivi financier)

### 2. **Pages d'utilisation du système**

#### A. **Page Prestataire individuel** (`/providers/[id]`)
- **Utilisation** : Paiement général au prestataire
- **Contexte** : Indépendant des projets
- **Fonctionnalités** :
  - Bouton "Payer" dans l'en-tête
  - Affichage du statut Wave (disponible/indisponible)
  - Affichage du numéro de téléphone Wave

#### B. **Page Projet** (`/projects/[id]`)  
- **Utilisation** : Paiement dans le contexte d'un projet spécifique
- **Contexte** : Lié au projet et peut marquer le prestataire comme payé
- **Fonctionnalités** :
  - Bouton "Payer Wave" si numéro de téléphone configuré
  - Option "Marquer comme payé dans le projet"

#### C. **Page Liste Prestataires** (`/providers`)
- **Utilisation** : Actions rapides de paiement
- **Contexte** : Vue d'ensemble avec paiements multiples
- **Fonctionnalités** : Actions en lot (à implémenter)

## 🔧 Configuration Wave

### 1. **Pour l'utilisateur** (dans `/settings`)
- **Wave API Key** : Clé secrète pour authentification API
- **Devise** : XOF (Franc CFA) par défaut

### 2. **Pour chaque prestataire** (dans `/providers/[id]`)
- **Numéro de téléphone** : Numéro mobile du prestataire pour recevoir les paiements Wave
- **Informations bancaires** : Banque, compte, IBAN (pour référence)

## 🚀 Utilisation du système

### 1. **Paiement Wave automatique**

```typescript
// Conditions requises
- Wave API Key configurée (utilisateur)
- Numéro de téléphone configuré (prestataire)
- Montant > 0

// Processus
1. Utilisateur clique "Payer"
2. Sélectionne "Paiement Wave"
3. Saisit montant et notes
4. L'API appelle Wave /v1/payout
5. Création automatique d'une dépense
6. Mise à jour du statut si lié à un projet
```

### 2. **Paiement manuel**

```typescript
// Conditions requises
- Montant > 0

// Processus
1. Utilisateur clique "Payer"
2. Sélectionne "Paiement manuel"
3. Saisit montant et notes
4. Option : "Marquer comme payé dans le projet"
5. Création d'une dépense ou mise à jour du projet
```

## 📊 Traçabilité financière

### 1. **Création automatique de dépenses**

Tous les paiements créent automatiquement des dépenses :

```typescript
{
  description: "Paiement Wave - [Nom]",
  amount: montant_payé,
  category: "PROVIDER_PAYMENT",
  type: "PROJECT" | "GENERAL",
  projectId: projet_id_si_applicable,
  notes: "Détails du paiement + Wave ID + Téléphone"
}
```

### 2. **Visibilité dans l'application**

Les paiements apparaissent dans :
- ✅ **Page des dépenses** (`/expenses`)
- ✅ **Page finances** (`/finance`)
- ✅ **Page transactions** (`/transactions`)
- ✅ **Page statistiques** (`/statistics`)

## 🔗 API Wave Standard

### 1. **Endpoint utilisé** : `/v1/payout`

```bash
curl -X POST \
  --url https://api.wave.com/v1/payout \
  -H 'Authorization: Bearer [WAVE_API_KEY]' \
  -H 'Content-Type: application/json' \
  -H 'idempotency-key: [UNIQUE_KEY]' \
  -d '{
    "currency": "XOF",
    "receive_amount": "50000",
    "mobile": "+221555110219",
    "name": "Fatou Ndiaye",
    "client_reference": "payout-[provider_id]-[timestamp]",
    "payment_reason": "Paiement projet"
  }'
```

### 2. **Gestion des réponses**

```typescript
// Succès
{
  "id": "pt-185b5e4b8100c",
  "currency": "XOF",
  "receive_amount": "50000",
  "fee": "100",
  "mobile": "+221555110219",
  "name": "Fatou Ndiaye",
  "status": "succeeded",
  "timestamp": "2022-06-20T17:17:11Z"
}

// Échec
{
  "message": "insufficient_funds",
  "error_code": "INSUFFICIENT_FUNDS"
}
```

## 📁 Structure des fichiers

```
app/
├── (dashboard)/
│   ├── providers/
│   │   ├── page.tsx                    # Liste prestataires
│   │   └── [id]/page.tsx              # Détail prestataire + paiement
│   ├── projects/[id]/page.tsx         # Projet + paiement contexte
│   ├── transactions/page.tsx          # Historique complet
│   ├── expenses/page.tsx              # Dépenses
│   └── finance/page.tsx               # Vue d'ensemble
├── api/
│   ├── providers/[id]/payout/route.ts # API Wave standard
│   ├── project-providers/[id]/route.ts # Marquage projet
│   ├── transactions/route.ts          # Agrégation transactions
│   └── expenses/route.ts              # Gestion dépenses
└── components/
    └── provider-payment-dialog.tsx    # Composant unifié
```

## 🎯 Flux de données

### 1. **Paiement Wave avec projet**

```
User Action (Projet) → Wave API Call → Success → Update Project + Create Expense
```

### 2. **Paiement Wave général**

```
User Action (Prestataire) → Wave API Call → Success → Create Expense
```

### 3. **Paiement manuel avec projet**

```
User Action → Mark Project Paid → Create Expense → Update Status
```

### 4. **Paiement manuel général**

```
User Action → Create Expense → Success
```

## 🛡️ Sécurité et validation

### 1. **Validation côté client**
- Montant positif requis
- Numéro de téléphone requis pour Wave
- Format numéro de téléphone validé

### 2. **Validation côté serveur**
- Session utilisateur requise
- Propriété des prestataires vérifiée
- Wave API Key présente
- Numéro de téléphone valide
- Gestion des erreurs détaillée

### 3. **Idempotence**
- Clé unique par paiement : `payout-${providerId}-${timestamp}`
- Prévention des doublons
- Retry automatique sécurisé

## 🔍 Tests et débogage

### 1. **Tests manuels**

```bash
# 1. Configurer Wave API Key dans user settings
# 2. Ajouter numéro de téléphone à un prestataire
# 3. Tester paiement Wave depuis prestataire
# 4. Vérifier création dépense dans /expenses
# 5. Vérifier apparition dans /transactions
```

### 2. **Logs à surveiller**

```typescript
// API Wave Response
console.log('Wave API Response:', waveResponse)

// Dépense créée
console.log('Expense created:', expenseId)

// Projet mis à jour
console.log('Project provider updated:', projectProviderId)
```

## ✅ État actuel du système

- ✅ **Composant unifié** créé et fonctionnel
- ✅ **API Wave standard** intégrée avec vraie documentation (/v1/payout)
- ✅ **Page prestataire** avec bouton paiement
- ✅ **Configuration via numéro de téléphone** dans l'interface
- ✅ **Traçabilité complète** dans toutes les pages financières
- ✅ **Gestion d'erreurs** appropriée
- ✅ **Design moderne** et ergonomique
- ✅ **Navigation cohérente** vers pages associées

## 🚧 Améliorations futures

1. **Paiements en lot** depuis `/providers`
2. **Historique des paiements Wave** par prestataire
3. **Notifications** de statut des paiements
4. **Webhooks Wave** pour mises à jour automatiques
5. **Rapports financiers** avancés avec catégorisation Wave
6. **Validation format** numéros de téléphone internationaux
7. **Approbation** multi-niveaux pour gros montants 