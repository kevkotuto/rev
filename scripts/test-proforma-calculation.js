// Script de test pour vérifier le calcul des proformas
// Usage: node scripts/test-proforma-calculation.js

console.log('🧮 Test du calcul des proformas\n')

// Simulation des données de services
const services = [
  { name: 'Développement web', amount: 50000, quantity: 2, unit: 'page' },
  { name: 'Design UI/UX', amount: 25000, quantity: 1, unit: 'projet' },
  { name: 'Formation', amount: 15000, quantity: 5, unit: 'heure' }
]

// Ancien calcul (incorrect)
const projectAmount = 300000
const oldServicesAmount = services.reduce((sum, service) => sum + service.amount, 0)
const oldTotalAmount = projectAmount + oldServicesAmount

// Nouveau calcul (correct)
const newServicesAmount = services.reduce((sum, service) => {
  const quantity = service.quantity || 1
  return sum + (service.amount * quantity)
}, 0)
const newTotalAmount = newServicesAmount > 0 ? newServicesAmount : projectAmount

console.log('📊 Détail des services :')
services.forEach((service, index) => {
  const total = service.amount * service.quantity
  console.log(`${index + 1}. ${service.name}`)
  console.log(`   Prix unitaire: ${service.amount.toLocaleString('fr-FR')} XOF`)
  console.log(`   Quantité: ${service.quantity} ${service.unit || ''}`)
  console.log(`   Total: ${total.toLocaleString('fr-FR')} XOF`)
  console.log('')
})

console.log('💰 Comparaison des calculs :')
console.log('─'.repeat(50))
console.log(`❌ ANCIEN CALCUL (incorrect) :`)
console.log(`   Budget projet: ${projectAmount.toLocaleString('fr-FR')} XOF`)
console.log(`   Somme services (sans quantité): ${oldServicesAmount.toLocaleString('fr-FR')} XOF`)
console.log(`   Total: ${oldTotalAmount.toLocaleString('fr-FR')} XOF`)
console.log('')
console.log(`✅ NOUVEAU CALCUL (correct) :`)
console.log(`   Somme services (avec quantité): ${newServicesAmount.toLocaleString('fr-FR')} XOF`)
console.log(`   Total proforma: ${newTotalAmount.toLocaleString('fr-FR')} XOF`)
console.log('')

const difference = oldTotalAmount - newTotalAmount
console.log(`📈 Différence: ${difference.toLocaleString('fr-FR')} XOF`)
console.log(`📉 Réduction: ${((difference / oldTotalAmount) * 100).toFixed(1)}%`)

console.log('\n🎯 Résultat :')
if (newTotalAmount === 200000) {
  console.log('✅ Le calcul est correct ! Total = 200,000 XOF')
} else {
  console.log('❌ Erreur dans le calcul')
}

console.log('\n📝 Explication :')
console.log('- Développement web: 50,000 × 2 = 100,000 XOF')
console.log('- Design UI/UX: 25,000 × 1 = 25,000 XOF')
console.log('- Formation: 15,000 × 5 = 75,000 XOF')
console.log('- Total: 100,000 + 25,000 + 75,000 = 200,000 XOF') 