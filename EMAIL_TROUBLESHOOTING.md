# 📧 Guide de Dépannage - Envoi d'Emails REV

## 🔧 Problèmes Corrigés

### ✅ Corrections Apportées

1. **API d'envoi d'emails améliorée** (`/api/emails/send`)
   - ✅ Enregistrement des emails en base de données
   - ✅ Vérification de la configuration SMTP
   - ✅ Messages d'erreur détaillés et spécifiques
   - ✅ Logging amélioré avec emojis pour le debug

2. **Template email redesigné** (`lib/email.ts`)
   - ✅ Design moderne et responsive
   - ✅ Formatage correct de la devise (XOF)
   - ✅ Informations client et projet détaillées
   - ✅ Support des proformas et factures
   - ✅ **NOUVEAU**: Correction erreur "Invalid currency code: FCFA"

3. **Correction du mapping de devise** (`lib/format.ts` et `lib/email.ts`)
   - ✅ Mapping automatique FCFA → XOF pour `Intl.NumberFormat`
   - ✅ Support des devises EUR, USD et XOF
   - ✅ Formatage cohérent dans toute l'application

4. **API de vérification SMTP** (`/api/user/smtp-status`)
   - ✅ Vérification du statut de configuration
   - ✅ Identification des champs manquants

5. **API de test d'email améliorée** (`/api/test-email`)
   - ✅ Email de test avec design professionnel
   - ✅ Messages d'erreur spécifiques selon le type d'erreur
   - ✅ Enregistrement en base de données

## 🚨 Diagnostic des Problèmes

### 1. L'envoi d'email ne fonctionne pas

**Symptômes :**
- Erreur lors de l'envoi depuis la page projet
- Le test dans le profil fonctionne mais pas l'envoi de proforma

**Solutions :**

#### A. Vérifier la configuration SMTP
```bash
# Tester la configuration
curl -X GET http://localhost:3000/api/user/smtp-status \
  -H "Cookie: your-session-cookie"
```

#### B. Tester l'envoi d'email
```bash
# Test d'email
curl -X POST http://localhost:3000/api/test-email \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"testEmail": "test@example.com"}'
```

#### C. Vérifier les logs
```bash
# Surveiller les logs en temps réel
tail -f logs/app.log | grep "📧\|❌\|✅"
```

### 2. Erreur "Invalid currency code: FCFA"

**Symptômes :**
```
RangeError: Invalid currency code : FCFA
    at new NumberFormat (<anonymous>)
```

**Cause :**
- `Intl.NumberFormat` ne reconnaît pas le code `FCFA`
- Le code correct pour le franc CFA est `XOF`

**Solution :**
✅ **CORRIGÉ** - Mapping automatique FCFA → XOF dans :
- `lib/format.ts` : Fonction `formatCurrency`
- `lib/email.ts` : Template d'email

#### Test de la correction :
```javascript
// Dans la console du navigateur
const formatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'XOF', // FCFA mappé vers XOF
  minimumFractionDigits: 0,
})
console.log(formatter.format(150000)) // "150 000 XOF"
```

### 3. La prévisualisation d'email est incorrecte

**Symptômes :**
- Template email mal formaté
- Devise non formatée correctement
- Informations manquantes

**Solutions :**

#### A. Vérifier l'API de prévisualisation
```bash
# Tester la prévisualisation
curl -X GET http://localhost:3000/api/proformas/[ID]/email-preview \
  -H "Cookie: your-session-cookie"
```

#### B. Vérifier les données utilisateur
- Aller dans **Profil** → **Configuration SMTP**
- Vérifier que tous les champs sont remplis
- Tester avec le bouton "Tester"

### 4. Erreurs SMTP spécifiques

#### A. Erreur d'authentification (EAUTH)
```
❌ Erreur d'authentification SMTP
```
**Solutions :**
- Vérifier le nom d'utilisateur SMTP
- Vérifier le mot de passe SMTP
- Pour Gmail : utiliser un mot de passe d'application

#### B. Erreur de connexion (ECONNECTION)
```
❌ Impossible de se connecter au serveur SMTP
```
**Solutions :**
- Vérifier l'adresse du serveur SMTP
- Vérifier le port (587 pour TLS, 465 pour SSL)
- Vérifier la connexion internet

#### C. Timeout (ETIMEDOUT)
```
❌ Timeout de connexion au serveur SMTP
```
**Solutions :**
- Vérifier la connexion internet
- Essayer un autre port SMTP
- Contacter le fournisseur SMTP

#### D. Serveur introuvable (ENOTFOUND)
```
❌ Serveur SMTP introuvable
```
**Solutions :**
- Vérifier l'orthographe de l'adresse du serveur
- Vérifier que le serveur existe

## 🔍 Tests de Validation

### 1. Test de correction de devise

```javascript
// Test du formatage de devise FCFA → XOF
const testFormatCurrency = () => {
  try {
    const formatter = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF', // FCFA mappé vers XOF
      minimumFractionDigits: 0,
    })
    console.log("✅ FCFA → XOF:", formatter.format(150000))
  } catch (error) {
    console.error("❌ Erreur devise:", error.message)
  }
}
testFormatCurrency()
```

### 2. Test complet d'envoi d'email

```javascript
// Dans la console du navigateur
fetch('/api/emails/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'custom',
    to: 'test@example.com',
    subject: 'Test depuis REV',
    customHtml: '<h1>Test réussi !</h1><p>L\'envoi d\'email fonctionne.</p>'
  })
})
.then(res => res.json())
.then(data => console.log('✅ Résultat:', data))
.catch(err => console.error('❌ Erreur:', err))
```

### 3. Test de prévisualisation

```javascript
// Tester la prévisualisation d'une proforma
fetch('/api/proformas/[PROFORMA_ID]/email-preview')
.then(res => res.json())
.then(data => {
  console.log('📧 Prévisualisation:', data)
  // Vérifier que emailContent contient du HTML valide
  console.log('HTML:', data.emailContent)
})
```

### 4. Vérification de la base de données

```sql
-- Vérifier les emails envoyés
SELECT * FROM Email 
WHERE userId = 'USER_ID' 
ORDER BY createdAt DESC 
LIMIT 10;

-- Vérifier la configuration SMTP
SELECT smtpHost, smtpPort, smtpUser, smtpFrom 
FROM User 
WHERE id = 'USER_ID';
```

## 📋 Configuration SMTP Recommandée

### Gmail
```
Serveur SMTP: smtp.gmail.com
Port: 587
Sécurité: TLS
Utilisateur: votre@gmail.com
Mot de passe: [Mot de passe d'application]
```

### Outlook/Hotmail
```
Serveur SMTP: smtp-mail.outlook.com
Port: 587
Sécurité: TLS
Utilisateur: votre@outlook.com
Mot de passe: [Votre mot de passe]
```

### OVH
```
Serveur SMTP: ssl0.ovh.net
Port: 587
Sécurité: TLS
Utilisateur: votre@domaine.com
Mot de passe: [Votre mot de passe]
```

### O2Switch
```
Serveur SMTP: mail.votre-domaine.com
Port: 587
Sécurité: TLS
Utilisateur: votre@domaine.com
Mot de passe: [Votre mot de passe]
```

## 🚀 Fonctionnalités Ajoutées

### 1. Logging Amélioré
- 📧 Tentative d'envoi
- ✅ Envoi réussi avec messageId
- 💾 Enregistrement en base
- ❌ Erreurs détaillées

### 2. Template Email Professionnel
- Design moderne et responsive
- Formatage automatique de la devise
- Informations client et projet
- Support des liens de paiement

### 3. Gestion d'Erreurs Intelligente
- Messages d'erreur spécifiques selon le type
- Suggestions de résolution
- Enregistrement des erreurs en base

### 4. APIs de Diagnostic
- `/api/user/smtp-status` : Statut de configuration
- `/api/test-email` : Test d'envoi
- `/api/emails/send` : Envoi avec logging

## 📞 Support

Si les problèmes persistent :

1. **Vérifier les logs** dans la console du navigateur
2. **Tester la configuration SMTP** avec l'API de test
3. **Vérifier la base de données** pour les emails envoyés
4. **Contacter le support** avec les logs d'erreur

---

**Dernière mise à jour :** ${new Date().toLocaleDateString('fr-FR')}
**Version :** REV 2.0 - Système d'email corrigé 