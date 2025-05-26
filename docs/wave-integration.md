# Intégration Wave CI

Ce document explique comment configurer et utiliser l'intégration Wave CI dans votre système de gestion freelance.

## Configuration

### 1. Obtenir une clé API Wave

1. Connectez-vous à votre compte [Wave Business](https://business.wave.com)
2. Allez dans **Développeurs** → **Clés API**
3. Créez une nouvelle clé API
4. Copiez la clé générée

### 2. Configurer le webhook

1. Dans Wave Business, allez dans **Développeurs** → **Webhooks**
2. Créez un nouveau webhook avec l'URL : `https://votre-domaine.com/api/webhooks/wave`
3. Activez les événements suivants :
   - `checkout.completed`
   - `checkout.failed`
   - `payment.received`

### 3. Configuration dans l'application

1. Allez dans **Profil** → **Intégrations**
2. Renseignez votre clé API Wave
3. Configurez l'URL du webhook
4. Sauvegardez les paramètres

## Utilisation

### Créer un paiement

```typescript
import { WavePaymentButton } from "@/components/wave-payment-button"

<WavePaymentButton
  amount={50000}
  currency="XOF"
  description="Facture #INV-001"
  reference="INV-001"
  clientEmail="client@example.com"
  onSuccess={(sessionId) => {
    console.log("Paiement réussi:", sessionId)
  }}
  onError={(error) => {
    console.error("Erreur:", error)
  }}
/>
```

### API Checkout

```typescript
const response = await fetch("/api/wave/checkout", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    amount: 50000,
    currency: "XOF",
    description: "Facture #INV-001",
    reference: "INV-001",
    clientEmail: "client@example.com"
  })
})

const { checkoutUrl, sessionId } = await response.json()
window.location.href = checkoutUrl
```

## Événements Webhook

### checkout.completed
Déclenché quand un paiement est complété avec succès.

### checkout.failed
Déclenché quand un paiement échoue.

### payment.received
Déclenché quand un paiement est reçu sur votre compte.

## Pages de redirection

- **Succès** : `/payment/success`
- **Annulation** : `/payment/cancel`

## Sécurité

- Les webhooks sont automatiquement vérifiés (signature)
- Les clés API sont stockées de manière sécurisée
- Toutes les communications utilisent HTTPS

## Dépannage

### Webhook non reçu
1. Vérifiez l'URL du webhook dans Wave Business
2. Assurez-vous que l'URL est accessible publiquement
3. Vérifiez les logs de l'application

### Paiement non traité
1. Vérifiez la clé API Wave
2. Vérifiez les paramètres du webhook
3. Consultez les logs de l'API Wave

### Erreur de signature
1. Vérifiez le secret du webhook
2. Assurez-vous que la signature est correctement calculée
3. Vérifiez les en-têtes de la requête

## Support

Pour toute question ou problème :
- Consultez la [documentation Wave](https://docs.wave.com)
- Contactez le support Wave
- Vérifiez les logs de l'application 