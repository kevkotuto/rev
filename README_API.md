# 📱 API REV - Documentation Complète pour Expo

## 🎯 Vue d'ensemble

Cette API REST permet de gérer une application de freelance complète avec :
- Gestion des clients, projets et prestataires
- Système de facturation (proformas et factures)
- Suivi des dépenses et abonnements
- Gestion des tâches et calendrier
- Notifications et rappels automatiques
- Intégration Wave CI pour les paiements

**Base URL :** `https://rev.generale-ci.com/api`
**Format :** JSON
**Authentification :** NextAuth (session-based)

---

## 🔐 Authentification

### 1. Inscription
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "motdepasse123",
  "confirmPassword": "motdepasse123"
}
```

**Réponse :**
```json
{
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "message": "Utilisateur créé avec succès"
}
```

### 2. Connexion NextAuth
Utilisez NextAuth avec le provider credentials. L'authentification se fait via cookies de session.

**Configuration Expo :**
```javascript
// Utiliser expo-auth-session ou similaire
const signIn = async (email, password) => {
  const response = await fetch('/api/auth/callback/credentials', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      email,
      password,
      csrfToken: await getCsrfToken()
    }),
    credentials: 'include'
  });
};
```

---

## 👥 Gestion des Clients

### Lister les clients
```http
GET /api/clients
```

**Réponse :**
```json
[
  {
    "id": "client_id",
    "name": "Client Name",
    "email": "client@example.com",
    "phone": "+1234567890",
    "address": "123 Street",
    "company": "Company Inc",
    "notes": "Notes importantes",
    "photo": "url_photo",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### Créer un client
```http
POST /api/clients
Content-Type: application/json

{
  "name": "Nouveau Client",
  "email": "nouveau@client.com",
  "phone": "+1234567890",
  "address": "Adresse complète",
  "company": "Entreprise SARL",
  "notes": "Notes sur le client",
  "photo": "base64_ou_url"
}
```

### Obtenir un client
```http
GET /api/clients/{id}
```

### Modifier un client
```http
PUT /api/clients/{id}
Content-Type: application/json

{
  "name": "Nom modifié",
  "email": "email@modifie.com"
}
```

### Supprimer un client
```http
DELETE /api/clients/{id}
```

---

## 🏗️ Gestion des Projets

### Lister les projets
```http
GET /api/projects
```

**Paramètres de requête optionnels :**
- `clientId` : Filtrer par client
- `status` : IN_PROGRESS, COMPLETED, ON_HOLD, CANCELLED
- `type` : PERSONAL, CLIENT, DEVELOPMENT, MAINTENANCE, CONSULTING

**Réponse :**
```json
[
  {
    "id": "project_id",
    "name": "Nom du Projet",
    "description": "Description détaillée",
    "type": "CLIENT",
    "amount": 50000,
    "status": "IN_PROGRESS",
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": null,
    "logo": "url_logo",
    "clientId": "client_id",
    "client": {
      "id": "client_id",
      "name": "Client Name"
    },
    "services": [
      {
        "id": "service_id",
        "name": "Service 1",
        "description": "Description du service",
        "amount": 25000,
        "quantity": 2,
        "unit": "page"
      }
    ],
    "expenses": [...],
    "tasks": [...],
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### Créer un projet
```http
POST /api/projects
Content-Type: application/json

{
  "name": "Nouveau Projet",
  "description": "Description du projet",
  "type": "CLIENT",
  "amount": 100000,
  "status": "IN_PROGRESS",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "clientId": "client_id",
  "logo": "base64_ou_url"
}
```

### Obtenir un projet avec détails complets
```http
GET /api/projects/{id}
```

### Services d'un projet
```http
GET /api/projects/{id}/services
POST /api/projects/{id}/services
PUT /api/project-services/{service_id}
DELETE /api/project-services/{service_id}
```

**Créer un service :**
```json
{
  "name": "Nom du service",
  "description": "Description",
  "amount": 15000,
  "quantity": 1,
  "unit": "heure"
}
```

### Prestataires d'un projet
```http
GET /api/projects/{id}/providers
POST /api/projects/{id}/providers
PUT /api/project-providers/{provider_id}
DELETE /api/project-providers/{provider_id}
```

### Dépenses d'un projet
```http
GET /api/projects/{id}/expenses
```

### Tâches d'un projet
```http
GET /api/projects/{id}/tasks
POST /api/projects/{id}/tasks
```

---

## 🧾 Système de Facturation

### Types de documents
- **PROFORMA** : Devis/Facture proforma
- **INVOICE** : Facture définitive

### Statuts
- **PENDING** : En attente
- **PAID** : Payé
- **OVERDUE** : En retard
- **CANCELLED** : Annulé
- **CONVERTED** : Convertie (pour proformas)

### Lister les factures/proformas
```http
GET /api/invoices
```

**Paramètres :**
- `type` : PROFORMA ou INVOICE
- `status` : PENDING, PAID, OVERDUE, etc.
- `clientId` : Filtrer par client
- `projectId` : Filtrer par projet

### Créer une proforma
```http
POST /api/invoices
Content-Type: application/json

{
  "type": "PROFORMA",
  "amount": 75000,
  "dueDate": "2024-02-01",
  "projectId": "project_id",
  "notes": "Notes de la proforma",
  "clientName": "Nom Client",
  "clientEmail": "client@email.com",
  "clientAddress": "Adresse client",
  "clientPhone": "+1234567890",
  "generatePaymentLink": false
}
```

### Créer une facture avec lien Wave
```http
POST /api/invoices
Content-Type: application/json

{
  "type": "INVOICE",
  "amount": 75000,
  "dueDate": "2024-02-01",
  "projectId": "project_id",
  "clientName": "Nom Client",
  "clientEmail": "client@email.com",
  "generatePaymentLink": true
}
```

### Convertir proforma en facture
```http
POST /api/invoices/{proforma_id}/convert
Content-Type: application/json

{
  "generatePaymentLink": true
}
```

### Conversion partielle
```http
POST /api/invoices/{proforma_id}/partial-convert
Content-Type: application/json

{
  "amount": 50000,
  "notes": "Facture partielle 1/2",
  "generatePaymentLink": true
}
```

### Marquer comme payée
```http
PUT /api/invoices/{id}/mark-paid
Content-Type: application/json

{
  "paymentMethod": "WAVE",
  "paidDate": "2024-01-15",
  "notes": "Paiement reçu via Wave"
}
```

**Méthodes de paiement :**
- `CASH` : Espèces
- `BANK_TRANSFER` : Virement
- `WAVE` : Wave CI
- `CHECK` : Chèque
- `OTHER` : Autre

### Gestion des liens Wave
```http
POST /api/invoices/{id}/payment-link
DELETE /api/invoices/{id}/payment-link
```

### Obtenir le statut de conversion
```http
GET /api/invoices/{proforma_id}/conversion-status
```

---

## 💳 Gestion des Dépenses

### Types de dépenses
- **GENERAL** : Dépense professionnelle générale
- **PROJECT** : Dépense liée à un projet
- **SUBSCRIPTION** : Abonnement avec rappels

### Lister les dépenses
```http
GET /api/expenses
```

**Paramètres :**
- `projectId` : Filtrer par projet
- `type` : GENERAL, PROJECT, SUBSCRIPTION
- `category` : OFFICE, TRANSPORT, EQUIPMENT, etc.

### Créer une dépense normale
```http
POST /api/expenses
Content-Type: application/json

{
  "description": "Achat matériel bureau",
  "amount": 25000,
  "category": "OFFICE",
  "date": "2024-01-15",
  "notes": "Achat ordinateur portable",
  "type": "GENERAL",
  "projectId": null
}
```

### Créer un abonnement
```http
POST /api/expenses
Content-Type: application/json

{
  "description": "Apple Developer Program",
  "amount": 99,
  "category": "SOFTWARE",
  "date": "2024-01-01",
  "type": "SUBSCRIPTION",
  "isSubscription": true,
  "subscriptionPeriod": "YEARLY",
  "nextRenewalDate": "2025-01-01",
  "reminderDays": 30,
  "notes": "Licence développement iOS"
}
```

### Vérifier les abonnements
```http
POST /api/expenses/check-subscriptions
```

### Abonnements à venir
```http
GET /api/expenses/check-subscriptions?days=30
```

### Renouveler un abonnement
```http
POST /api/expenses/{id}/renew-subscription
```

---

## 🔔 Système de Notifications

### Lister les notifications
```http
GET /api/notifications?unreadOnly=true
```

### Créer une notification
```http
POST /api/notifications
Content-Type: application/json

{
  "title": "Titre de la notification",
  "message": "Message détaillé",
  "type": "SUBSCRIPTION_REMINDER",
  "relatedType": "expense",
  "relatedId": "expense_id"
}
```

**Types de notifications :**
- `INFO` : Information
- `WARNING` : Avertissement
- `SUCCESS` : Succès
- `ERROR` : Erreur
- `SUBSCRIPTION_REMINDER` : Rappel d'abonnement

### Marquer comme lue
```http
PATCH /api/notifications
Content-Type: application/json

{
  "notificationId": "notification_id"
}
```

### Marquer toutes comme lues
```http
PATCH /api/notifications
Content-Type: application/json

{
  "markAllAsRead": true
}
```

---

## 👨‍💼 Gestion des Prestataires

### Lister les prestataires
```http
GET /api/providers
```

### Créer un prestataire
```http
POST /api/providers
Content-Type: application/json

{
  "name": "Nom Prestataire",
  "email": "prestataire@email.com",
  "phone": "+1234567890",
  "address": "Adresse",
  "company": "Entreprise",
  "role": "Développeur Frontend",
  "photo": "url_photo",
  "notes": "Notes importantes",
  "bankName": "Banque XYZ",
  "bankAccount": "123456789",
  "bankIban": "FR76..."
}
```

---

## ✅ Gestion des Tâches

### Lister les tâches
```http
GET /api/tasks
```

**Paramètres :**
- `projectId` : Filtrer par projet
- `status` : TODO, IN_PROGRESS, REVIEW, DONE, CANCELLED
- `priority` : LOW, MEDIUM, HIGH, URGENT

### Créer une tâche
```http
POST /api/tasks
Content-Type: application/json

{
  "title": "Titre de la tâche",
  "description": "Description détaillée",
  "status": "TODO",
  "priority": "MEDIUM",
  "dueDate": "2024-02-01",
  "projectId": "project_id",
  "parentId": null
}
```

### Modifier une tâche
```http
PUT /api/tasks/{id}
Content-Type: application/json

{
  "status": "IN_PROGRESS",
  "priority": "HIGH"
}
```

---

## 📊 Statistiques et Analytics

### Statistiques générales
```http
GET /api/statistics
```

**Réponse :**
```json
{
  "totalRevenue": 500000,
  "totalExpenses": 100000,
  "totalProjects": 25,
  "activeProjects": 8,
  "totalClients": 15,
  "pendingInvoices": 5,
  "monthlyRevenue": [
    {"month": "2024-01", "revenue": 50000},
    {"month": "2024-02", "revenue": 75000}
  ],
  "expensesByCategory": [
    {"category": "OFFICE", "amount": 25000},
    {"category": "TRANSPORT", "amount": 15000}
  ]
}
```

### Analytics du tableau de bord
```http
GET /api/analytics/dashboard
```

### Données unifiées du dashboard
```http
GET /api/dashboard/unified
```

---

## 📧 Gestion des Emails

### Lister les emails envoyés
```http
GET /api/emails
```

### Envoyer un email
```http
POST /api/emails/send
Content-Type: application/json

{
  "to": "client@email.com",
  "subject": "Votre facture",
  "content": "Contenu de l'email",
  "type": "invoice",
  "invoiceId": "invoice_id"
}
```

### Templates d'emails
```http
GET /api/emails/templates
POST /api/emails/templates
PUT /api/emails/templates/{id}
DELETE /api/emails/templates/{id}
```

---

## 📁 Gestion des Fichiers

### Upload de fichier
```http
POST /api/upload
Content-Type: multipart/form-data

file: [fichier]
category: "DOCUMENT"
description: "Description du fichier"
projectId: "project_id" (optionnel)
clientId: "client_id" (optionnel)
```

### Lister les fichiers
```http
GET /api/files
```

**Paramètres :**
- `projectId` : Filtrer par projet
- `clientId` : Filtrer par client
- `category` : DOCUMENT, IMAGE, VIDEO, etc.

---

## ⚙️ Configuration Utilisateur

### Profil utilisateur
```http
GET /api/profile
PUT /api/profile
```

**Modification du profil :**
```json
{
  "name": "Nouveau nom",
  "companyName": "Ma Société",
  "companyLogo": "url_logo",
  "address": "Adresse complète",
  "phone": "+1234567890",
  "currency": "XOF",
  "smtpHost": "smtp.gmail.com",
  "smtpPort": 587,
  "smtpUser": "email@gmail.com",
  "smtpFrom": "noreply@monsite.com"
}
```

### Configuration Wave CI
```http
PUT /api/profile
Content-Type: application/json

{
  "waveApiKey": "wave_api_key",
  "waveApiSecret": "wave_api_secret",
  "waveWebhookUrl": "https://monsite.com/api/webhooks/wave",
  "waveWebhookSecret": "webhook_secret"
}
```

### Paramètres de l'entreprise
```http
GET /api/settings/company
PUT /api/settings/company
```

---

## 🔗 Intégration Wave CI

### Vérifier le solde Wave
```http
GET /api/wave/balance
```

### Créer un checkout Wave
```http
POST /api/wave/checkout
Content-Type: application/json

{
  "amount": 50000,
  "currency": "XOF",
  "customer_name": "Nom Client",
  "customer_email": "client@email.com",
  "invoice_id": "invoice_id"
}
```

### Webhook Wave (pour notifications de paiement)
```http
POST /api/webhooks/wave
```

---

## 📅 Gestion du Calendrier

### Lister les événements
```http
GET /api/calendar
```

**Paramètres :**
- `start` : Date de début (ISO)
- `end` : Date de fin (ISO)

### Créer un événement
```http
POST /api/calendar
Content-Type: application/json

{
  "title": "Réunion client",
  "start": "2024-01-15T14:00:00.000Z",
  "end": "2024-01-15T15:00:00.000Z",
  "description": "Réunion de suivi projet",
  "projectId": "project_id",
  "clientId": "client_id"
}
```

### Déplacer un événement
```http
PUT /api/calendar/{id}/move
Content-Type: application/json

{
  "start": "2024-01-16T14:00:00.000Z",
  "end": "2024-01-16T15:00:00.000Z"
}
```

---

## 🚀 Guide d'implémentation Expo

### 1. Configuration de base
```javascript
// config/api.js
const API_BASE_URL = 'https://votre-domaine.com/api';

export const apiClient = {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Important pour les cookies de session
      ...options,
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return response.json();
  }
};
```

### 2. Services par entité
```javascript
// services/clientService.js
export const clientService = {
  async getAll() {
    return apiClient.request('/clients');
  },
  
  async getById(id) {
    return apiClient.request(`/clients/${id}`);
  },
  
  async create(data) {
    return apiClient.request('/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  async update(id, data) {
    return apiClient.request(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  
  async delete(id) {
    return apiClient.request(`/clients/${id}`, {
      method: 'DELETE',
    });
  }
};
```

### 3. Gestion des erreurs
```javascript
// utils/errorHandler.js
export const handleApiError = (error) => {
  if (error.status === 401) {
    // Rediriger vers la connexion
    router.push('/login');
  } else if (error.status === 403) {
    // Afficher message de permission
    Alert.alert('Erreur', 'Accès non autorisé');
  } else {
    // Erreur générique
    Alert.alert('Erreur', error.message || 'Une erreur est survenue');
  }
};
```

### 4. État global avec Context
```javascript
// context/AppContext.js
const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  
  // Actions pour chaque entité
  const actions = {
    clients: {
      load: async () => {
        const data = await clientService.getAll();
        setClients(data);
      },
      create: async (clientData) => {
        const newClient = await clientService.create(clientData);
        setClients(prev => [...prev, newClient]);
      }
    }
  };
  
  return (
    <AppContext.Provider value={{ user, clients, projects, actions }}>
      {children}
    </AppContext.Provider>
  );
};
```

### 5. Composants réutilisables
```javascript
// components/InvoiceCard.js
export const InvoiceCard = ({ invoice, onPress }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'PAID': return '#22c55e';
      case 'PENDING': return '#f59e0b';
      case 'OVERDUE': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <TouchableOpacity onPress={() => onPress(invoice)}>
      <View style={styles.card}>
        <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
        <Text style={styles.amount}>{formatCurrency(invoice.amount)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(invoice.status) }]}>
          <Text style={styles.statusText}>{invoice.status}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};
```

### 6. Navigation et écrans
```javascript
// screens/DashboardScreen.js
export const DashboardScreen = () => {
  const { actions } = useContext(AppContext);
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    loadDashboardData();
  }, []);
  
  const loadDashboardData = async () => {
    try {
      const data = await apiClient.request('/dashboard/unified');
      setStats(data);
    } catch (error) {
      handleApiError(error);
    }
  };
  
  return (
    <ScrollView>
      <StatsCards stats={stats} />
      <RecentInvoices />
      <UpcomingTasks />
      <SubscriptionNotifications />
    </ScrollView>
  );
};
```

---

## 🔧 Points d'attention pour Expo

### 1. Authentification
- Utiliser `expo-auth-session` pour NextAuth
- Stocker les tokens de session dans SecureStore
- Implémenter un refresh automatique

### 2. Upload de fichiers
```javascript
import * as DocumentPicker from 'expo-document-picker';

const uploadFile = async () => {
  const result = await DocumentPicker.getDocumentAsync({});
  
  if (result.type === 'success') {
    const formData = new FormData();
    formData.append('file', {
      uri: result.uri,
      type: result.mimeType,
      name: result.name,
    });
    
    await apiClient.request('/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });
  }
};
```

### 3. Notifications Push
```javascript
import * as Notifications from 'expo-notifications';

// Configurer les notifications pour les rappels d'abonnements
const scheduleSubscriptionReminder = async (subscription) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Rappel d'abonnement",
      body: `${subscription.description} arrive à échéance`,
    },
    trigger: {
      date: new Date(subscription.nextRenewalDate),
    },
  });
};
```

### 4. Synchronisation offline
- Utiliser AsyncStorage pour le cache
- Implémenter une queue pour les actions hors ligne
- Synchroniser lors du retour en ligne

---

## 📋 Checklist d'implémentation

### Phase 1 : Base
- [ ] Configuration API et authentification
- [ ] Navigation principale
- [ ] Écrans de base (Dashboard, Login)
- [ ] Gestion d'état globale

### Phase 2 : Entités principales
- [ ] Gestion des clients
- [ ] Gestion des projets
- [ ] Système de facturation
- [ ] Gestion des dépenses

### Phase 3 : Fonctionnalités avancées
- [ ] Système de notifications
- [ ] Calendrier et tâches
- [ ] Upload de fichiers
- [ ] Intégration Wave CI

### Phase 4 : UX/UI
- [ ] Animations et transitions
- [ ] Mode sombre
- [ ] Responsive design
- [ ] Optimisations performances

---

## 🔍 Codes d'erreur courants

| Code | Description | Action |
|------|------------|--------|
| 401 | Non authentifié | Rediriger vers login |
| 403 | Accès refusé | Afficher message d'erreur |
| 404 | Ressource non trouvée | Retour ou actualisation |
| 422 | Données invalides | Afficher erreurs de validation |
| 500 | Erreur serveur | Réessayer plus tard |

---

Cette documentation complète vous permettra de développer l'application Expo en suivant exactement l'architecture de l'API. Chaque endpoint est documenté avec ses paramètres, réponses types et exemples d'utilisation. 