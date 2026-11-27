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
   Pour les fiches joueur, appliquez ensuite [`20261023000700_create_players.sql`](supabase/migrations/20261023000700_create_players.sql). Cette migration crée une fiche pour chaque membre-joueur existant et installe les déclencheurs pour les nouvelles adhésions. Après les migrations du match en direct jusqu’à `20261023001100_allow_paused_match_actions.sql`, appliquez [`20261024000100_update_player_stats_on_match_finish.sql`](supabase/migrations/20261024000100_update_player_stats_on_match_finish.sql), [`20261024000200_match_man_of_the_match_vote.sql`](supabase/migrations/20261024000200_match_man_of_the_match_vote.sql), [`20261024000300_best_scorer_stats.sql`](supabase/migrations/20261024000300_best_scorer_stats.sql), puis [`20261024000400_match_motm_voting_deadline.sql`](supabase/migrations/20261024000400_match_motm_voting_deadline.sql) pour les statistiques de fin, le sondage de l’homme du match, le compteur de titres de meilleur buteur et la clôture automatique du vote.
   Enfin, exécutez [`20261025000200_match_guest_attendees.sql`](supabase/migrations/20261025000200_match_guest_attendees.sql), y compris après `schema.sql`, pour autoriser l’inscription d’invités par pseudo sans compte. Les buts d’un invité apparaissent dans le résumé du match, sans créer ni modifier de statistiques sur une fiche joueur.
   Appliquez également toutes les migrations plus récentes dans l’ordre, notamment celles du vote invité et des distinctions : `schema.sql` seul ne les contient pas.
3. Dans Authentication > URL Configuration, définissez `Site URL` sur l’URL de production et ajoutez aux `Redirect URLs` les URL correspondant à chaque environnement : `http://127.0.0.1:5174/**` en local, les domaines exacts de préproduction et de production, ainsi que le motif de domaine de preview fourni par votre hébergeur. L’application transmet l’origine courante comme URL de retour OAuth ; si cette URL n’est pas autorisée par Supabase, celui-ci peut utiliser `Site URL` à la place. Gardez les motifs de preview aussi précis que possible.
4. Redémarrez Vite après toute modification de `.env`.
5. Pour les notifications push, appliquez aussi [`20261028000100_push_notifications.sql`](supabase/migrations/20261028000100_push_notifications.sql), puis ajoutez la clé publique VAPID à `VITE_WEB_PUSH_PUBLIC_KEY` dans `.env`. Générez une paire de clés avec `npx web-push generate-vapid-keys`, déployez la fonction avec `supabase functions deploy send-match-push`, puis configurez les secrets serveur :

   ```sh
   supabase secrets set VAPID_PUBLIC_KEY=<clé-publique> VAPID_PRIVATE_KEY=<clé-privée> VAPID_SUBJECT=mailto:admin@example.com
   ```

   La clé publique configurée côté client doit être identique à `VAPID_PUBLIC_KEY`. La clé privée ne doit jamais être ajoutée à `.env` avec un préfixe `VITE_`. Les utilisateurs activent ensuite les alertes dans l’onglet **Club**; l’autorisation du navigateur et HTTPS en production sont nécessaires.

Un organisateur connecté peut créer une organisation et partager son lien ou son code. Les invités doivent créer un compte ou se connecter avant de rejoindre. Les accès directs aux tables sont fermés par RLS ; les opérations passent par des fonctions RPC.

Les créneaux créés par un utilisateur connecté sont enregistrés dans Supabase et partagés avec les membres de son organisation. Leur capacité est configurable de 2 à 30 joueurs (10 par défaut). Les inscriptions des membres connectés sont également stockées dans Supabase et limitées à la capacité choisie. En mode démo, les matchs et inscriptions restent stockés localement. La PWA conserve son shell hors ligne, mais les opérations Supabase nécessitent une connexion.

Depuis la carte d’un match planifié disposant de places, un membre peut inscrire un joueur de l’effectif du club ou ajouter un invité. Le joueur du club reste lié à son compte et à ses statistiques. Pour cette inscription, appliquez la migration [`20261123000100_add_existing_player_to_match.sql`](supabase/migrations/20261123000100_add_existing_player_to_match.sql) avant de déployer le client.

## Stats des joueurs

## Rotation des gardiens

Dans le direct, le premier joueur de chaque équipe est gardien dès le coup d’envoi (🧤). Les deux équipes tournent simultanément dans l’ordre de leur composition, toutes les **5 minutes** par défaut. En cas d’échange de joueurs, le rôle reste attaché à la place dans la composition.

Les gardiens actuels apparaissent avec leur gant dans chaque côté de l’encart de score. Les contrôles sont repliés sous **Réglages des gardiens** ; en paysage, ils se superposent au bas de l’écran sans réduire les scores plein écran.

Le délai est modifiable pendant le match, y compris en pause, en minutes entières positives. Le nouveau délai s’applique depuis le dernier changement : s’il est déjà écoulé, la rotation est immédiatement rattrapée. Seul le temps de jeu compte ; les pauses arrêtent le compte à rebours. Le réglage est conservé après rechargement et partagé via Supabase. La réinitialisation du match remet les gardiens au premier joueur en conservant le délai.

L’alarme joue un seul coup de corne de stade synthétisé de 1,5 seconde, sans fichier audio externe. Le volume dépend aussi du volume multimédia de l’appareil. Activez et testez l’alarme avec le bouton dans le direct (une interaction sur cette page permet aussi d’activer le son). Le direct doit rester ouvert ; les navigateurs peuvent suspendre le son et les minuteries en arrière-plan ou écran verrouillé. Au retour, les gardiens sont recalculés selon le chronomètre, sans rejouer toutes les alarmes manquées. Un avertissement visible signale un son bloqué.

Pour Supabase, appliquez [`20261109000100_goalkeeper_rotation.sql`](supabase/migrations/20261109000100_goalkeeper_rotation.sql), puis [`20261127000100_repair_goalkeeper_rotation.sql`](supabase/migrations/20261127000100_repair_goalkeeper_rotation.sql) avant d’utiliser ce réglage. La seconde migration restaure les fonctions et recharge le cache API, même si l’historique indique déjà la première comme appliquée ; elle conserve les données existantes. Ces migrations sont également nécessaires après le schéma initial.

## Stats des joueurs

Chaque joueur possède une fiche distincte par organisation. Elle est créée automatiquement lorsque l’adhésion est marquée comme joueur. Les fiches existantes sont créées lors de l’application de la migration `20261023000700_create_players.sql`.

Le roster affiche la note globale (initialisée à 51) et les compteurs de matchs joués, victoires, nuls, défaites, homme du match, meilleur buteur, meilleur défenseur, meilleur gardien et buts. À la fin d’un match, les compteurs de matchs, résultats, buts et titres de meilleur buteur sont actualisés ; tous les meilleurs buteurs ex æquo obtiennent un titre, sauf si le match n’a aucun but.

Les participants, invités compris, peuvent voter séparément pour l’homme du match, le meilleur défenseur et le meilleur gardien, puis pour les distinctions humoristiques du plus gros boucher et du joueur ayant raté le plus d’occasions. Un sélecteur affiche un seul vote à la fois, sans modifier les choix précédents. Le joueur en tête est indiqué provisoirement ; les votes restent modifiables jusqu’à la clôture. Chaque vote se clôt lorsque tous les participants ont voté, dès que le premier ne peut plus être rejoint par les votes restants, ou après 48 heures si au moins trois votes sont enregistrés. Les votes sont alors figés. La clôture est évaluée lors de la consultation ou d’un vote. Les égalités sont récompensées. Seuls les titres de meilleur défenseur et de meilleur gardien alimentent les statistiques : chacun contribue jusqu’à 3 points à la note globale selon la proportion de matchs joués où le joueur a obtenu ce titre. Les deux catégories humoristiques n’affectent pas la note. Les invités n’ont pas de fiche statistique.

Pour ces distinctions et la clôture anticipée de l’homme du match, appliquez les migrations existantes jusqu’à [`20261116000400_fix_early_motm_completion.sql`](supabase/migrations/20261116000400_fix_early_motm_completion.sql) avant de déployer le client.

## Production

```sh
npm run build
npm run preview
```

Sur Vercel, [`vercel.json`](vercel.json) réécrit `/vote`, `/app/:path*` et `/oauth/:path*` vers `/index.html`. Le lien de vote invité `/vote?token=…` doit fonctionner dès la première visite, sans connexion ni service worker déjà installé. Toute nouvelle route accessible directement doit également être couverte par une réécriture. Redéployez l’application après une modification de cette configuration.

`vite-plugin-pwa` génère le manifeste et le service worker à la compilation. L’installation en production nécessite HTTPS. - Répartition de dix joueurs en deux équipes équilibrées selon leur niveau, leurs postes et leurs statistiques.
