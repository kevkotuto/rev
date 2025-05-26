# 🔧 Guide de Dépannage - REV AI

## Problèmes Courants et Solutions

### 1. L'IA ne répond pas ou donne des réponses vides

**Symptômes :**
- Le chat affiche "REV AI réfléchit..." mais ne répond jamais
- Réponses vides ou messages d'erreur génériques

**Solutions :**

#### A. Vérifier la clé API OpenAI
```bash
# Vérifier que la variable d'environnement est définie
echo $OPENAI_API_KEY

# Ou dans le fichier .env.local
cat .env.local | grep OPENAI_API_KEY
```

#### B. Tester l'API directement
Aller sur `/test-ai` pour utiliser le composant de debug.

#### C. Vérifier les logs du serveur
```bash
# Dans le terminal où tourne le serveur Next.js
# Chercher les messages commençant par 🤖, ⚠️, ✅
```

### 2. Erreurs de base de données

**Symptômes :**
- Erreurs Prisma dans les logs
- "Erreur lors de la récupération des projets"

**Solutions :**

#### A. Vérifier la connexion à la base de données
```bash
npx prisma db push
npx prisma generate
```

#### B. Vérifier que l'utilisateur est connecté
- L'IA nécessite une session utilisateur valide
- Vérifier que NextAuth fonctionne correctement

### 3. L'IA ne trouve pas les projets

**Symptômes :**
- "Aucun projet trouvé avec le nom X"
- L'IA ne peut pas créer de tâches pour un projet existant

**Solutions :**

#### A. Créer le projet d'abord
```javascript
// Via l'IA
"Crée-moi un projet appelé 'beautelic' de type développement web avec un montant de 500000 XOF"
```

#### B. Vérifier l'orthographe du nom du projet
- La recherche est insensible à la casse mais doit correspondre partiellement

### 4. Problèmes de performance

**Symptômes :**
- Réponses très lentes (>30 secondes)
- Timeouts fréquents

**Solutions :**

#### A. Optimiser les requêtes
- Limiter le nombre de projets/tâches récupérés
- Utiliser des index sur la base de données

#### B. Réduire la complexité des prompts
- Éviter les historiques de conversation trop longs

## Configuration Recommandée

### Variables d'environnement (.env.local)
```env
# OpenAI
OPENAI_API_KEY=sk-your-key-here

# Base de données
DATABASE_URL="your-database-url"

# NextAuth
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"
```

### Limites et Quotas OpenAI
- Modèle utilisé : `gpt-4o-mini`
- Limite de tokens : ~4000 par requête
- Coût approximatif : $0.0001 par 1000 tokens

## Tests de Diagnostic

### 1. Test de base
```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Bonjour", "history": []}'
```

### 2. Test avec session
Utiliser le composant `AITestDebug` sur `/test-ai`

### 3. Test des outils
```javascript
// Tester chaque outil individuellement
"Montre-moi mes statistiques"  // get_dashboard_stats
"Liste mes projets"            // get_projects
"Analyse ma charge de travail" // analyze_workload
```

## Monitoring et Logs

### Logs importants à surveiller
```bash
# Succès
✅ Réponse finale: [message]

# Problèmes
⚠️ Réponse vide de l'agent
❌ Erreur lors de [action]
🤖 Résultat de l'agent: [debug info]
```

### Métriques à suivre
- Temps de réponse moyen
- Taux de succès des requêtes
- Utilisation des tokens OpenAI
- Erreurs de base de données

## Contact et Support

Si les problèmes persistent :
1. Vérifier les logs détaillés
2. Tester avec le composant de debug
3. Vérifier la configuration des variables d'environnement
4. Redémarrer le serveur de développement

## Améliorations Futures

- [ ] Cache des réponses fréquentes
- [ ] Retry automatique en cas d'échec
- [ ] Monitoring avancé avec métriques
- [ ] Interface d'administration pour l'IA
- [ ] Tests automatisés de l'API IA 