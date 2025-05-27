# 💰 Guide Wave Transactions - Fonctionnalités Complètes

## 🎯 Fonctionnalités Disponibles

### 1. Affichage du Solde Wave
- **Solde en temps réel** : Affichage du solde actuel du compte Wave
- **Informations du compte** : Nom et numéro de téléphone associés
- **Actualisation manuelle** : Bouton pour rafraîchir le solde
- **Chargement automatique** : Mise à jour lors du changement de date

### 2. Actions Rapides de Paiement

#### 🔹 Payer un Numéro (Général)
- **Usage** : Envoyer de l'argent à n'importe quel numéro
- **Champs** : Montant, numéro, nom (optionnel), motif
- **Assignation** : Projet optionnel pour la comptabilité
- **Notification** : Création automatique d'une notification

#### 🔹 Payer un Prestataire
- **Usage** : Paiement officiel d'un prestataire enregistré
- **Champs** : Montant, numéro, prestataire (liste), motif
- **Comptabilité** : Création automatique d'un `ProviderPayment`
- **Suivi** : Lien avec projet si spécifié
- **Notification** : Email et notification système

#### 🔹 Rembourser un Client
- **Usage** : Remboursement d'un client pour annulation/erreur
- **Champs** : Montant, numéro, client (liste), motif
- **Comptabilité** : Création d'une dépense de remboursement
- **Suivi** : Historique des remboursements
- **Notification** : Confirmation du remboursement

#### 🔹 Annuler un Paiement Prestataire
- **Usage** : Annulation comptable d'un paiement prestataire
- **Processus** : Marque le paiement comme "FAILED"
- **Compensation** : Création d'une dépense négative
- **Motif** : Saisie obligatoire de la raison
- **Notification** : Alerte d'annulation

### 3. Gestion des Transactions

#### 📊 Assignation Intelligente
- **Auto-détection** : Type suggéré selon le montant (+ = revenu, - = dépense)
- **Métadonnées** : Pré-remplissage avec les données Wave
- **Relations** : Liaison avec projets, clients, prestataires
- **Catégorisation** : Classification automatique des dépenses

#### 🔍 Filtres Avancés
- **Par type** : Revenus (reçus) / Dépenses (envoyés)
- **Par statut** : Assignées / Non assignées
- **Par date** : Sélection de jour spécifique
- **Recherche** : ID, nom, téléphone, description

#### 💸 Actions sur Transactions
- **Remboursement** : Pour les transactions reçues
- **Assignation** : Lien avec la comptabilité locale
- **Suppression** : Retrait de l'assignation
- **Visualisation** : Détails complets avec métadonnées

## 🔧 APIs Créées

### `/api/wave/balance` (GET)
```typescript
// Récupère le solde Wave de l'utilisateur
Response: {
  balance: string,
  currency: string,
  account_name: string,
  account_mobile: string
}
```

### `/api/wave/send-money` (POST)
```typescript
// Envoie de l'argent via Wave
Body: {
  amount: number,
  recipient_mobile: string,
  recipient_name?: string,
  payment_reason?: string,
  type: 'provider_payment' | 'client_refund' | 'general_payment',
  providerId?: string,
  clientId?: string,
  projectId?: string
}
```

### `/api/wave/cancel-payment` (POST)
```typescript
// Annule un paiement prestataire
Body: {
  paymentId: string,
  reason?: string
}
```

## 🎮 Guide d'Utilisation

### 1. Consulter le Solde
1. **Accéder** à `/wave-transactions`
2. **Visualiser** le solde dans la carte "Solde Wave"
3. **Actualiser** avec le bouton si nécessaire
4. **Vérifier** les informations du compte

### 2. Effectuer un Paiement

#### Paiement Général
1. **Cliquer** sur "Payer un numéro"
2. **Saisir** le montant et le numéro
3. **Ajouter** un motif (recommandé)
4. **Sélectionner** un projet si applicable
5. **Confirmer** l'envoi

#### Paiement Prestataire
1. **Cliquer** sur "Payer prestataire"
2. **Sélectionner** le prestataire dans la liste
3. **Saisir** le montant et le numéro
4. **Ajouter** le motif du paiement
5. **Lier** à un projet si nécessaire
6. **Confirmer** → Création automatique du `ProviderPayment`

#### Remboursement Client
1. **Cliquer** sur "Rembourser client"
2. **Sélectionner** le client concerné
3. **Saisir** le montant à rembourser
4. **Expliquer** le motif du remboursement
5. **Confirmer** → Création d'une dépense de remboursement

### 3. Gérer les Transactions

#### Assigner une Transaction
1. **Localiser** la transaction non assignée
2. **Cliquer** sur "Assigner"
3. **Choisir** le type (revenu/dépense)
4. **Compléter** la description
5. **Lier** aux entités (projet, client, prestataire)
6. **Sauvegarder** l'assignation

#### Rembourser une Transaction Reçue
1. **Identifier** la transaction à rembourser (montant positif)
2. **Cliquer** sur "Rembourser"
3. **Confirmer** l'action (irréversible)
4. **Vérifier** la création de la transaction de remboursement

#### Annuler un Paiement Prestataire
1. **Trouver** le paiement prestataire dans l'historique
2. **Utiliser** le bouton "Annuler paiement" (actions rapides)
3. **Sélectionner** le paiement à annuler
4. **Saisir** la raison de l'annulation
5. **Confirmer** → Compensation comptable automatique

## 🔒 Sécurité et Validations

### Authentification
- **Session NextAuth** requise pour toutes les APIs
- **Clé API Wave** obligatoire et chiffrée
- **Isolation utilisateur** : Chaque utilisateur ne voit que ses données

### Validations
- **Montants positifs** pour tous les paiements
- **Numéros de téléphone** au format international
- **Prestataires/Clients** existants uniquement
- **Solde suffisant** (vérification côté Wave)

### Notifications
- **Succès** : Confirmation de chaque action
- **Échecs** : Messages d'erreur détaillés
- **Emails** : Envoi automatique si SMTP configuré
- **Historique** : Traçabilité complète des actions

## 📊 Intégration Comptable

### Création Automatique d'Enregistrements

#### Paiement Prestataire
```sql
-- Table: ProviderPayment
INSERT INTO ProviderPayment (
  amount, fees, paymentMethod, status, 
  wavePayoutId, providerId, userId, projectId
)
```

#### Dépense Générale
```sql
-- Table: Expense
INSERT INTO Expense (
  description, amount, category, type, userId, projectId
)
```

#### Assignation Wave
```sql
-- Table: WaveTransactionAssignment
INSERT INTO WaveTransactionAssignment (
  transactionId, type, description, amount, 
  fee, currency, userId, projectId, clientId, providerId
)
```

### Compensation d'Annulation
```sql
-- Paiement annulé
UPDATE ProviderPayment SET status = 'FAILED'

-- Dépense de compensation (montant négatif)
INSERT INTO Expense (amount = -original_amount, category = 'Annulation paiement')
```

## 🎯 Cas d'Usage Typiques

### 1. Paiement Mensuel Prestataire
1. **Recevoir** la facture du prestataire
2. **Utiliser** "Payer prestataire"
3. **Sélectionner** le prestataire et le projet
4. **Saisir** le montant et envoyer
5. **Vérifier** la création du `ProviderPayment`
6. **Confirmer** la réception par le prestataire

### 2. Remboursement Client Mécontent
1. **Client** demande un remboursement
2. **Utiliser** "Rembourser client"
3. **Sélectionner** le client et le montant
4. **Expliquer** le motif (ex: "Annulation projet")
5. **Envoyer** le remboursement
6. **Informer** le client de l'envoi

### 3. Erreur de Paiement Prestataire
1. **Constater** l'erreur (mauvais montant/prestataire)
2. **Utiliser** "Annuler paiement"
3. **Sélectionner** le paiement erroné
4. **Expliquer** l'erreur
5. **Confirmer** l'annulation comptable
6. **Refaire** le paiement correct si nécessaire

### 4. Assignation Transaction Reçue
1. **Client** paie via Wave
2. **Transaction** apparaît dans la liste
3. **Cliquer** "Assigner" sur la transaction
4. **Sélectionner** "Revenu" et le client
5. **Lier** au projet concerné
6. **Sauvegarder** pour la comptabilité

## 🚀 Avantages

### Pour l'Utilisateur
- **Interface unifiée** : Tout Wave dans une seule page
- **Actions rapides** : Paiements en quelques clics
- **Suivi complet** : Historique et assignations
- **Notifications** : Alertes en temps réel

### Pour la Comptabilité
- **Assignation automatique** : Lien avec les entités
- **Catégorisation** : Classification des dépenses
- **Traçabilité** : Historique complet des actions
- **Compensation** : Gestion des annulations

### Pour la Gestion
- **Solde temps réel** : Visibilité financière
- **Paiements prestataires** : Workflow structuré
- **Remboursements clients** : Process standardisé
- **Reporting** : Données pour analyses

## 🔮 Évolutions Futures

### Fonctionnalités Prévues
- **Paiements récurrents** : Automatisation mensuelle
- **Budgets par projet** : Limites de dépenses
- **Rapports Wave** : Analytics détaillées
- **Intégration factures** : Paiement direct depuis facture
- **Multi-devises** : Support EUR, USD
- **Webhooks avancés** : Synchronisation temps réel

### Améliorations UX
- **Favoris** : Numéros fréquents
- **Templates** : Motifs pré-définis
- **Validation** : Vérification numéros
- **Historique** : Recherche avancée
- **Export** : CSV, PDF des transactions

Le système Wave Transactions de REV est maintenant **complet et opérationnel** ! 🎉 