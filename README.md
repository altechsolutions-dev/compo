# Compo

PWA construite avec React, TypeScript et Vite. Les espaces créés sont conservés localement sur l’appareil.

## Démarrage

```sh
npm install
npm run dev
```

## Production

```sh
npm run build
npm run preview
```

`vite-plugin-pwa` génère le manifeste et le service worker à la compilation. L’interface est mise en cache pour les visites hors ligne ; l’installation nécessite HTTPS en production.

# Compo

PWA de gestion de matchs de football à 5, construite avec React, TypeScript et Vite.

## Démarrage

```sh
npm install
cp .env.example .env
npm run dev
```

## Invitations Supabase

1. Créez un projet Supabase et copiez son URL ainsi que sa clé publique `anon` dans `.env` (`VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`). La clé `service_role` ne doit jamais être utilisée dans le navigateur.
2. Exécutez [`supabase/schema.sql`](supabase/schema.sql) dans le SQL Editor du projet Supabase.
   Pour un projet déjà configuré, exécutez les migrations dans l’ordre : [`20261019000200_match_slots.sql`](supabase/migrations/20261019000200_match_slots.sql), [`20261019000300_match_attendees.sql`](supabase/migrations/20261019000300_match_attendees.sql), [`20261019000400_match_capacity.sql`](supabase/migrations/20261019000400_match_capacity.sql), puis [`20261019000500_match_creator_signup.sql`](supabase/migrations/20261019000500_match_creator_signup.sql).
3. Dans Authentication, activez l’authentification e-mail et ajoutez `http://127.0.0.1:5174/**` aux URL de redirection autorisées, ainsi que le domaine de production.
4. Redémarrez Vite après toute modification de `.env`.

Un organisateur connecté peut créer une organisation et partager son lien ou son code. Les invités doivent créer un compte ou se connecter avant de rejoindre. Les accès directs aux tables sont fermés par RLS ; les opérations passent par des fonctions RPC.

Les créneaux créés par un utilisateur connecté sont enregistrés dans Supabase et partagés avec les membres de son organisation. Leur capacité est configurable de 2 à 30 joueurs (10 par défaut). Les inscriptions des membres connectés sont également stockées dans Supabase et limitées à la capacité choisie. En mode démo, les matchs et inscriptions restent stockés localement. La PWA conserve son shell hors ligne, mais les opérations Supabase nécessitent une connexion.

## Production

```sh
npm run build
npm run preview
```

`vite-plugin-pwa` génère le manifeste et le service worker à la compilation. L’installation en production nécessite HTTPS. - Répartition de dix joueurs en deux équipes équilibrées selon leur niveau, leurs postes et leurs statistiques.
