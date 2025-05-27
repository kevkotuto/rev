# Système de Gestion des Transactions Wave

## 🎯 Vue d'ensemble

Le système REV intègre maintenant un **module complet de gestion des transactions Wave** permettant de :
- **Récupérer** toutes les transactions Wave avec pagination
- **Assigner** les transactions à des entités locales (projets, clients, prestataires)
- **Rembourser** les transactions reçues
- **Synchroniser** automatiquement avec la comptabilité REV

## 🔄 Récupération des transactions

### API : `GET /api/wave/transactions`

#### Fonctionnalités :
- **Récupération par date** : Transactions d'un jour spécifique
- **Pagination automatique** : Support des curseurs Wave
- **Enrichissement local** : Ajout des assignations existantes
- **Filtrage avancé** : Par type, statut d'assignation, recherche

#### Paramètres supportés :
```typescript
{
  date: "2024-01-15",           // Format YYYY-MM-DD
  after: "cursor_string",       // Pagination
  first: "50",                  // Nombre d'éléments
  include_subaccounts: "true"   // Inclure sous-comptes
}
```

#### Réponse enrichie :
```typescript
{
  page_info: {
    start_cursor: string | null,
    end_cursor: string,
    has_next_page: boolean
  },
  date: "2024-01-15",
  items: [
    {
      // Données Wave originales
      timestamp: "2024-01-15T14:41:15Z",
      transaction_id: "T_V3TFOUE7VU",
      amount: "15000",
      fee: "150",
      currency: "XOF",
      counterparty_name: "Jean Dupont",
      counterparty_mobile: "+221761110000",
      is_reversal: false,
      
      // Enrichissement local
      localAssignment: {
        id: "assignment_id",
        type: "revenue",
        description: "Paiement projet X",
        project: { id: "proj_1", name: "Site Web" },
        client: { id: "client_1", name: "Entreprise ABC" }
      }
    }
  ]
}
```

## 📋 Assignation des transactions

### API : `POST /api/wave/transactions/[id]/assign`

#### Processus d'assignation :
1. **Validation** : Vérification que la transaction n'est pas déjà assignée
2. **Création assignation** : Enregistrement dans `WaveTransactionAssignment`
3. **Transaction comptable** : Création automatique facture/dépense
4. **Liaison** : Association entre assignation et transaction comptable

#### Données d'assignation :
```typescript
{
  type: "revenue" | "expense",
  description: "Description de la transaction",
  notes: "Notes supplémentaires",
  projectId: "optional_project_id",
  clientId: "optional_client_id", 
  providerId: "optional_provider_id",
  category: "WAVE_PAYMENT", // Pour les dépenses
  waveTransactionData: { /* données Wave complètes */ }
}
```

#### Création automatique :

**Pour les revenus** :
```typescript
// Facture créée automatiquement
{
  invoiceNumber: "WAVE-T_V3TFOUE7VU",
  type: "INVOICE",
  amount: 15000,
  status: "PAID",
  paidDate: "2024-01-15T14:41:15Z",
  description: "Paiement Wave reçu - Description",
  notes: "Transaction Wave: T_V3TFOUE7VU\nContrepartie: Jean Dupont..."
}
```

**Pour les dépenses** :
```typescript
// Dépense créée automatiquement
{
  description: "Paiement Wave envoyé - Description",
  amount: 15000,
  category: "WAVE_PAYMENT",
  date: "2024-01-15T14:41:15Z",
  notes: "Transaction Wave: T_V3TFOUE7VU\nContrepartie: Jean Dupont..."
}
```

### Suppression d'assignation : `DELETE /api/wave/transactions/[id]/assign`

- **Suppression en cascade** : Assignation + transaction comptable associée
- **Sécurité** : Vérification de propriété utilisateur
- **Atomicité** : Transaction de base de données

## 💰 Remboursement des transactions

### API : `POST /api/wave/transactions/[id]/refund`

#### Fonctionnalités :
- **Remboursement Wave** : Appel à l'API Wave `/v1/transactions/:id/refund`
- **Mise à jour locale** : Création dépense de remboursement
- **Traçabilité** : Marquage des factures comme remboursées

#### Processus de remboursement :
1. **Validation** : Vérification que la transaction peut être remboursée
2. **Appel Wave** : Remboursement via API Wave
3. **Comptabilité locale** : Création dépense de remboursement
4. **Mise à jour statut** : Facture marquée comme `CANCELLED`

#### Exemple de dépense de remboursement :
```typescript
{
  description: "REMBOURSEMENT - Paiement projet X",
  amount: 15000,
  category: "WAVE_REFUND",
  date: "2024-01-15T16:30:00Z",
  notes: "Remboursement de la transaction Wave: T_V3TFOUE7VU\n..."
}
```

## 🗄️ Modèle de données

### WaveTransactionAssignment
```typescript
model WaveTransactionAssignment {
  id                String    @id @default(cuid())
  transactionId     String    // ID Wave
  type              String    // 'revenue' | 'expense'
  description       String
  notes             String?
  amount            Float
  fee               Float     @default(0)
  currency          String    @default("XOF")
  timestamp         DateTime  // Date transaction Wave
  counterpartyName  String?
  counterpartyMobile String?
  isReversal        Boolean   @default(false)
  
  // Relations optionnelles
  projectId         String?
  project           Project?  @relation(fields: [projectId], references: [id])
  clientId          String?
  client            Client?   @relation(fields: [clientId], references: [id])
  providerId        String?
  provider          Provider? @relation(fields: [providerId], references: [id])
  
  // Transactions comptables créées
  invoiceId         String?   @unique
  invoice           Invoice?  @relation(fields: [invoiceId], references: [id])
  expenseId         String?   @unique
  expense           Expense?  @relation(fields: [expenseId], references: [id])
  
  // Données Wave complètes (JSON)
  waveData          Json?
  
  userId            String
  user              User      @relation(fields: [userId], references: [id])
  
  @@unique([userId, transactionId])
}
```

## 🎨 Interface utilisateur

### Page principale : `/wave-transactions`

#### Fonctionnalités UI :
- **Sélecteur de date** : Navigation par jour
- **Filtres avancés** : Type, assignation, recherche
- **Pagination** : Chargement progressif
- **Actions contextuelles** : Assigner, supprimer, rembourser

#### Affichage des transactions :
```tsx
// Icônes selon le type
- Revenus (montant > 0): ArrowUpRight (vert)
- Dépenses (montant < 0): ArrowDownLeft (rouge)  
- Annulations: RotateCcw (violet)

// Badges informatifs
- "Assignée" : Transaction déjà liée
- "Annulation" : Transaction d'annulation
- Projet/Client/Prestataire : Entités associées
```

#### Dialog d'assignation :
- **Pré-remplissage intelligent** : Type selon montant
- **Sélecteurs dynamiques** : Projets, clients, prestataires
- **Validation** : Description obligatoire
- **Aperçu** : Données transaction Wave

### Intégration dans la navigation :
```
Finances
├── Transactions (existant)
├── Transactions Wave (nouveau)
└── Dépenses (existant)
```

## 🔄 Flux de travail typique

### 1. Récupération quotidienne
```typescript
// Utilisateur sélectionne une date
// → API récupère transactions Wave du jour
// → Affichage avec statut d'assignation
// → Pagination automatique si > 50 transactions
```

### 2. Assignation d'un revenu
```typescript
// Transaction Wave reçue: +15,000 XOF
// → Clic "Assigner"
// → Type: "Revenu", Description: "Paiement projet X"
// → Sélection: Projet "Site Web", Client "Entreprise ABC"
// → Création facture WAVE-T_V3TFOUE7VU (PAID)
// → Assignation enregistrée
```

### 3. Assignation d'une dépense
```typescript
// Transaction Wave envoyée: -5,000 XOF
// → Clic "Assigner"  
// → Type: "Dépense", Catégorie: "PROVIDER_PAYMENT"
// → Sélection: Prestataire "Jean Développeur"
// → Création dépense avec notes détaillées
// → Assignation enregistrée
```

### 4. Remboursement
```typescript
// Transaction revenue assignée
// → Clic "Rembourser"
// → Confirmation utilisateur
// → Appel API Wave /refund
// → Création dépense remboursement
// → Facture marquée CANCELLED
```

## 📊 Avantages du système

### 🎯 **Traçabilité complète**
- Toutes les transactions Wave sont visibles
- Assignations optionnelles mais recommandées
- Historique complet des actions

### 🔄 **Synchronisation automatique**
- Création automatique factures/dépenses
- Pas de double saisie
- Cohérence comptable garantie

### 🎨 **Interface intuitive**
- Filtres et recherche avancés
- Actions contextuelles claires
- Feedback visuel immédiat

### 🔒 **Sécurité renforcée**
- Validation des permissions
- Transactions atomiques
- Gestion d'erreurs complète

## 🚀 Cas d'utilisation

### 1. **Freelance recevant des paiements**
- Récupération des paiements clients via Wave
- Assignation automatique aux projets
- Génération factures avec statut PAID

### 2. **Agence payant des prestataires**
- Récupération des paiements envoyés
- Assignation aux prestataires et projets
- Suivi des dépenses par catégorie

### 3. **Gestion des remboursements**
- Remboursement clients insatisfaits
- Traçabilité comptable complète
- Mise à jour automatique des statuts

## 🔧 Configuration technique

### Variables d'environnement :
```env
WAVE_API_BASE_URL=https://api.wave.com/v1
```

### Dépendances :
- **Wave API Key** : Configurée dans profil utilisateur
- **Prisma** : Gestion base de données
- **Next.js API Routes** : Backend
- **Motion Dev** : Animations interface

## 📈 Métriques et monitoring

### Données suivies :
- **Taux d'assignation** : % transactions assignées
- **Types de transactions** : Répartition revenus/dépenses
- **Fréquence d'utilisation** : Utilisation quotidienne
- **Erreurs API** : Monitoring appels Wave

### Logs d'audit :
```typescript
console.log(`Transaction ${transactionId} assignée par ${userId} - Type: ${type}`)
console.log(`Remboursement ${transactionId} effectué par ${userId}`)
```

## ✅ Tests et validation

### Scénarios testés :
- ✅ **Récupération** : Transactions avec pagination
- ✅ **Assignation** : Création facture/dépense
- ✅ **Suppression** : Suppression en cascade
- ✅ **Remboursement** : Appel API Wave + comptabilité
- ✅ **Filtres** : Recherche et filtrage
- ✅ **Pagination** : Chargement progressif

### Validations :
- ✅ **Sécurité** : Authentification et autorisation
- ✅ **Performance** : Temps de réponse < 2s
- ✅ **Fiabilité** : Gestion d'erreurs complète
- ✅ **Usabilité** : Interface intuitive

## 🔮 Évolutions futures

### Fonctionnalités prévues :
- **Import en masse** : Assignation multiple
- **Règles automatiques** : Assignation basée sur patterns
- **Rapports avancés** : Analytics des transactions
- **Notifications** : Alertes nouvelles transactions

### Améliorations UX :
- **Recherche intelligente** : Suggestions basées sur historique
- **Templates d'assignation** : Modèles pré-configurés
- **Aperçu impact** : Simulation avant assignation

---

## 🎉 Résultat

Le système de gestion des transactions Wave est **opérationnel** et offre :

- ✅ **Récupération complète** : Toutes les transactions Wave avec pagination
- ✅ **Assignation flexible** : Liaison aux entités locales (projets, clients, prestataires)
- ✅ **Remboursement intégré** : API Wave + comptabilité locale
- ✅ **Interface moderne** : UX optimisée avec filtres et recherche
- ✅ **Traçabilité totale** : Synchronisation automatique avec comptabilité
- ✅ **Sécurité renforcée** : Validations et gestion d'erreurs

Cette fonctionnalité transforme REV en un **hub central** pour la gestion financière Wave, éliminant la double saisie et garantissant la cohérence comptable. 