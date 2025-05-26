#!/usr/bin/env node

const https = require('https');
const http = require('http');

const BASE_URL = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';

console.log('🔍 Vérification de l\'état de REV AI...\n');

// Test 1: Vérifier que le serveur répond
function checkServer() {
  return new Promise((resolve, reject) => {
    const protocol = BASE_URL.startsWith('https') ? https : http;
    
    protocol.get(BASE_URL, (res) => {
      if (res.statusCode === 200) {
        console.log('✅ Serveur accessible');
        resolve(true);
      } else {
        console.log(`❌ Serveur répond avec le code ${res.statusCode}`);
        resolve(false);
      }
    }).on('error', (err) => {
      console.log(`❌ Erreur de connexion au serveur: ${err.message}`);
      resolve(false);
    });
  });
}

// Test 2: Vérifier les variables d'environnement
function checkEnvVars() {
  console.log('\n📋 Vérification des variables d\'environnement:');
  
  const requiredVars = [
    'OPENAI_API_KEY',
    'DATABASE_URL',
    'NEXTAUTH_SECRET'
  ];
  
  let allPresent = true;
  
  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      console.log(`✅ ${varName}: Définie`);
    } else {
      console.log(`❌ ${varName}: Manquante`);
      allPresent = false;
    }
  });
  
  return allPresent;
}

// Test 3: Tester l'API IA (nécessite une session valide)
function testAIAPI() {
  return new Promise((resolve) => {
    console.log('\n🤖 Test de l\'API IA...');
    console.log('⚠️  Note: Ce test nécessite une session utilisateur valide');
    console.log('💡 Utilisez /test-ai dans le navigateur pour un test complet');
    resolve(true);
  });
}

// Fonction principale
async function main() {
  console.log('🚀 REV AI - Diagnostic Système\n');
  
  // Test du serveur
  const serverOk = await checkServer();
  
  // Test des variables d'environnement
  const envOk = checkEnvVars();
  
  // Test de l'API IA
  await testAIAPI();
  
  // Résumé
  console.log('\n📊 Résumé du diagnostic:');
  console.log(`Serveur: ${serverOk ? '✅' : '❌'}`);
  console.log(`Variables d'env: ${envOk ? '✅' : '❌'}`);
  
  if (serverOk && envOk) {
    console.log('\n🎉 Système prêt ! Vous pouvez tester l\'IA sur /test-ai');
  } else {
    console.log('\n⚠️  Problèmes détectés. Consultez TROUBLESHOOTING_AI.md');
  }
  
  console.log('\n🔗 Liens utiles:');
  console.log(`- Application: ${BASE_URL}`);
  console.log(`- Test IA: ${BASE_URL}/test-ai`);
  console.log(`- Dashboard: ${BASE_URL}/dashboard`);
}

// Exécuter le diagnostic
main().catch(console.error); 