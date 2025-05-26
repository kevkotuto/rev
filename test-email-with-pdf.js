// Script de test pour l'envoi d'email avec PDF en pièce jointe
// Utiliser dans la console du navigateur

console.log("📧 Test d'envoi d'email avec PDF en pièce jointe")

// Test 1: Envoi avec message personnalisé
const testEmailWithCustomMessage = async (proformaId, testEmail) => {
  console.log(`📤 Test d'envoi avec message personnalisé pour proforma: ${proformaId}`)
  
  const customMessage = `Bonjour,

J'espère que vous allez bien.

Veuillez trouver ci-joint votre proforma au format PDF.

Si vous avez des questions, n'hésitez pas à me contacter.

Cordialement`

  try {
    const response = await fetch('/api/emails/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'invoice',
        to: testEmail,
        subject: `Proforma avec PDF - ${new Date().toLocaleTimeString()}`,
        invoiceId: proformaId,
        attachPDF: true,
        customMessage: customMessage
      })
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log("✅ Email avec PDF envoyé avec succès:")
      console.log("- Message ID:", data.messageId)
      console.log("- Email ID:", data.emailId)
      console.log("- Type:", data.type)
      return data
    } else {
      const error = await response.json()
      console.error("❌ Erreur envoi:", error.message)
    }
  } catch (error) {
    console.error("❌ Erreur réseau:", error.message)
  }
}

// Test 2: Envoi sans message personnalisé (template par défaut)
const testEmailWithDefaultTemplate = async (proformaId, testEmail) => {
  console.log(`📤 Test d'envoi avec template par défaut pour proforma: ${proformaId}`)
  
  try {
    const response = await fetch('/api/emails/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'invoice',
        to: testEmail,
        subject: `Proforma PDF (template par défaut) - ${new Date().toLocaleTimeString()}`,
        invoiceId: proformaId,
        attachPDF: true
        // Pas de customMessage = utilise le template complet
      })
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log("✅ Email avec template par défaut envoyé:")
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

// Test 3: Vérifier la génération de PDF seule
const testPDFGeneration = async (proformaId) => {
  console.log(`📄 Test de génération PDF pour proforma: ${proformaId}`)
  
  try {
    const response = await fetch(`/api/proformas/${proformaId}/pdf`)
    
    if (response.ok) {
      const blob = await response.blob()
      console.log("✅ PDF généré avec succès:")
      console.log("- Taille:", blob.size, "bytes")
      console.log("- Type:", blob.type)
      
      // Optionnel: télécharger le PDF pour vérification
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `test-proforma-${proformaId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      console.log("📥 PDF téléchargé pour vérification")
      return true
    } else {
      const error = await response.json()
      console.error("❌ Erreur génération PDF:", error.message)
    }
  } catch (error) {
    console.error("❌ Erreur réseau:", error.message)
  }
}

// Test 4: Vérifier les emails envoyés en base
const checkSentEmails = async () => {
  console.log("📊 Vérification des emails envoyés...")
  
  try {
    const response = await fetch('/api/emails')
    
    if (response.ok) {
      const emails = await response.json()
      console.log("✅ Emails récents:")
      emails.slice(0, 5).forEach((email, index) => {
        console.log(`${index + 1}. ${email.type} - ${email.to} - ${email.status} - ${new Date(email.createdAt).toLocaleString()}`)
      })
      return emails
    } else {
      console.error("❌ Erreur récupération emails")
    }
  } catch (error) {
    console.error("❌ Erreur réseau:", error.message)
  }
}

// Instructions d'utilisation
console.log(`
📋 Instructions pour tester l'envoi d'email avec PDF:

1. Obtenir un ID de proforma existant:
   - Aller sur /proformas
   - Copier l'ID d'une proforma

2. Tester la génération PDF:
   testPDFGeneration('PROFORMA_ID')

3. Tester l'envoi avec message personnalisé:
   testEmailWithCustomMessage('PROFORMA_ID', 'test@example.com')

4. Tester l'envoi avec template par défaut:
   testEmailWithDefaultTemplate('PROFORMA_ID', 'test@example.com')

5. Vérifier les emails envoyés:
   checkSentEmails()

🔍 Vérifications à faire:
- ✅ PDF généré sans erreur
- ✅ Email envoyé avec pièce jointe
- ✅ Message personnalisé affiché correctement
- ✅ Template par défaut fonctionnel
- ✅ Email enregistré en base avec statut SENT

⚠️ Remplacer 'PROFORMA_ID' par un ID réel et 'test@example.com' par votre email de test.
`)

// Export des fonctions pour utilisation manuelle
window.testEmailWithCustomMessage = testEmailWithCustomMessage
window.testEmailWithDefaultTemplate = testEmailWithDefaultTemplate
window.testPDFGeneration = testPDFGeneration
window.checkSentEmails = checkSentEmails

console.log("✅ Script de test chargé. Utilisez les fonctions ci-dessus pour tester.") 