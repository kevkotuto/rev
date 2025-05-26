🌐 Application Web de gestion d’activité freelance

DATABASE_URL="postgresql://root:Ecolfa@961@160.154.89.188:5432/freelance?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="Ecolfa@961"

L’application doit permettre de gérer facilement :
	•	Tes informations personnelles et société (profil, logo, infos)
	•	Tes clients et leurs projets
	•	Tes projets personnels (sans client)
	•	Tes prestataires et leurs paiements
	•	Tes factures et proformas (PDF + envoi mail)
	•	Ton chiffre d’affaires global et par projet
	•	Tes dépenses générales (ex : abonnements logiciels)
	•	Tes dépenses par projet (ex : frais prestataire, matériel)
	•	La génération de rapports clairs
	•	L’envoi de liens de paiement (Wave CI, etc.)

⸻

📝 Détail des fonctionnalités :

1️⃣ Authentification & Profil
	•	Inscription avec NextAuth (email / Google)
	•	Connexion sécurisée
	•	Gestion de ton profil freelance :
	•	Logo de société (upload d’image)
	•	Nom de la société
	•	Adresse / contact / email / téléphone
	•	Devise principale (FCFA, etc.)

⸻

2️⃣ Gestion des Clients
	•	CRUD (Créer, Lire, Mettre à jour, Supprimer) des clients :
	•	Nom du client
	•	Email / téléphone / adresse
	•	Entreprise du client
	•	Notes libres
	•	Association d’un projet à un client

⸻

3️⃣ Gestion des Projets
	•	Créer un projet :
	•	Type : Projet Personnel ou Projet Client
	•	Client associé (si projet client)
	•	Montant global (en FCFA ou autre)
	•	Liste des services facturés (avec description et montant)
	•	Dépenses liées au projet (prestataires, matériel, etc.)
	•	Statut : En cours / Terminé / En attente
	•	Suivi du projet (timeline simple, tâches futures à ajouter plus tard)

⸻

4️⃣ Gestion des Prestataires
	•	Ajouter / supprimer des prestataires :
	•	Nom
	•	Email / téléphone
	•	Rôle / tâche
	•	Montant à payer
	•	Projet associé (optionnel)

⸻

5️⃣ Facturation
	•	Génération d’un devis (proforma) :
	•	PDF téléchargeable
	•	Envoi par email
	•	Génération d’une facture (avec mention “facture” + détails légaux)
	•	Historique des factures et proformas

⸻

6️⃣ Paiement et Liens externes
	•	Génération d’un lien de paiement Wave CI ou autre (lien cliquable dans la facture)
	•	Stockage du lien dans la fiche projet ou facture

⸻

7️⃣ Suivi des Dépenses
	•	Dépenses générales (non liées à un projet) :
	•	Exemple : abonnement à Cursor, Copilot, Figma, etc.
	•	Montant, catégorie, date, notes
	•	Dépenses liées à un projet :
	•	Exemple : prestataires, outils spécifiques, matériel
	•	Montant, description, date

⸻

8️⃣ Suivi des Chiffres clés
	•	Chiffre d’affaire total (tous projets)
	•	Chiffre d’affaire par projet
	•	Dépenses totales (générales + projets)
	•	Bénéfice net (CA - dépenses)

⸻

9️⃣ Rapports & Statistiques
	•	Rapport mensuel / annuel :
	•	Projets réalisés
	•	Dépenses
	•	Revenus
	•	Bénéfices
	•	Export PDF ou Excel
