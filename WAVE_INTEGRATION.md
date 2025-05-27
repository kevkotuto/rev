# Guide d'intégration Wave CI et nouvelles fonctionnalités

## 🚀 Configuration Wave CI

### Étape 1 : Configuration dans Wave CI
1. Connectez-vous à votre tableau de bord Wave CI
2. Allez dans **Paramètres** > **Webhooks**
3. Ajoutez une nouvelle URL webhook : `https://votre-domaine.com/api/webhooks/wave`
4. Copiez la **clé API** et le **secret webhook** fournis par Wave

### Étape 2 : Configuration dans l'application
1. Allez dans **Profil** > **Configuration Wave CI**
2. Collez votre **clé API Wave** dans le premier champ
3. Collez le **secret webhook** dans le second champ
4. Cliquez sur **Sauvegarder les modifications**

### Étape 3 : Vérification
1. Dans le tableau de bord, la carte **Solde Wave** devrait afficher votre solde
2. Cliquez sur **Tester la connexion** si aucun solde n'apparaît
3. Créez une facture avec lien de paiement pour tester le workflow complet

## 📊 Nouveau tableau de bord enrichi

### Cartes principales (5)
- **Clients** : Nombre total de clients
- **Projets** : Projets actifs / total
- **Revenus** : Total des revenus encaissés
- **Bénéfice** : Revenus - Dépenses (avec couleur indicative)
- **Solde Wave** : Solde disponible Wave CI en temps réel

### Cartes secondaires (4)
- **Prestataires** : Nombre de collaborateurs
- **Tâches** : Nombre total de tâches créées
- **Fichiers** : Documents stockés dans le système
- **Délais** : Projets en retard (alerte visuelle)

### Sections d'analyse
- **Analyse IA** : Insights et recommandations (sur demande)
- **Analyse des projets** : Durée moyenne, valeur moyenne, répartition
- **Tendances financières** : Évolution des revenus sur 6 mois

## 🤖 Analyse intelligente

### Utilisation
1. Cliquez sur le bouton **Analyse IA** dans le header du tableau de bord
2. L'IA analyse vos données et génère :
   - **Insights** : Observations sur votre activité
   - **Recommandations** : Suggestions d'amélioration
   - **Métriques clés** : Indicateurs de performance

### Données analysées
- Rentabilité et marges bénéficiaires
- Taux de finalisation des projets
- Tendances de croissance
- Performance par type de projet

## 📅 Gestion des dates avancée

### Nouvelles fonctionnalités
- **Dates antérieures** : Créez des projets avec des dates passées
- **Calcul de durée** : Durée automatique pour les projets terminés
- **Détection de retards** : Alerte pour les projets dépassant leur date de fin
- **Suivi temporel** : Analyse des performances dans le temps

### Utilisation pratique
1. **Archivage** : Enregistrez vos anciens projets avec leurs vraies dates
2. **Suivi** : Surveillez les projets en cours qui risquent d'être en retard
3. **Performance** : Analysez vos durées moyennes de projet

## 🔐 Sécurité des webhooks

### Vérification de signature
- Le secret webhook garantit l'authenticité des notifications Wave
- Protection contre les tentatives de fraude
- Logs détaillés pour le débogage

### États de sécurité
- ✅ **Sécurisé** : Secret configuré et signature vérifiée
- ⚠️ **Non sécurisé** : Secret manquant, webhooks fonctionnels mais non vérifiés
- ❌ **Erreur** : Signature invalide, webhook rejeté

## 🔧 APIs disponibles

### Wave CI
- `GET /api/wave/balance` : Récupération du solde
- `POST /api/webhooks/wave` : Traitement des notifications de paiement

### Analyse IA
- `POST /api/ai/business-analysis` : Génération d'insights intelligents

### Acomptes
- `POST /api/invoices/advance-payment` : Création d'acomptes généraux

## 📈 Métriques calculées

### Projets
- **Valeur moyenne** : Montant moyen par projet
- **Durée moyenne** : Temps moyen de réalisation
- **Taux de retard** : Pourcentage de projets en retard
- **Répartition client/personnel** : Distribution des types de projets

### Finances
- **Bénéfice net** : Revenus - Dépenses
- **Marge bénéficiaire** : Pourcentage de profit
- **Tendances mensuelles** : Évolution sur 6 mois
- **Revenus en attente** : Factures non payées

## 🎯 Prochaines étapes recommandées

1. **Configuration Wave CI** pour les paiements automatiques
2. **Utilisation de l'analyse IA** pour optimiser votre activité
3. **Création d'acomptes** pour améliorer votre trésorerie
4. **Suivi des délais** pour respecter vos engagements clients
5. **Archivage des anciens projets** pour des statistiques complètes

---

*Cette intégration vous permet de gérer complètement votre activité freelance avec des outils intelligents et des analyses avancées.* 