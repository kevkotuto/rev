// Script de test pour vérifier la prévisualisation d'email
// Utiliser dans la console du navigateur

console.log("🧪 Test de prévisualisation d'email avec devise FCFA/XOF")

// Test 1: Vérifier le formatage de devise
const testFormatCurrency = () => {
  console.log("📊 Test de formatage de devise:")
  
  // Test avec FCFA
  try {
    const fcfaFormatter = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF', // FCFA mappé vers XOF
      minimumFractionDigits: 0,
    })
    console.log("✅ FCFA → XOF:", fcfaFormatter.format(150000))
  } catch (error) {
    console.error("❌ Erreur FCFA:", error.message)
  }
  
  // Test avec EUR
  try {
    const eurFormatter = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    })
    console.log("✅ EUR:", eurFormatter.format(1500))
  } catch (error) {
    console.error("❌ Erreur EUR:", error.message)
  }
}

// Test 2: Tester l'API de prévisualisation
const testEmailPreview = async (proformaId) => {
  console.log(`📧 Test de prévisualisation pour proforma: ${proformaId}`)
  
  try {
    const response = await fetch(`/api/proformas/${proformaId}/email-preview`)
    
    if (response.ok) {
      const data = await response.json()
      console.log("✅ Prévisualisation réussie:")
      console.log("- Destinataire:", data.defaultRecipient)
      console.log("- Sujet:", data.defaultSubject)
      console.log("- Contenu HTML généré:", data.emailContent ? "✅" : "❌")
      
      // Vérifier que le contenu ne contient pas d'erreur de devise
      if (data.emailContent && !data.emailContent.includes("Invalid currency")) {
        console.log("✅ Aucune erreur de devise détectée")
      } else {
        console.log("❌ Erreur de devise détectée dans le contenu")
      }
      
      return data
    } else {
      const error = await response.json()
      console.error("❌ Erreur API:", error.message)
    }
  } catch (error) {
    console.error("❌ Erreur réseau:", error.message)
  }
}

// Test 3: Tester l'envoi d'email
const testEmailSend = async (proformaId, testEmail) => {
  console.log(`📤 Test d'envoi d'email pour proforma: ${proformaId}`)
  
  try {
    const response = await fetch('/api/emails/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'invoice',
        to: testEmail,
        subject: `Test Proforma - ${new Date().toLocaleTimeString()}`,
        invoiceId: proformaId
      })
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log("✅ Email envoyé avec succès:")
      console.log("- Message ID:", data.messageId)
      console.log("- Email ID:", data.emailId)
      return data
    } else {
      const error = await response.json()
      console.error("❌ Erreur envoi:", error.message)
    }
  } catch (error) {
    console.error("❌ Erreur réseau:", error.message)
  }
}

// Exécuter les tests
console.log("🚀 Démarrage des tests...")

// Test 1: Formatage de devise
testFormatCurrency()

// Instructions pour les tests manuels
console.log(`
📋 Instructions pour tester manuellement:

1. Copier ce code dans la console du navigateur
2. Exécuter: testEmailPreview('PROFORMA_ID')
3. Exécuter: testEmailSend('PROFORMA_ID', 'test@example.com')

Remplacer PROFORMA_ID par un ID de proforma existant.

🔍 Vérifications à faire:
- ✅ Aucune erreur "Invalid currency code"
- ✅ Devise formatée correctement (XOF au lieu de FCFA)
- ✅ Email généré sans erreur
- ✅ Envoi d'email fonctionnel
`)

// Export des fonctions pour utilisation manuelle
window.testEmailPreview = testEmailPreview
window.testEmailSend = testEmailSend
window.testFormatCurrency = testFormatCurrency

console.log("✅ Script de test chargé. Utilisez les fonctions testEmailPreview() et testEmailSend()") 