// Script de test pour les APIs Wave
const BASE_URL = 'http://localhost:3000'

async function testWaveAPIs() {
  console.log('🧪 Test des APIs Wave...\n')

  // Test 1: Balance API
  console.log('1️⃣ Test API Balance...')
  try {
    const response = await fetch(`${BASE_URL}/api/wave/balance`)
    console.log(`Status: ${response.status}`)
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Balance API fonctionne')
      console.log('Data:', data)
    } else {
      const error = await response.json()
      console.log('❌ Balance API erreur:', error.message)
    }
  } catch (error) {
    console.log('❌ Balance API exception:', error.message)
  }

  console.log('\n' + '='.repeat(50) + '\n')

  // Test 2: Transactions API
  console.log('2️⃣ Test API Transactions...')
  try {
    const response = await fetch(`${BASE_URL}/api/wave/transactions?date=2025-05-27&first=10`)
    console.log(`Status: ${response.status}`)
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Transactions API fonctionne')
      console.log(`Transactions trouvées: ${data.items?.length || 0}`)
    } else {
      const error = await response.json()
      console.log('❌ Transactions API erreur:', error.message)
    }
  } catch (error) {
    console.log('❌ Transactions API exception:', error.message)
  }

  console.log('\n' + '='.repeat(50) + '\n')

  // Test 3: Send Money API (simulation)
  console.log('3️⃣ Test API Send Money (simulation)...')
  const testPayload = {
    amount: 1000,
    recipient_mobile: "+221761234567",
    recipient_name: "Test User",
    payment_reason: "Test payment",
    type: "general_payment"
  }

  try {
    const response = await fetch(`${BASE_URL}/api/wave/send-money`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    })
    console.log(`Status: ${response.status}`)
    const data = await response.json()
    if (response.ok) {
      console.log('✅ Send Money API structure OK')
    } else {
      console.log('❌ Send Money API erreur (attendu):', data.message)
    }
  } catch (error) {
    console.log('❌ Send Money API exception:', error.message)
  }

  console.log('\n🎉 Tests terminés!')
}

// Exécuter les tests si le serveur est démarré
if (typeof window === 'undefined') {
  testWaveAPIs().catch(console.error)
}

module.exports = { testWaveAPIs } 