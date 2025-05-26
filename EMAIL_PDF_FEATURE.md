# 📧📎 Fonctionnalité d'Envoi d'Email avec PDF en Pièce Jointe

## 🎯 Vue d'ensemble

La nouvelle fonctionnalité permet d'envoyer automatiquement les proformas et factures par email avec le document PDF généré en pièce jointe, accompagné d'un message personnalisé.

## ✨ Fonctionnalités

### 1. **Envoi avec PDF automatique**
- ✅ Génération automatique du PDF de la proforma/facture
- ✅ Attachement du PDF à l'email
- ✅ Nom de fichier automatique : `proforma-PRO-2024-001.pdf`

### 2. **Message personnalisé**
- ✅ Template d'email simplifié pour accompagner le PDF
- ✅ Message personnalisable par l'utilisateur
- ✅ Template par défaut si aucun message personnalisé

### 3. **Interface utilisateur améliorée**
- ✅ Dialogue d'envoi d'email redesigné
- ✅ Indication claire que le PDF sera joint
- ✅ Prévisualisation du message

## 🔧 Implémentation Technique

### Fichiers modifiés

#### 1. **`lib/email.ts`**
- Ajout de `generateInvoicePDF()` pour générer le PDF
- Ajout de `generateSimpleEmailTemplate()` pour le template avec message personnalisé
- Modification de `generateInvoiceEmailTemplate()` pour supporter les messages personnalisés

#### 2. **`app/api/emails/send/route.ts`**
- Support du paramètre `attachPDF` (par défaut `true`)
- Support du paramètre `customMessage` pour le message personnalisé
- Génération et attachement automatique du PDF
- Gestion d'erreurs robuste

#### 3. **`components/email-preview-dialog.tsx`**
- Interface mise à jour avec indication PDF
- Envoi avec les nouveaux paramètres
- Messages d'information pour l'utilisateur

### Nouveaux paramètres API

```typescript
{
  type: 'invoice',
  to: string,
  subject: string,
  invoiceId: string,
  attachPDF: boolean, // Par défaut true
  customMessage?: string // Message personnalisé optionnel
}
```

## 📋 Utilisation

### 1. **Depuis l'interface utilisateur**

1. Aller sur une proforma dans `/proformas` ou `/projects/[id]`
2. Cliquer sur "Envoyer par email"
3. Remplir le destinataire et le sujet
4. Ajouter un message personnalisé (optionnel)
5. Cliquer sur "Envoyer"

### 2. **Via l'API**

```javascript
// Envoi avec message personnalisé
fetch('/api/emails/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'invoice',
    to: 'client@example.com',
    subject: 'Votre proforma',
    invoiceId: 'proforma-id',
    attachPDF: true,
    customMessage: 'Bonjour,\n\nVeuillez trouver ci-joint votre proforma.\n\nCordialement'
  })
})
```

## 🎨 Templates d'Email

### Template avec message personnalisé
- Design épuré et professionnel
- Message personnalisé mis en avant
- Informations essentielles du document
- Indication claire de la pièce jointe PDF

### Template complet (par défaut)
- Design riche avec toutes les informations
- Détails du projet et client
- Liens de paiement si disponibles
- Informations de l'entreprise

## 📊 Exemples de Messages

### Message professionnel
```
Bonjour [Nom du client],

J'espère que vous allez bien.

Veuillez trouver ci-joint votre proforma n°[Numéro] au format PDF.

N'hésitez pas à me contacter si vous avez des questions.

Cordialement
```

### Message de suivi
```
Bonjour,

Suite à notre échange, voici votre proforma comme convenu.

Le document PDF est en pièce jointe de cet email.

Je reste à votre disposition pour tout complément d'information.

Bien à vous
```

### Message de relance
```
Bonjour,

J'espère que vous avez bien reçu notre proforma.

Vous la retrouverez en pièce jointe de cet email.

Pourriez-vous me confirmer votre accord pour que nous puissions démarrer le projet ?

Merci et à bientôt
```

## 🧪 Tests

### Script de test disponible
Utiliser `test-email-with-pdf.js` dans la console du navigateur :

```javascript
// Tester la génération PDF
testPDFGeneration('proforma-id')

// Tester l'envoi avec message personnalisé
testEmailWithCustomMessage('proforma-id', 'test@example.com')

// Tester l'envoi avec template par défaut
testEmailWithDefaultTemplate('proforma-id', 'test@example.com')

// Vérifier les emails envoyés
checkSentEmails()
```

### Vérifications à effectuer
- ✅ PDF généré sans erreur
- ✅ Email envoyé avec pièce jointe
- ✅ Message personnalisé affiché correctement
- ✅ Template par défaut fonctionnel
- ✅ Email enregistré en base avec statut SENT
- ✅ Nom de fichier PDF correct
- ✅ Taille du PDF raisonnable

## 🔍 Dépannage

### Erreurs courantes

#### 1. **Erreur de génération PDF**
```
❌ Erreur lors de la génération du PDF
```
**Solutions :**
- Vérifier que Puppeteer est installé
- Vérifier les données de la proforma
- Vérifier les permissions système

#### 2. **PDF non attaché**
```
⚠️ Envoi de l'email sans le PDF...
```
**Solutions :**
- L'email est envoyé sans PDF en cas d'erreur de génération
- Vérifier les logs pour identifier le problème
- Tester la génération PDF séparément

#### 3. **Message personnalisé non affiché**
- Vérifier que `customMessage` est bien envoyé
- Vérifier que le template simplifié est utilisé

### Logs de débogage

```
📧 Tentative d'envoi d'email à: client@example.com
📎 Génération du PDF en pièce jointe...
✅ PDF généré et ajouté en pièce jointe: proforma-PRO-2024-001.pdf
✅ Email envoyé avec succès: <message-id>
💾 Email enregistré en base: email-id
```

## 🚀 Améliorations futures

### Fonctionnalités prévues
- [ ] Choix du format de pièce jointe (PDF, Word, etc.)
- [ ] Templates d'email multiples
- [ ] Signature électronique dans les emails
- [ ] Accusé de réception automatique
- [ ] Planification d'envoi différé

### Optimisations techniques
- [ ] Cache des PDFs générés
- [ ] Compression des PDFs
- [ ] Génération asynchrone pour gros documents
- [ ] Support des images dans les templates

## 📞 Support

En cas de problème :

1. **Vérifier la configuration SMTP** dans le profil utilisateur
2. **Tester l'envoi d'email simple** depuis le profil
3. **Vérifier les logs** dans la console navigateur et serveur
4. **Utiliser les scripts de test** pour diagnostiquer
5. **Contacter le support** avec les logs d'erreur

---

**Version :** REV 2.1 - Envoi d'email avec PDF
**Date :** ${new Date().toLocaleDateString('fr-FR')}
**Statut :** ✅ Fonctionnel 