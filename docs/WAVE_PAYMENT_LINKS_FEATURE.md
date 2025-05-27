# 🔗 Fonctionnalité Liens de Paiement Wave

## 🎯 Vue d'ensemble

Cette fonctionnalité permet de générer des liens de paiement Wave directement depuis l'interface REV pour :
- **Clients existants** : Sélection depuis la base de données
- **Prestataires existants** : Sélection depuis la base de données  
- **Numéros personnalisés** : Saisie manuelle d'un destinataire

## 📋 Conformité Documentation Wave

### Types de Données Corrigés

#### Montants
- ✅ **Format** : Chaînes de caractères (ex: `"50000"`)
- ✅ **XOF** : Pas de décimales autorisées
- ✅ **Validation** : Nombres positifs uniquement
- ✅ **Formatage** : `Math.round(amount).toString()`

#### Numéros de Téléphone
- ✅ **Format E.164** : `+225XXXXXXXX`
- ✅ **Auto-formatage** : Ajout automatique de `+225` si manquant
- ✅ **Restriction payeur** : `restrict_payer_mobile`

#### Références Client
- ✅ **Limite** : 255 caractères maximum
- ✅ **Optionnel** : Corrélation avec système interne
- ✅ **Unique** : Pour traçabilité

## 🚀 Fonctionnalités Implémentées

### 1. Interface Utilisateur

#### Bouton d'Accès
```tsx
<Button variant="outline" onClick={() => setShowPaymentLinkDialog(true)}>
  <CreditCard className="mr-2 h-4 w-4" />
  Lien de paiement Wave
</Button>
```

#### Dialog Complet
- **Montant** : Validation temps réel
- **Type destinataire** : Client/Prestataire/Personnalisé
- **Sélection dynamique** : Filtrage des options vides
- **Description** : Champ obligatoire
- **Référence** : Optionnelle, limitée à 255 caractères

### 2. API Backend (`/api/wave/create-payment-link`)

#### Validation Stricte
```typescript
// Validation montant
const numericAmount = parseFloat(amount)
if (isNaN(numericAmount) || numericAmount <= 0) {
  return NextResponse.json({ message: "Le montant doit être un nombre positif" }, { status: 400 })
}

// Formatage XOF (sans décimales)
const formattedAmount = Math.round(numericAmount).toString()
```

#### Formatage Téléphone
```typescript
// Format E.164 automatique
let formattedPhone = recipient_phone.trim()
if (!formattedPhone.startsWith('+')) {
  formattedPhone = '+225' + formattedPhone.replace(/^0+/, '')
}
wavePayload.restrict_payer_mobile = formattedPhone
```

#### Intégration Wave
```typescript
const wavePayload = {
  amount: formattedAmount,
  currency: "XOF",
  success_url: `${process.env.NEXTAUTH_URL}/payment/success`,
  error_url: `${process.env.NEXTAUTH_URL}/payment/error`,
  client_reference: client_reference?.substring(0, 255),
  restrict_payer_mobile: formattedPhone
}
```

### 3. Persistance et Suivi

#### Base de Données
```typescript
const paymentLink = await prisma.paymentLink.create({
  data: {
    sessionId: waveData.id,
    amount: numericAmount,
    currency: currency,
    description: description,
    recipientName: recipient_name || null,
    recipientPhone: recipient_phone || null,
    clientReference: client_reference || null,
    waveData: waveData,
    userId: session.user.id,
    status: 'PENDING'
  }
})
```

#### Notifications
```typescript
await createNotification({
  userId: session.user.id,
  title: "Lien de paiement créé",
  message: `Lien de paiement de ${formattedAmount} ${currency} créé${recipient_name ? ` pour ${recipient_name}` : ''}`,
  type: "SUCCESS",
  relatedType: "payment_link",
  relatedId: waveData.id,
  actionUrl: waveData.wave_launch_url,
  metadata: {
    amount: formattedAmount,
    currency: currency,
    recipient: recipient_name,
    sessionId: waveData.id,
    transactionId: waveData.transaction_id
  }
})
```

## 🎨 Interface Utilisateur

### Formulaire Dynamique

#### Sélection Client
```tsx
{paymentLinkForm.recipient_type === 'client' && (
  <Select value={paymentLinkForm.clientId || ""}>
    <SelectContent>
      {clients.filter(client => client.id && client.id.trim() !== '').map((client) => (
        <SelectItem key={client.id} value={client.id}>
          {client.name}
          {client.company && ` - ${client.company}`}
          {client.phone && ` (${client.phone})`}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
)}
```

#### Sélection Prestataire
```tsx
{paymentLinkForm.recipient_type === 'provider' && (
  <Select value={paymentLinkForm.providerId || ""}>
    <SelectContent>
      {providers.filter(provider => provider.id && provider.id.trim() !== '').map((provider) => (
        <SelectItem key={provider.id} value={provider.id}>
          {provider.name}
          {provider.role && ` - ${provider.role}`}
          {provider.phone && ` (${provider.phone})`}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
)}
```

#### Saisie Personnalisée
```tsx
{paymentLinkForm.recipient_type === 'custom' && (
  <div className="grid grid-cols-2 gap-4">
    <Input placeholder="Nom complet" />
    <Input placeholder="+225XXXXXXXX" />
  </div>
)}
```

## 🔒 Sécurité et Validation

### Côté Client
- ✅ **Montants positifs** uniquement
- ✅ **Champs obligatoires** : Montant + Description
- ✅ **Filtrage options vides** : Évite les erreurs SelectItem
- ✅ **Format téléphone** : Aide visuelle E.164

### Côté Serveur
- ✅ **Authentification** : Session utilisateur requise
- ✅ **Clé API Wave** : Vérification présence
- ✅ **Validation montants** : Nombres positifs
- ✅ **Limite référence** : 255 caractères max
- ✅ **Formatage strict** : Conformité Wave

## 📊 Réponse API Wave

### Session de Paiement Créée
```json
{
  "id": "cos-18qq25rgr100a",
  "amount": "50000",
  "checkout_status": "open",
  "client_reference": "PROJ-2024-001",
  "currency": "XOF",
  "error_url": "https://rev.com/payment/error",
  "success_url": "https://rev.com/payment/success",
  "business_name": "REV Business",
  "payment_status": "processing",
  "transaction_id": "TDH5TEWTLFE",
  "wave_launch_url": "https://pay.wave.com/c/cos-18qq25rgr100a",
  "when_created": "2024-12-08T10:13:04Z",
  "when_expires": "2024-12-08T10:43:04Z",
  "restrict_payer_mobile": "+225XXXXXXXX"
}
```

## 🎯 Flux Utilisateur

1. **Accès** : Clic sur "Lien de paiement Wave"
2. **Configuration** :
   - Saisie montant (XOF, sans décimales)
   - Sélection type destinataire
   - Choix client/prestataire OU saisie manuelle
   - Description obligatoire
   - Référence optionnelle
3. **Création** : Validation + Appel API Wave
4. **Résultat** : 
   - Notification succès
   - Ouverture automatique du lien
   - Enregistrement en base
   - Notification système

## ✅ Avantages

1. **Conformité Wave** : Respect total de la documentation
2. **UX Optimisée** : Interface intuitive et guidée
3. **Flexibilité** : 3 types de destinataires
4. **Traçabilité** : Enregistrement et notifications
5. **Sécurité** : Validations multiples
6. **Intégration** : Cohérent avec l'écosystème REV

## 🚀 Utilisation

### Pour un Client
1. Sélectionner "Client existant"
2. Choisir dans la liste
3. Montant + Description
4. Créer → Lien généré

### Pour un Prestataire  
1. Sélectionner "Prestataire existant"
2. Choisir dans la liste
3. Montant + Description
4. Créer → Lien généré

### Pour un Numéro Personnalisé
1. Sélectionner "Numéro personnalisé"
2. Saisir nom + téléphone
3. Montant + Description
4. Créer → Lien généré

**La fonctionnalité est maintenant 100% opérationnelle et conforme à Wave !** 🎉 