# Système de Détails des Paiements Wave

## 🎯 Vue d'ensemble

Le système REV inclut maintenant une page de **détail complète** pour chaque paiement Wave effectué. Cette fonctionnalité utilise l'API officielle Wave `GET /v1/payout/:id` pour récupérer et afficher toutes les informations de transaction en temps réel.

## 🔗 Navigation vers les détails

### 1. **Depuis la page Transactions** (`/transactions`)

#### Nouvelles fonctionnalités :
- ✅ **Badge "Paiement Wave"** : Identification visuelle des paiements Wave
- ✅ **Icône spéciale** : CreditCard pour les paiements Wave vs Receipt pour factures
- ✅ **Bouton "Détails Wave"** : Navigation directe vers `/wave-payment/[wave_id]`
- ✅ **Extraction automatique** : ID Wave extrait des notes de dépenses

#### Code de navigation :
```typescript
// Dans les transactions
transaction.isWavePayment = expense.category === 'PROVIDER_PAYMENT' && !!waveId
transaction.waveId = waveIdExtracted

// Navigation
onClick={() => router.push(`/wave-payment/${transaction.waveId}`)}
```

### 2. **Depuis la page Prestataire** (`/providers/[id]`)

#### Section "Historique des paiements" :
- ✅ **Liens contextuels** : Clic sur paiement Wave → détails complets
- ✅ **Badges interactifs** : Indication visuelle des paiements Wave
- ✅ **Navigation croisée** : Vers projet associé si applicable

## 📱 Page de détail Wave (`/wave-payment/[id]`)

### Architecture de la page :

#### A. **API Backend** (`/api/wave/payout/[id]`)
```typescript
// Appel à l'API Wave officielle
GET https://api.wave.com/v1/payout/${payoutId}
Headers: {
  'Authorization': `Bearer ${waveApiKey}`,
  'Content-Type': 'application/json'
}

// Enrichissement avec données locales
const localExpense = await prisma.expense.findFirst({
  where: {
    category: 'PROVIDER_PAYMENT',
    notes: { contains: payoutId }
  }
})
```

#### B. **Interface utilisateur moderne**

##### 1. **En-tête avec actions** :
- **Titre** : "Détail du paiement Wave"
- **Informations** : ID + timestamp du paiement
- **Actions** : Copier ID, retour aux transactions

##### 2. **Statut du paiement** (Card principale) :
- **Icône de statut** : ✅ Réussi / ⏳ En cours / ❌ Échoué
- **Montant principal** : Montant reçu (couleur verte)
- **Frais** : Frais Wave (couleur rouge)
- **Description** : Statut textuel du paiement

##### 3. **Informations du destinataire** :
- **Nom** : Nom du bénéficiaire
- **Téléphone** : Numéro avec bouton de copie
- **ID National** : Si disponible dans Wave

##### 4. **Détails financiers** :
- **Devise** : Badge avec code devise (XOF)
- **Montant brut** : receive_amount de Wave
- **Frais** : fee de Wave  
- **Total envoyé** : Calcul automatique

##### 5. **Informations de transaction** :
- **ID Transaction** : Code monospace avec copie
- **Référence client** : client_reference avec copie
- **Date/heure** : Timestamp formaté français
- **Motif** : payment_reason si présent

##### 6. **Informations REV** (si disponibles) :
- **Description locale** : Nom de la dépense
- **Date d'enregistrement** : Date de création locale
- **Projet associé** : Badge cliquable vers projet
- **Notes** : Notes complètes avec Wave ID
- **Lien dépense** : Bouton vers la dépense associée

##### 7. **Actions disponibles** :
- **Retour transactions** : Navigation contextuelle
- **Copier données** : Export JSON complet
- **Voir projet** : Si paiement lié à un projet
- **Voir dépense** : Navigation vers /expenses

## 🔍 Détails techniques

### Structure des données Wave :
```typescript
{
  id: "pt-185sewgm8100t",
  currency: "XOF",
  receive_amount: "15000",
  fee: "150", 
  mobile: "+221555110233",
  name: "Moustapha Mbaye",
  national_id: "1751197904376",
  client_reference: "FAH.4827.1734", 
  payment_reason: "Salary November 2022",
  status: "succeeded",
  timestamp: "2022-06-21T09:56:29Z",
  aggregated_merchant_id: "am-7lks22ap113t4"
}
```

### Enrichissement local :
```typescript
{
  wave: { /* Données Wave complètes */ },
  local: {
    id: "expense-123",
    description: "Paiement Wave - Nom Prestataire",
    date: "2024-01-15",
    notes: "Paiement projet...\nWave ID: pt-185sewgm8100t\nTéléphone: +221555110233",
    project: { id: "proj-456", name: "Projet X" }
  }
}
```

## 🎨 Design et UX

### Animations Motion Dev :
- **Apparition séquentielle** : Cards avec délais progressifs
- **Hover effects** : Feedback visuel sur interactions
- **Transitions fluides** : Navigation contextuelle

### Interface responsive :
- **Mobile-first** : Adaptable à tous les écrans
- **Grid intelligent** : 2 colonnes desktop, 1 colonne mobile
- **Actions tactiles** : Boutons optimisés touch

### Codes couleur :
- **Vert** : Montants reçus, statuts réussis
- **Rouge** : Frais, erreurs
- **Bleu** : Informations Wave, navigation
- **Gris** : Métadonnées, informations secondaires

## 🚀 Fonctionnalités avancées

### 1. **Copie intelligente** :
- **Données individuelles** : ID, téléphone, référence
- **Export complet** : JSON structuré pour debugging
- **Feedback utilisateur** : Toast de confirmation

### 2. **Navigation contextuelle** :
- **Retour intelligent** : Vers la page d'origine
- **Liens croisés** : Projet ↔ Paiement ↔ Dépense
- **Breadcrumb** : Indication du chemin de navigation

### 3. **Gestion d'erreurs** :
- **API Wave indisponible** : Message d'erreur clair
- **Paiement introuvable** : Page 404 personnalisée
- **Clé API manquante** : Redirection vers configuration

### 4. **Performance** :
- **Cache intelligent** : Données Wave mise en cache temporaire
- **Lazy loading** : Chargement optimisé des composants
- **Error boundaries** : Gestion gracieuse des erreurs

## 📊 Métriques et tracking

### Données suivies :
- **Consultations** : Nombre de vues des détails
- **Actions** : Copies, navigations, exports
- **Performance** : Temps de chargement API Wave

### Analytics intégrées :
- **Paiements populaires** : Les plus consultés
- **Erreurs API** : Monitoring des échecs Wave
- **Navigation patterns** : Chemins utilisateur

## 🔧 Configuration requise

### Prérequis :
1. **Wave API Key** : Configurée dans `/settings`
2. **HTTPS** : Obligatoire pour Wave API
3. **Next.js 15** : Version compatible
4. **Permissions** : Accès read pour paiements Wave

### Variables d'environnement :
```env
WAVE_API_BASE_URL=https://api.wave.com/v1
WAVE_API_TIMEOUT=30000
```

## 🎯 Cas d'utilisation

### 1. **Support client** :
- Vérification statut paiement en temps réel
- Informations complètes pour résolution problèmes
- Export des données pour ticket support

### 2. **Comptabilité** :
- Réconciliation avec données Wave
- Vérification des frais appliqués  
- Audit trail complet

### 3. **Gestion projet** :
- Suivi paiements prestataires par projet
- Validation des montants et dates
- Lien contextuel projet ↔ paiement

## 🔮 Évolutions futures

### Fonctionnalités prévues :
- **Historique des statuts** : Timeline des changements
- **Notifications** : Alerts sur changement de statut
- **Rapports** : Export PDF des détails
- **Intégration comptable** : Sync avec logiciels tiers

### Améliorations UX :
- **Mode hors ligne** : Cache local des consultations récentes
- **Favoris** : Marquer paiements importants
- **Recherche** : Filtrage avancé dans l'historique

## ✅ État actuel

### Implémenté :
- ✅ **Page de détail complète** avec API Wave
- ✅ **Navigation depuis transactions** et prestataires
- ✅ **Interface moderne** avec animations
- ✅ **Gestion d'erreurs** complète
- ✅ **Actions contextuelles** (copie, navigation)
- ✅ **Responsive design** mobile/desktop

### Tests validés :
- ✅ **API Wave** : Récupération données en temps réel
- ✅ **Enrichissement local** : Jointure avec dépenses
- ✅ **Navigation** : Tous les chemins fonctionnels
- ✅ **UX/UI** : Interface intuitive et rapide

Le système de détails des paiements Wave est **opérationnel** et offre une **visibilité complète** sur tous les paiements effectués via Wave, avec une **expérience utilisateur** optimale et une **intégration parfaite** dans l'écosystème REV. 