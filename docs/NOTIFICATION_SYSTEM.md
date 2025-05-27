# Système de Notifications REV

## 🎯 Vue d'ensemble

Le système REV intègre maintenant un **système complet de notifications** permettant de :
- **Recevoir** et traiter les webhooks Wave avec vérification de signature
- **Créer** des notifications automatiques pour tous les événements importants
- **Envoyer** des emails de notification si configuré
- **Gérer** les notifications via une interface moderne
- **Filtrer** et rechercher dans l'historique des notifications

## 🔔 Types de notifications supportés

### Notifications Wave
- `WAVE_PAYMENT_RECEIVED` : Paiement Wave reçu
- `WAVE_PAYMENT_FAILED` : Paiement Wave échoué
- `WAVE_CHECKOUT_COMPLETED` : Checkout Wave complété
- `WAVE_CHECKOUT_FAILED` : Checkout Wave échoué

### Notifications métier
- `INVOICE_PAID` : Facture payée
- `INVOICE_OVERDUE` : Facture en retard
- `PROJECT_DEADLINE` : Échéance projet approche
- `TASK_DUE` : Tâche due
- `SUBSCRIPTION_REMINDER` : Rappel abonnement
- `PROVIDER_PAYMENT_COMPLETED` : Paiement prestataire effectué
- `PROVIDER_PAYMENT_FAILED` : Paiement prestataire échoué

### Notifications système
- `SUCCESS` : Opération réussie
- `ERROR` : Erreur système
- `WARNING` : Avertissement
- `INFO` : Information générale

## 🔧 Configuration

### 1. Configuration utilisateur
```typescript
// Dans le modèle User
emailNotifications: Boolean @default(true) // Activer/désactiver les emails
smtpHost: String?                          // Configuration SMTP
smtpPort: Int?
smtpUser: String?
smtpPassword: String?
smtpFrom: String?
waveWebhookSecret: String?                 // Secret webhook Wave
```

### 2. Configuration Wave webhook
```typescript
// Secret fourni par Wave
waveWebhookSecret: "wave_sn_WHS_xz4m6g8rjs9bshxy05xj4khcvjv7j3hcp4fbpvv6met0zdrjvezg"

// URL webhook à configurer chez Wave
webhookUrl: "https://votre-domaine.com/api/webhooks/wave"
```

## 📡 Gestion des webhooks Wave

### Vérification de signature
```typescript
function verifyWaveSignature(
  waveWebhookSecret: string,
  waveSignature: string,
  webhookBody: string
): boolean {
  const parts = waveSignature.split(",")
  const timestamp = parts[0].split("=")[1]
  const signatures = parts.slice(1).map(part => part.split("=")[1])
  
  const payload = timestamp + webhookBody
  const computedHmac = crypto
    .createHmac("sha256", waveWebhookSecret)
    .update(payload)
    .digest("hex")
  
  return signatures.includes(computedHmac)
}
```

### Événements supportés
```typescript
// checkout.session.completed
{
  "id": "EV_QvEZuDSQbLdI",
  "type": "checkout.session.completed",
  "data": {
    "id": "cos-18qq25rgr100a",
    "amount": "1000",
    "checkout_status": "complete",
    "payment_status": "succeeded",
    "transaction_id": "TCN4Y4ZC3FM",
    "when_completed": "2021-12-08T10:15:32Z"
  }
}

// merchant.payment_received
{
  "id": "AE_ijzo7oGgrlM8",
  "type": "merchant.payment_received",
  "data": {
    "id": "T_46HS5COOWE",
    "amount": "1000",
    "currency": "XOF",
    "sender_mobile": "+221761110001",
    "merchant_id": "M_46HS5COOWE",
    "when_created": "2021-12-08T10:13:04Z"
  }
}
```

### Traitement asynchrone
```typescript
export async function POST(request: NextRequest) {
  // Répondre immédiatement (recommandation Wave)
  const response = NextResponse.json({ received: true }, { status: 200 })

  // Traitement asynchrone
  setImmediate(async () => {
    // Vérification signature + traitement événement
  })

  return response
}
```

## 📧 Système d'envoi d'emails

### Template HTML automatique
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    .header { background: linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899); }
    .type-success { background: #dcfce7; color: #166534; }
    .type-error { background: #fef2f2; color: #dc2626; }
    .action-button { background: #3b82f6; color: white; padding: 12px 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>REV - Gestion Freelance</h1>
    </div>
    <div class="content">
      <div class="notification-type type-success">Paiement Wave reçu</div>
      <h2>Paiement reçu !</h2>
      <p>La facture INV-001 de 15000 XOF a été payée avec succès.</p>
      <a href="https://app.com/invoices/123" class="action-button">
        Voir les détails
      </a>
    </div>
  </div>
</body>
</html>
```

### Conditions d'envoi
- ✅ `user.emailNotifications = true`
- ✅ Configuration SMTP complète
- ✅ `sendEmail !== false` dans les paramètres

## 🎨 Interface utilisateur

### 1. Page notifications (`/notifications`)
```typescript
// Fonctionnalités
- Liste complète avec pagination
- Filtres par type, statut, recherche
- Actions en masse (marquer lu, supprimer)
- Sélection multiple avec checkboxes
- Statistiques en temps réel
- Navigation contextuelle vers les entités liées
```

### 2. Popover notifications (sidebar)
```typescript
// Fonctionnalités
- Badge de comptage des non lues
- Aperçu des 10 dernières notifications
- Polling automatique (30s)
- Actions rapides (marquer lu, voir tout)
- Animation et feedback visuel
- Navigation directe vers les détails
```

### 3. Composants visuels
```typescript
// Icônes par type
WAVE_PAYMENT_RECEIVED → DollarSign (vert)
WAVE_PAYMENT_FAILED → XCircle (rouge)
INVOICE_PAID → CheckCircle (vert)
INVOICE_OVERDUE → AlertCircle (orange)
PROJECT_DEADLINE → Calendar (bleu)

// Couleurs par type
SUCCESS → bg-green-50 border-green-200
ERROR → bg-red-50 border-red-200
WARNING → bg-orange-50 border-orange-200
INFO → bg-blue-50 border-blue-200
```

## 🛠️ API et utilisation

### 1. API Notifications
```typescript
// GET /api/notifications
{
  notifications: Notification[],
  unreadCount: number
}

// POST /api/notifications
{
  title: string,
  message: string,
  type: NotificationType,
  actionUrl?: string,
  metadata?: any
}

// PATCH /api/notifications
{
  notificationId?: string,     // Marquer une comme lue
  notificationIds?: string[],  // Marquer plusieurs comme lues
  markAllAsRead?: boolean      // Marquer toutes comme lues
}

// DELETE /api/notifications
{
  notificationIds: string[]    // Supprimer plusieurs
}
// ou ?action=deleteRead        // Supprimer toutes les lues
```

### 2. Bibliothèque utilitaire
```typescript
import { createNotification } from "@/lib/notifications"

// Création simple
await createNotification({
  userId: "user123",
  title: "Paiement reçu !",
  message: "Facture INV-001 payée",
  type: "INVOICE_PAID",
  actionUrl: "/invoices/123",
  metadata: { amount: 15000, currency: "XOF" }
})

// Fonctions spécialisées
await notifyWavePaymentReceived(userId, "15000", "XOF", "T_123", "+221761110001")
await notifyInvoicePaid(userId, "INV-001", 15000, "XOF", "invoice123")
await notifyProviderPaymentCompleted(userId, "Jean Dev", 5000, "XOF", "provider123")
await notifyProjectDeadline(userId, "Site Web", new Date(), "project123")
```

### 3. API de test
```typescript
// POST /api/notifications/test
{
  type: "WAVE_PAYMENT_RECEIVED" // Type de notification à tester
}
```

## 🔄 Flux de traitement

### 1. Réception webhook Wave
```
1. Webhook reçu → Réponse HTTP 200 immédiate
2. Vérification signature HMAC SHA256
3. Parsing JSON et validation
4. Identification utilisateur par secret
5. Traitement asynchrone de l'événement
6. Création notification + envoi email
```

### 2. Création notification manuelle
```
1. Appel API ou fonction utilitaire
2. Validation des paramètres
3. Insertion en base de données
4. Envoi email automatique (si configuré)
5. Mise à jour statut email
```

### 3. Consultation notifications
```
1. Chargement avec filtres/pagination
2. Comptage des non lues
3. Affichage avec icônes/couleurs
4. Actions utilisateur (lire, supprimer)
5. Navigation contextuelle
```

## 📊 Modèle de données

### Notification
```typescript
model Notification {
  id        String    @id @default(cuid())
  title     String    // Titre de la notification
  message   String    // Message descriptif
  type      NotificationType @default(INFO)
  isRead    Boolean   @default(false)
  
  // Métadonnées
  actionUrl String?   // URL de navigation
  metadata  Json?     // Données contextuelles
  
  // Relations
  relatedType String? // Type d'entité liée
  relatedId   String? // ID de l'entité liée
  
  // Email
  emailSent   Boolean @default(false)
  emailSentAt DateTime?
  
  // Utilisateur
  userId    String
  user      User @relation(fields: [userId], references: [id])
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Types supportés
```typescript
enum NotificationType {
  INFO
  WARNING
  ERROR
  SUCCESS
  WAVE_PAYMENT_RECEIVED
  WAVE_PAYMENT_FAILED
  WAVE_CHECKOUT_COMPLETED
  WAVE_CHECKOUT_FAILED
  INVOICE_PAID
  INVOICE_OVERDUE
  PROJECT_DEADLINE
  TASK_DUE
  SUBSCRIPTION_REMINDER
  PROVIDER_PAYMENT_COMPLETED
  PROVIDER_PAYMENT_FAILED
}
```

## 🔒 Sécurité

### Vérification webhook Wave
- ✅ Signature HMAC SHA256 obligatoire
- ✅ Timestamp pour éviter les attaques replay
- ✅ Secret unique par utilisateur
- ✅ Validation du format JSON

### Protection API
- ✅ Authentification NextAuth obligatoire
- ✅ Validation des permissions utilisateur
- ✅ Sanitisation des entrées
- ✅ Rate limiting implicite

### Données sensibles
- ✅ Secrets webhook chiffrés en base
- ✅ Métadonnées JSON validées
- ✅ Pas d'exposition d'informations sensibles
- ✅ Logs sécurisés sans secrets

## 📈 Métriques et monitoring

### Données suivies
```typescript
// Statistiques notifications
- Total notifications créées
- Taux de lecture (read rate)
- Emails envoyés avec succès
- Notifications par type
- Temps de réponse webhook

// Logs d'audit
console.log(`Notification créée: ${type} pour ${userId}`)
console.log(`Email envoyé: ${notification.id}`)
console.log(`Webhook Wave traité: ${eventType}`)
```

### Tableaux de bord
- 📊 Notifications par jour/semaine/mois
- 📧 Taux de délivrance des emails
- ⚡ Performance des webhooks Wave
- 👥 Engagement utilisateur

## 🚀 Cas d'utilisation

### 1. E-commerce avec Wave
```typescript
// Client paie via Wave Checkout
→ Webhook checkout.session.completed
→ Facture marquée PAID
→ Notification "Paiement reçu !"
→ Email automatique au freelance
→ Mise à jour dashboard temps réel
```

### 2. Paiement prestataire
```typescript
// Freelance paie un prestataire
→ API Wave payout
→ Notification "Paiement envoyé"
→ Email de confirmation
→ Historique dans profil prestataire
```

### 3. Gestion des échéances
```typescript
// Projet approche de l'échéance
→ Tâche cron quotidienne
→ Notification "Échéance dans 3 jours"
→ Email de rappel
→ Action: voir projet
```

## ✅ Tests et validation

### Tests automatisés
```bash
# Test création notification
POST /api/notifications/test
→ Vérifier création en base
→ Vérifier envoi email
→ Vérifier métadonnées

# Test webhook Wave
POST /api/webhooks/wave (avec signature valide)
→ Vérifier traitement événement
→ Vérifier création notification
→ Vérifier mise à jour entités
```

### Tests manuels
- ✅ Interface notifications responsive
- ✅ Filtres et recherche fonctionnels
- ✅ Actions en masse opérationnelles
- ✅ Popover temps réel
- ✅ Navigation contextuelle
- ✅ Emails bien formatés

## 🔮 Évolutions futures

### Fonctionnalités prévues
- **Push notifications** : Notifications navigateur
- **SMS** : Envoi via Twilio/Vonage
- **Slack/Discord** : Intégrations webhooks
- **Templates personnalisés** : Emails sur mesure
- **Règles automatiques** : Conditions de déclenchement
- **Analytics avancés** : Métriques détaillées

### Améliorations UX
- **Notifications groupées** : Par projet/client
- **Snooze** : Reporter une notification
- **Priorités** : Urgent/Normal/Faible
- **Catégories** : Organisation personnalisée
- **Recherche intelligente** : Suggestions automatiques

---

## 🎉 Résultat

Le système de notifications REV est **opérationnel** et offre :

- ✅ **Webhooks Wave sécurisés** : Vérification signature + traitement asynchrone
- ✅ **Notifications automatiques** : Tous les événements importants couverts
- ✅ **Emails HTML riches** : Templates professionnels avec actions
- ✅ **Interface moderne** : Page complète + popover temps réel
- ✅ **API complète** : CRUD + actions en masse + test
- ✅ **Bibliothèque utilitaire** : Fonctions spécialisées pour chaque cas
- ✅ **Sécurité renforcée** : Authentification + validation + chiffrement
- ✅ **Documentation complète** : Guide d'utilisation et d'intégration

Cette fonctionnalité transforme REV en un **système proactif** qui informe automatiquement l'utilisateur de tous les événements importants, améliorant significativement l'expérience utilisateur et la réactivité métier. 