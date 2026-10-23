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
   Pour un projet déjà configuré, appliquez dans l’ordre les migrations qui ne sont pas encore présentes : [`20261019000100_organization_invitations.sql`](supabase/migrations/20261019000100_organization_invitations.sql), [`20261019000200_match_slots.sql`](supabase/migrations/20261019000200_match_slots.sql), [`20261019000300_match_attendees.sql`](supabase/migrations/20261019000300_match_attendees.sql), [`20261019000400_match_capacity.sql`](supabase/migrations/20261019000400_match_capacity.sql), [`20261019000500_match_creator_signup.sql`](supabase/migrations/20261019000500_match_creator_signup.sql), [`20261023000100_fix_join_organization_ambiguous_column.sql`](supabase/migrations/20261023000100_fix_join_organization_ambiguous_column.sql), [`20261023000200_leave_organization.sql`](supabase/migrations/20261023000200_leave_organization.sql), [`20261023000300_remove_organization_member.sql`](supabase/migrations/20261023000300_remove_organization_member.sql), [`20261023000400_transfer_organization_creator_on_leave.sql`](supabase/migrations/20261023000400_transfer_organization_creator_on_leave.sql), [`20261023000500_prevent_duplicate_organization_join.sql`](supabase/migrations/20261023000500_prevent_duplicate_organization_join.sql), puis [`20261023000600_unique_organization_names.sql`](supabase/migrations/20261023000600_unique_organization_names.sql).
   La migration des noms uniques échoue avec un message explicite si des organisations existantes ont déjà des noms identiques (sans tenir compte de la casse ni des espaces périphériques) ; renommez ces doublons avant de la relancer.
   Sans Supabase CLI, ouvrez **SQL Editor**, puis exécutez le contenu de chaque fichier de migration, dans cet ordre. L’exécution manuelle dans SQL Editor ne met pas à jour l’historique des migrations du CLI ; si vous reprenez ensuite `supabase db push`, vérifiez et réconciliez cet historique avant le déploiement.
   Pour les fiches joueur, appliquez ensuite [`20261023000700_create_players.sql`](supabase/migrations/20261023000700_create_players.sql). Cette migration crée une fiche pour chaque membre-joueur existant et installe les déclencheurs pour les nouvelles adhésions.
3. Dans Authentication > URL Configuration, définissez `Site URL` sur l’URL de production et ajoutez aux `Redirect URLs` les URL correspondant à chaque environnement : `http://127.0.0.1:5174/**` en local, les domaines exacts de préproduction et de production, ainsi que le motif de domaine de preview fourni par votre hébergeur. L’application transmet l’origine courante comme URL de retour OAuth ; si cette URL n’est pas autorisée par Supabase, celui-ci peut utiliser `Site URL` à la place. Gardez les motifs de preview aussi précis que possible.
4. Redémarrez Vite après toute modification de `.env`.

Un organisateur connecté peut créer une organisation et partager son lien ou son code. Les invités doivent créer un compte ou se connecter avant de rejoindre. Les accès directs aux tables sont fermés par RLS ; les opérations passent par des fonctions RPC.

Les créneaux créés par un utilisateur connecté sont enregistrés dans Supabase et partagés avec les membres de son organisation. Leur capacité est configurable de 2 à 30 joueurs (10 par défaut). Les inscriptions des membres connectés sont également stockées dans Supabase et limitées à la capacité choisie. En mode démo, les matchs et inscriptions restent stockés localement. La PWA conserve son shell hors ligne, mais les opérations Supabase nécessitent une connexion.

## Stats des joueurs

Chaque joueur possède une fiche distincte par organisation. Elle est créée automatiquement lorsque l’adhésion est marquée comme joueur. Les fiches existantes sont créées lors de l’application de la migration `20261023000700_create_players.sql`.

Le roster affiche la note globale (initialisée à 50) et les compteurs de matchs joués, victoires, nuls, défaites, homme du match et buts (initialisés à 0). Pour l’instant, ces valeurs sont stockées et affichées, mais les inscriptions et résultats des matchs ne les mettent pas encore à jour automatiquement.

## Production

```sh
npm run build
npm run preview
```

`vite-plugin-pwa` génère le manifeste et le service worker à la compilation. L’installation en production nécessite HTTPS. - Répartition de dix joueurs en deux équipes équilibrées selon leur niveau, leurs postes et leurs statistiques.
