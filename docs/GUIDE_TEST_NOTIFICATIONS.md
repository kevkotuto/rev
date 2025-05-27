# 🧪 Guide de Test - Système de Notifications REV

## 🎯 Tests à Effectuer

### 1. Test Interface Notifications
1. **Accéder à la page** : `http://localhost:3002/notifications`
2. **Vérifier l'affichage** :
   - ✅ Header avec titre et description
   - ✅ Statistiques (Total, Non lues, Emails, Sélectionnées)
   - ✅ Bouton "Test" avec menu déroulant
   - ✅ Filtres (Recherche, Type, Statut)
   - ✅ Actions (Actualiser, Tout marquer lu, Actions)

### 2. Test Création Notifications
1. **Cliquer sur "Test"** dans le header
2. **Tester chaque type** :
   - ✅ Notification Info (bleu)
   - ✅ Notification Succès (vert)
   - ✅ Notification Avertissement (orange)
   - ✅ Notification Erreur (rouge)
   - ✅ Paiement Wave reçu (vert avec icône dollar)
   - ✅ Facture payée (vert avec icône check)

3. **Vérifier après création** :
   - ✅ Toast de confirmation
   - ✅ Notification apparaît dans la liste
   - ✅ Badge "Nouveau" affiché
   - ✅ Compteur "Non lues" mis à jour
   - ✅ Icône et couleur appropriées

### 3. Test Popover Notifications
1. **Cliquer sur l'icône cloche** dans la sidebar
2. **Vérifier l'affichage** :
   - ✅ Badge rouge avec nombre si notifications non lues
   - ✅ Liste des 10 dernières notifications
   - ✅ Bouton "Tout lire" si notifications non lues
   - ✅ Bouton "Voir toutes les notifications"

3. **Tester les actions** :
   - ✅ Marquer une notification comme lue (bouton check)
   - ✅ Marquer toutes comme lues
   - ✅ Navigation vers page complète

### 4. Test Filtres et Recherche
1. **Filtrer par type** :
   - ✅ Sélectionner "Paiements reçus"
   - ✅ Vérifier que seules les notifications Wave apparaissent
   - ✅ Tester autres types

2. **Filtrer par statut** :
   - ✅ "Non lues" : Affiche uniquement les non lues
   - ✅ "Lues" : Affiche uniquement les lues
   - ✅ "Toutes" : Affiche toutes

3. **Recherche textuelle** :
   - ✅ Taper "test" dans la recherche
   - ✅ Vérifier filtrage en temps réel
   - ✅ Recherche dans titre et message

### 5. Test Actions en Masse
1. **Sélection multiple** :
   - ✅ Cocher "Tout sélectionner"
   - ✅ Vérifier que toutes sont sélectionnées
   - ✅ Décocher individuellement

2. **Actions sur sélection** :
   - ✅ "Marquer sélection comme lue"
   - ✅ "Supprimer sélection" (avec confirmation)
   - ✅ Compteurs mis à jour

3. **Actions globales** :
   - ✅ "Tout marquer lu"
   - ✅ "Supprimer toutes les lues"

### 6. Test Navigation Contextuelle
1. **Créer notification avec actionUrl** :
   - ✅ Cliquer sur une notification
   - ✅ Vérifier qu'elle devient "lue"
   - ✅ Navigation vers URL d'action si présente

2. **Métadonnées** :
   - ✅ Vérifier affichage montant/devise
   - ✅ Icône email si envoyé
   - ✅ Icône lien externe si actionUrl

### 7. Test API Endpoints

#### Test Création
```bash
# Depuis l'interface web (bouton Test)
# Ou via API avec authentification
```

#### Test Récupération
```bash
# GET /api/notifications
# Vérifier réponse JSON avec notifications et unreadCount
```

#### Test Mise à Jour
```bash
# PATCH /api/notifications
# Marquer comme lue, vérifier statut
```

#### Test Suppression
```bash
# DELETE /api/notifications
# Supprimer, vérifier disparition
```

### 8. Test Webhook Wave (Simulation)
1. **Configuration** :
   - ✅ Secret webhook configuré dans profil
   - ✅ URL webhook : `/api/webhooks/wave`

2. **Test signature** :
   - ✅ Webhook avec signature valide
   - ✅ Webhook avec signature invalide (rejeté)

3. **Test événements** :
   - ✅ `checkout.session.completed`
   - ✅ `merchant.payment_received`
   - ✅ Vérifier création notification automatique

### 9. Test Emails (Si SMTP Configuré)
1. **Configuration SMTP** :
   - ✅ Host, port, user, password configurés
   - ✅ `emailNotifications: true`

2. **Test envoi** :
   - ✅ Créer notification
   - ✅ Vérifier email reçu
   - ✅ Template HTML correct
   - ✅ Bouton d'action fonctionnel

### 10. Test Responsive
1. **Mobile** :
   - ✅ Interface adaptée
   - ✅ Popover fonctionnel
   - ✅ Filtres accessibles

2. **Tablet** :
   - ✅ Grille statistiques adaptée
   - ✅ Actions visibles

## ✅ Checklist de Validation

### Interface
- [ ] Page notifications charge sans erreur
- [ ] Popover s'affiche correctement
- [ ] Statistiques temps réel
- [ ] Filtres fonctionnels
- [ ] Actions en masse opérationnelles
- [ ] Navigation contextuelle
- [ ] Design responsive

### Fonctionnalités
- [ ] Création notifications de test
- [ ] Marquer comme lu/non lu
- [ ] Suppression individuelle/masse
- [ ] Recherche et filtres
- [ ] Polling automatique (30s)
- [ ] Badges et compteurs

### API
- [ ] Authentification requise
- [ ] CRUD complet
- [ ] Validation des données
- [ ] Gestion d'erreurs
- [ ] Réponses JSON correctes

### Sécurité
- [ ] Isolation par utilisateur
- [ ] Validation des permissions
- [ ] Pas d'exposition de données sensibles
- [ ] Logs sécurisés

### Performance
- [ ] Chargement rapide (< 500ms)
- [ ] Pagination efficace
- [ ] Pas de fuites mémoire
- [ ] Polling optimisé

## 🐛 Problèmes Connus

### Erreurs Possibles
1. **"Non autorisé"** : Session expirée, se reconnecter
2. **Notifications vides** : Créer des notifications de test
3. **Popover ne s'ouvre pas** : Vérifier console pour erreurs JS
4. **Emails non envoyés** : Vérifier configuration SMTP

### Solutions
1. **Redémarrer serveur** : `pnpm dev`
2. **Vider cache** : Ctrl+F5 ou Cmd+Shift+R
3. **Vérifier console** : F12 → Console
4. **Vérifier logs** : Terminal serveur

## 🎉 Validation Complète

Une fois tous les tests passés :

✅ **Système opérationnel** : Notifications créées, affichées, gérées
✅ **Interface moderne** : Design cohérent, animations fluides
✅ **API fonctionnelle** : CRUD complet avec sécurité
✅ **Webhooks prêts** : Wave CI intégré avec vérification
✅ **Emails configurables** : Templates HTML professionnels

Le système de notifications REV est **prêt pour la production** ! 🚀 