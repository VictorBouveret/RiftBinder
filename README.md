# Riftbound Tracker

Tracker de collection pour le jeu de cartes Riftbound (Riot Games) — inspiré de Pokécardex.

## Stack

- React + TypeScript + Vite
- Tailwind CSS v4
- React Router
- Supabase (auth, Postgres, RLS)
- Vitest + Testing Library
- Docker (front) + Supabase CLI (dev local)

## Démarrage

```bash
npm install
npm run dev
```

## Tests

```bash
npm run test        # une passe
npm run test:watch  # mode watch
npm run test:ui     # interface Vitest
```

## Build

```bash
npm run build
```

## Docker (front)

```bash
docker build -t riftbound-tracker .
docker run -p 8080:80 riftbound-tracker
```

## Supabase en local (à faire sur ta machine, avec Docker installé)

Le CLI Supabase lance une stack complète en conteneurs (Postgres, Auth, Studio...).
Ces commandes ne peuvent pas être exécutées dans cet environnement, à lancer chez toi :

```bash
# Installation du CLI (une fois)
npm install -D supabase

# Initialisation du projet Supabase (crée le dossier supabase/)
npx supabase init

# Démarrage de la stack locale (Postgres, Auth, Studio, etc.)
npx supabase start
```

`supabase start` affiche à la fin une `API URL` et une `anon key` à copier dans ton `.env` :

```bash
cp .env.example .env
# puis colle VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
```

Le Studio local (interface graphique de la base) est accessible sur `http://localhost:54323`.

Pour arrêter la stack :

```bash
npx supabase stop
```

## Structure

```
src/
  components/   composants réutilisables
  pages/        écrans (Accueil, CardDetail, CardList, Collection, Wishlist, Settings, Login, Signup)
  lib/          client Supabase, helpers
  hooks/        hooks personnalisés
  types/        types partagés
  test/         setup Vitest
```
