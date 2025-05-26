# REV - Gestion d'activité freelance

![REV Logo](https://img.shields.io/badge/REV-Freelance%20Management-blue?style=for-the-badge&logo=react)

REV est une application complète de gestion d'activité freelance développée avec Next.js 15, React 19, et les dernières technologies web. Elle permet aux freelances de gérer leurs clients, projets, factures, et paiements de manière efficace et moderne.

## ✨ Fonctionnalités

### 🎯 Gestion des Clients
- Ajout et gestion des informations clients
- Historique des projets par client
- Notes et commentaires personnalisés

### 📁 Gestion des Projets
- Projets personnels et clients
- Suivi du statut (En cours, Terminé, En attente, Annulé)
- Gestion des services et prestations
- Calcul automatique des montants

### 📄 Facturation Intelligente
- Génération automatique de factures PDF
- Proformas et devis
- Numérotation automatique
- Suivi des paiements

### 💳 Paiements Wave CI
- Intégration native avec Wave CI
- Liens de paiement automatiques
- Suivi des transactions

### 📊 Rapports et Statistiques
- Tableau de bord avec métriques clés
- Analyse du chiffre d'affaires
- Suivi des dépenses
- Export PDF et Excel

### 👥 Gestion des Prestataires
- Ajout de collaborateurs externes
- Suivi des paiements prestataires
- Gestion des rôles et montants

## 🚀 Technologies Utilisées

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS 4, Shadcn/ui
- **Animations**: Motion (anciennement Framer Motion)
- **Base de données**: SQLite avec Prisma ORM
- **Authentification**: NextAuth.js avec Google OAuth
- **Paiements**: Intégration Wave CI
- **PDF**: jsPDF, html2canvas
- **Email**: Nodemailer
- **Validation**: Zod, React Hook Form

## 📦 Installation

### Prérequis
- Node.js 18+ 
- pnpm (recommandé)

### Étapes d'installation

1. **Cloner le repository**
```bash
git clone https://github.com/votre-username/rev.git
cd rev
```

2. **Installer les dépendances**
```bash
pnpm install
```

3. **Configurer les variables d'environnement**
```bash
cp .env.example .env
```

Remplissez les variables dans le fichier `.env` :
```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Google OAuth (optionnel)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Wave CI API
WAVE_API_KEY=""
WAVE_API_SECRET=""
```

4. **Initialiser la base de données**
```bash
pnpm prisma generate
pnpm prisma db push
```

5. **Démarrer l'application**
```bash
pnpm dev
```

L'application sera accessible sur `http://localhost:3000`

## 🏗️ Structure du Projet

```
rev/
├── app/                    # App Router (Next.js 15)
│   ├── api/               # API Routes
│   ├── auth/              # Pages d'authentification
│   ├── globals.css        # Styles globaux
│   ├── layout.tsx         # Layout principal
│   └── page.tsx           # Page d'accueil
├── components/            # Composants React
│   ├── ui/               # Composants Shadcn/ui
│   ├── providers/        # Providers (Session, etc.)
│   ├── dashboard.tsx     # Dashboard principal
│   └── landing-page.tsx  # Page de landing
├── lib/                  # Utilitaires et configurations
│   ├── auth.ts          # Configuration NextAuth
│   ├── prisma.ts        # Client Prisma
│   └── utils.ts         # Utilitaires
├── prisma/              # Schéma et migrations
│   └── schema.prisma    # Modèles de données
├── types/               # Types TypeScript
└── public/              # Assets statiques
```

## 🎨 Design System

L'application utilise un design system moderne avec :
- **Couleurs**: Palette bleue/violette avec dégradés
- **Typographie**: Geist Sans et Geist Mono
- **Composants**: Shadcn/ui pour la cohérence
- **Animations**: Motion pour les transitions fluides
- **Responsive**: Mobile-first design

## 🔐 Authentification

REV supporte plusieurs méthodes d'authentification :
- **Email/Mot de passe** : Inscription et connexion classique
- **Google OAuth** : Connexion rapide avec Google
- **Sessions sécurisées** : JWT avec NextAuth.js

## 💾 Base de Données

Le schéma de base de données inclut :
- **Users** : Utilisateurs et profils freelance
- **Clients** : Informations clients
- **Projects** : Projets et services
- **Invoices** : Factures et proformas
- **Expenses** : Dépenses et frais
- **Providers** : Prestataires externes

## 🔧 Scripts Disponibles

```bash
# Développement
pnpm dev              # Démarrer en mode développement
pnpm build            # Build de production
pnpm start            # Démarrer en production
pnpm lint             # Linter le code

# Base de données
pnpm prisma generate  # Générer le client Prisma
pnpm prisma db push   # Appliquer le schéma
pnpm prisma studio    # Interface graphique DB

# Shadcn/ui
pnpm dlx shadcn@latest add [component]  # Ajouter un composant
```

## 🌍 Déploiement

### Vercel (Recommandé)
1. Connecter votre repository GitHub
2. Configurer les variables d'environnement
3. Déployer automatiquement

### Autres plateformes
- **Netlify** : Compatible avec les fonctions serverless
- **Railway** : Déploiement simple avec base de données
- **DigitalOcean** : App Platform

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour contribuer :

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📝 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🆘 Support

Pour obtenir de l'aide :
- 📧 Email : support@rev-app.com
- 💬 Discord : [Rejoindre notre serveur](https://discord.gg/rev)
- 📖 Documentation : [docs.rev-app.com](https://docs.rev-app.com)

## 🙏 Remerciements

- [Next.js](https://nextjs.org/) pour le framework
- [Shadcn/ui](https://ui.shadcn.com/) pour les composants
- [Prisma](https://prisma.io/) pour l'ORM
- [Motion](https://motion.dev/) pour les animations
- [Wave CI](https://wave.com/) pour les paiements

---

Fait avec ❤️ pour les freelances par l'équipe REV
