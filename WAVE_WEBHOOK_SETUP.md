# Configuration des Webhooks Wave CI

Ce guide vous explique comment configurer les webhooks Wave CI pour recevoir automatiquement les notifications de paiement dans votre système de gestion freelance.

## 🎯 Objectif

Les webhooks permettent à Wave CI de notifier automatiquement votre application lorsqu'un paiement est effectué, échoue ou est annulé. Cela permet de mettre à jour automatiquement le statut des factures sans intervention manuelle.

## 📋 Prérequis

1. Un compte Wave CI actif
2. Votre application déployée avec une URL publique (HTTPS recommandé)
3. Accès aux paramètres de votre compte Wave CI

## 🔧 Configuration

### 1. URL du Webhook

Votre application génère automatiquement l'URL du webhook :

```
https://votre-domaine.com/api/webhooks/wave
```

Cette URL est affichée dans votre page de profil et peut être copiée d'un clic.

### 2. Configuration dans Wave CI

1. **Connectez-vous** à votre tableau de bord Wave CI
2. **Accédez aux paramètres** de votre compte
3. **Trouvez la section Webhooks** ou Développeurs
4. **Ajoutez une nouvelle URL de webhook** :
   - URL : `https://votre-domaine.com/api/webhooks/wave`
   - Événements à écouter :
     - `payment.completed`
     - `payment.success`
     - `payment.failed`
     - `payment.cancelled`

### 3. Configuration de la Clé API

Dans votre page de profil, configurez :
- **Clé API Wave** : Votre clé API privée Wave CI
- **Clé secrète Webhook** (optionnel mais recommandé) : Pour sécuriser les webhooks

## 🔒 Sécurité

### Vérification de Signature

Le système vérifie automatiquement la signature des webhooks si vous configurez une clé secrète :

```env
WAVE_WEBHOOK_SECRET=votre_cle_secrete_wave
```

### Variables d'Environnement

Ajoutez ces variables à votre fichier `.env` :

```env
# Configuration Wave CI
WAVE_WEBHOOK_SECRET=votre_cle_secrete_webhook
NEXTAUTH_URL=https://votre-domaine.com
```

## 📊 Événements Gérés

### Paiement Réussi (`payment.completed`, `payment.success`)

Quand un paiement est confirmé :
1. ✅ La facture est marquée comme "PAYÉE"
2. 📅 La date de paiement est enregistrée
3. 💰 Une entrée de revenus est créée pour le projet
4. 🔗 L'ID de transaction Wave est sauvegardé

### Paiement Échoué (`payment.failed`, `payment.cancelled`)

Quand un paiement échoue ou est annulé :
1. ❌ La facture est marquée comme "EN RETARD" ou "ANNULÉE"
2. 🔗 L'ID de transaction Wave est sauvegardé pour traçabilité

## 🧪 Test de Configuration

### 1. Test de l'Endpoint

Vous pouvez tester que votre endpoint webhook fonctionne :

```bash
curl https://votre-domaine.com/api/webhooks/wave
```

Réponse attendue :
```json
{
  "message": "Endpoint webhook Wave CI actif",
  "url": "https://votre-domaine.com/api/webhooks/wave",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 2. Test avec un Vrai Paiement

1. Créez une facture dans votre système
2. Générez un lien de paiement Wave
3. Effectuez un paiement test
4. Vérifiez que la facture est automatiquement marquée comme payée

## 🔍 Débogage

### Logs des Webhooks

Les webhooks sont loggés dans la console. Vérifiez les logs de votre application :

```bash
# Logs de réception
Webhook Wave reçu: { event: "payment.completed", data: {...} }

# Logs de traitement
Paiement confirmé pour la facture INV-2024-001
```

### Erreurs Communes

1. **Signature invalide** : Vérifiez votre clé secrète webhook
2. **Facture non trouvée** : Vérifiez que la référence correspond au numéro de facture
3. **URL non accessible** : Vérifiez que votre application est accessible publiquement

### Test Manuel de Webhook

Vous pouvez tester manuellement avec curl :

```bash
curl -X POST https://votre-domaine.com/api/webhooks/wave \
  -H "Content-Type: application/json" \
  -H "x-wave-signature: sha256=votre_signature" \
  -d '{
    "event": "payment.completed",
    "data": {
      "id": "wave_payment_123",
      "amount": 50000,
      "currency": "XOF",
      "status": "completed",
      "reference": "INV-2024-001",
      "customer": {
        "name": "Client Test",
        "email": "client@test.com",
        "phone": "+225123456789"
      },
      "payment_method": "wave",
      "created_at": "2024-01-01T12:00:00Z",
      "updated_at": "2024-01-01T12:00:00Z"
    }
  }'
```

## 📈 Monitoring

### Métriques à Surveiller

1. **Taux de réception** : Pourcentage de webhooks reçus avec succès
2. **Temps de traitement** : Temps de traitement des webhooks
3. **Erreurs** : Nombre d'erreurs de traitement

### Alertes Recommandées

- Webhook non reçu après 5 minutes d'un paiement
- Erreur de traitement de webhook
- Signature invalide (tentative d'attaque)

## 🆘 Support

Si vous rencontrez des problèmes :

1. Vérifiez les logs de votre application
2. Testez l'endpoint webhook manuellement
3. Vérifiez la configuration dans Wave CI
4. Contactez le support Wave CI si nécessaire

## 📚 Ressources

- [Documentation Wave CI](https://docs.wave.com)
- [Guide des Webhooks Wave](https://docs.wave.com/webhooks)
- [API Reference Wave](https://docs.wave.com/api)

---

✅ **Configuration terminée !** Vos paiements Wave seront maintenant automatiquement synchronisés avec votre système de gestion freelance. 