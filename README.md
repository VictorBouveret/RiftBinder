# RiftBinder

Application de suivi de collection pour le jeu de cartes à collectionner Riftbound (Riot Games). Permet de parcourir l'ensemble des cartes disponibles, de gérer sa collection personnelle et sa liste de souhaits, et d'estimer la valeur totale de sa collection.

## Fonctionnalités

- Parcours et recherche des cartes (nom, numéro, faction, rareté)
- Gestion de compte utilisateur (authentification par e-mail et OAuth)
- Suivi de collection avec quantité possédée par carte
- Liste de souhaits (wishlist)
- Estimation de la valeur de collection, avec conversion de devise
- Support multilingue et thème clair/sombre

## Stack technique

| Domaine | Technologie |
|---|---|
| Frontend | React, TypeScript, Vite |
| Style | Tailwind CSS |
| Routing | React Router |
| Backend / données | Supabase (PostgreSQL, Auth, Row Level Security) |
| Tests | Vitest, Testing Library |
| Conteneurisation | Docker, Supabase CLI |
| CI/CD | GitHub Actions |
| Déploiement | Vercel |

## Prérequis

- Node.js 22 ou supérieur
- npm
- Docker (pour l'environnement Supabase local)

## Installation

\```bash
git clone https://github.com/<organisation>/riftbinder.git
cd riftbinder
npm install
\```

## Variables d'environnement

Copier le fichier d'exemple et renseigner les valeurs fournies par Supabase :

\```bash
cp .env.example .env
\```

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | URL de l'instance Supabase (locale ou distante) |
| `VITE_SUPABASE_ANON_KEY` | Clé publique anonyme Supabase |

## Environnement Supabase local

Le CLI Supabase démarre une stack complète en conteneurs Docker (Postgres, Auth, Studio).

\```bash
npx supabase init      # à exécuter une seule fois
npx supabase start
\```

La commande affiche l'URL de l'API et la clé anonyme à renseigner dans `.env`. L'interface d'administration (Studio) est accessible sur `http://localhost:54323`.

Pour arrêter la stack :

\```bash
npx supabase stop
\```

## Scripts disponibles

| Commande | Description |
|---|---|
| `npm run dev` | Démarre le serveur de développement |
| `npm run build` | Build de production |
| `npm run preview` | Prévisualise le build de production |
| `npm run lint` | Analyse statique du code |
| `npm run test` | Exécute les tests |
| `npm run test:watch` | Exécute les tests en mode watch |
| `npm run test:ui` | Interface graphique Vitest |

## Docker

Construction et exécution du frontend en conteneur :

\```bash
docker build -t riftbinder .
docker run -p 8080:80 riftbinder
\```

## Structure du projet

\```
src/
  components/   Composants réutilisables
  pages/        Écrans de l'application
  lib/          Client Supabase et fonctions utilitaires
  hooks/        Hooks React personnalisés
  types/        Types TypeScript partagés
  test/         Configuration Vitest
\```

## Licence

Projet réalisé dans le cadre d'une certification RNCP. Aucune licence open source définie à ce stade.
