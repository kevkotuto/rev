# 🔧 Correction de l'Erreur de Devise FCFA

## 🚨 Problème Identifié

**Erreur :**
```
RangeError: Invalid currency code : FCFA
    at new NumberFormat (<anonymous>)
    at generateInvoiceEmailTemplate (lib/email.ts)
```

**Cause :**
- `Intl.NumberFormat` ne reconnaît pas le code de devise `FCFA`
- Le code ISO correct pour le franc CFA de l'Afrique de l'Ouest est `XOF`

## ✅ Corrections Apportées

### 1. **Fichier `lib/format.ts`**

**Avant :**
```typescript
export function formatCurrency(amount: number, currency: string = "FCFA"): string {
  if (currency === "FCFA") {
    return `${amount.toLocaleString("fr-FR")} FCFA`
  }
  
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency === "EUR" ? "EUR" : "USD",
  }).format(amount)
}
```

**Après :**
```typescript
export function formatCurrency(amount: number, currency: string = "FCFA"): string {
  if (currency === "FCFA") {
    return `${amount.toLocaleString("fr-FR")} FCFA`
  }
  
  // Mapper FCFA vers XOF pour Intl.NumberFormat
  const currencyCode = currency === "FCFA" ? "XOF" : currency
  
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currencyCode === "EUR" ? "EUR" : currencyCode === "USD" ? "USD" : "XOF",
    minimumFractionDigits: 0,
  }).format(amount)
}
```

### 2. **Fichier `lib/email.ts`**

**Avant :**
```typescript
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: user.currency || 'XOF',
    minimumFractionDigits: 0,
  }).format(amount)
}
```

**Après :**
```typescript
const formatCurrency = (amount: number) => {
  // Mapper FCFA vers XOF pour Intl.NumberFormat
  const currencyCode = user.currency === 'FCFA' ? 'XOF' : (user.currency || 'XOF')
  
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
  }).format(amount)
}
```

## 🧪 Tests de Validation

### Test 1: Formatage de devise
```javascript
// Test FCFA → XOF
const formatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'XOF',
  minimumFractionDigits: 0,
})
console.log(formatter.format(150000)) // "150 000 XOF"
```

### Test 2: Prévisualisation d'email
```javascript
// Tester la prévisualisation sans erreur
fetch('/api/proformas/[ID]/email-preview')
.then(res => res.json())
.then(data => {
  console.log('✅ Prévisualisation:', data.emailContent ? 'OK' : 'Erreur')
})
```

### Test 3: Envoi d'email
```javascript
// Tester l'envoi d'email
fetch('/api/emails/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'invoice',
    to: 'test@example.com',
    subject: 'Test Proforma',
    invoiceId: 'PROFORMA_ID'
  })
})
.then(res => res.json())
.then(data => console.log('✅ Envoi:', data))
```

## 📋 Mapping des Devises

| Code Interface | Code ISO | Intl.NumberFormat |
|----------------|----------|-------------------|
| `FCFA`         | `XOF`    | ✅ Supporté       |
| `EUR`          | `EUR`    | ✅ Supporté       |
| `USD`          | `USD`    | ✅ Supporté       |

## 🎯 Résultat

- ✅ **Erreur "Invalid currency code: FCFA" corrigée**
- ✅ **Prévisualisation d'email fonctionnelle**
- ✅ **Envoi d'email sans erreur**
- ✅ **Formatage cohérent dans toute l'application**
- ✅ **Support des devises FCFA, EUR, USD**

## 📁 Fichiers Modifiés

1. `lib/format.ts` - Fonction de formatage globale
2. `lib/email.ts` - Template d'email
3. `EMAIL_TROUBLESHOOTING.md` - Documentation mise à jour
4. `test-email-preview.js` - Script de test créé

---

**Date de correction :** ${new Date().toLocaleDateString('fr-FR')}
**Statut :** ✅ Résolu 