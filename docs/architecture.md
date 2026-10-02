# Choix techniques

Objectif : un prototype réellement utilisable, propre et évolutif, sans infrastructure surdimensionnée.

## Stack

| Couche     | Choix                                                 | Pourquoi |
| ---------- | ----------------------------------------------------- | -------- |
| Langage    | **TypeScript** partout                                | Les réponses de l'IA sont des objets structurés : les typer de bout en bout évite toute une catégorie de bugs. |
| Monorepo   | **npm workspaces**                                    | Aucun outil supplémentaire ; permet de partager les schémas entre le front et le back. |
| Validation | **Zod** (dans `packages/shared`)                      | Une seule définition sert à valider les requêtes, à valider les réponses de l'IA et à typer le front. Zod sait aussi produire un JSON Schema pour les sorties structurées de l'IA. |
| Front      | **React 19 + Vite**, React Router, TanStack Query     | Stack que tu connais déjà ; TanStack Query gère le cache des données serveur (inventaire, suggestions) sans store global. |
| Style      | **Tailwind CSS 4** + lucide-react                     | Itération rapide sur le design mobile ; les couleurs de la marque sont des tokens dans `apps/web/src/index.css`. |
| Back       | **Express 5**                                         | Stack que tu connais déjà, et suffisante. Express 5 propage nativement les erreurs des handlers async. |
| Base       | **SQLite** (better-sqlite3)                           | Un fichier, aucun serveur à gérer, synchrone et rapide. Migrations SQL versionnées via `PRAGMA user_version`. Passage à PostgreSQL possible plus tard (SQL standard). |
| IA         | **OpenAI ou Claude** (au choix), sorties JSON structurées | Fournisseur et modèle choisis dans `.env`. Appels uniquement côté serveur : la clé ne quitte jamais le back. |
| Tests      | **Vitest + Supertest**                                | Tests d'API rapides sur une base SQLite en mémoire. |

### Ce qui a été volontairement écarté

- **ORM (Prisma, Drizzle…)** : avec quelques tables, du SQL lisible suffit. À reconsidérer si le schéma grossit.
- **Authentification** : le MVP est mono-utilisateur (toi). Ajouter `user_id` aux tables sera une migration simple le jour où l'app deviendra publique.
- **Next.js / SSR** : pas de besoin de SEO, une SPA + une API est plus simple.
- **App native (React Native)** : une PWA (manifest + installation sur l'écran d'accueil) couvrira l'usage mobile pour le MVP.
- **Redux / Zustand** : TanStack Query + l'état local suffisent ; les filtres persistants pourront vivre dans l'URL ou dans `localStorage`.

## Organisation du back

Chaque fonctionnalité est un module `apps/api/src/modules/<nom>/` :

- `*.repository.ts` — accès SQL brut, aucune règle métier ;
- `*.service.ts` — règles métier et validation (Zod) ;
- `*.routes.ts` — traduction HTTP ↔ service.

`createApp(db)` reçoit la base en paramètre, ce qui permet aux tests d'utiliser une base en mémoire.

## Modèle de l'inventaire

Seul le **nom** est obligatoire. La quantité, l'unité et la catégorie sont facultatives.

Le niveau de stock (`stockLevel`) vaut `plenty` (beaucoup), `some` (en stock, valeur par défaut), `low` (presque fini) ou `out` (plus du tout).
Les trois états conceptuels du brief en découlent :

| État         | Signification                                              |
| ------------ | ---------------------------------------------------------- |
| Disponible   | dans l'inventaire avec `plenty`, `some` ou `low`           |
| Indisponible | dans l'inventaire avec `out`                               |
| Inconnu      | absent de l'inventaire — **jamais** traité comme manquant  |

Règles métier :

- les noms sont dédoublonnés grâce à une clé normalisée (casse, accents, pluriel simple) : « Carottes » = « carotte » ;
- ajouter un ingrédient déjà présent le réapprovisionne (`out` → `some`) au lieu de créer un doublon ;
- l'ajout rapide accepte plusieurs ingrédients séparés par des virgules ;
- un ingrédient épuisé est conservé (et non supprimé) : on garde ainsi la trace d'un ingrédient que l'utilisateur achète habituellement.

Les dates de péremption et l'état ouvert/fermé sont reportés après le MVP (ils seront ajoutés par migration).

## Intégration de l'IA

Code : `apps/api/src/modules/ai/` (fournisseur), `suggestions/` et `recipes/` (règles métier).

- `RecipeAI` est une interface avec trois implémentations :
  - `openai.ts` — API Responses d'OpenAI (`responses.parse` + `zodTextFormat`), modèle par défaut `gpt-5.5` ;
  - `anthropic.ts` — API Claude (`beta.messages.parse` + `betaZodOutputFormat`), modèle par défaut `claude-opus-5-5`, avec `fallbacks: "default"` (relance sur un modèle de repli en cas de refus injustifié) ;
  - `mock.ts` — réponses factices, utilisées par les tests et quand aucune clé n'est configurée.
- Choix via `.env` : `AI_PROVIDER` (`openai`, `anthropic`, `mock`) et `AI_MODEL`. Sans `AI_PROVIDER`, le fournisseur dont la clé est présente est utilisé.
- Les deux fournisseurs partagent les mêmes prompts et les mêmes schémas Zod (`schemas.ts`).
- **Coût** : modèle et niveau de réflexion se règlent séparément pour chaque appel (`AI_MODEL_SUGGEST`, `AI_MODEL_RECIPE`, `AI_EFFORT_SUGGEST`, `AI_EFFORT_RECIPE`), réflexion `low` par défaut. Chaque appel affiche dans le terminal ses tokens (entrée, sortie, dont réflexion), sa durée et son coût estimé (`usage.ts` ; estimation haute, la remise sur les tokens en cache n'est pas déduite).
- Les prompts sont dans `prompts.ts`, en français ; l'inventaire est envoyé sous forme compacte (une ligne par ingrédient).

### Principes

- Le back construit le contexte (inventaire compact, préférences, filtres, suggestions déjà vues) et appelle l'IA ; le front ne parle jamais directement au modèle.
- Les réponses sont en **JSON structuré**, validées par un schéma Zod ; en cas d'échec : une nouvelle tentative, puis une erreur claire.
- **Deux appels distincts** : des suggestions légères (titre, temps, difficulté, ingrédients clés, raison), puis la recette complète à la demande. C'est plus rapide et moins coûteux que de générer trois recettes complètes.
- Le **calcul de disponibilité** (« 4/5 ingrédients ») est fait par le back à partir de la liste d'ingrédients renvoyée par l'IA, en ignorant les ingrédients facultatifs et les basiques du placard (sel, poivre, huile…) — on ne laisse pas l'IA inventer ce chiffre.
- La **cohérence est vérifiée côté serveur** : temps total ≥ temps actif, temps passif = total − actif, nombre de portions dans des bornes raisonnables, quantité présente pour chaque ingrédient.
- Les suggestions sont **mises en cache** selon un hash du contexte (inventaire + préférences + filtres) ; « Autres idées » envoie la liste des titres déjà proposés.
- Les instructions libres de l'utilisateur sont insérées comme des préférences, jamais comme des règles système.

## Préférences et basiques du placard

- `preferences` : une seule ligne JSON (mono-utilisateur), validée par `preferencesSchema` ; les champs manquants reprennent les valeurs par défaut.
- Le profil est envoyé à l'IA sous forme compacte (`describeProfile`). Les instructions libres sont citées entre guillemets comme des préférences : elles ne remplacent ni les règles ni le format de réponse.
- Les basiques déclarés sont ajoutés à l'inventaire **uniquement pour le calcul des statuts** (`lib/kitchen.ts`) : un vrai ingrédient d'inventaire du même nom reste prioritaire (ex. « beurre » marqué épuisé).
- Les préférences font partie des clés de cache : les modifier invalide les suggestions.

## Mode cuisine

- `cooking_sessions` : une ligne par préparation (recette figée en JSON, nombre de personnes, étape courante, dates). Plusieurs peuvent être actives : on les quitte et on y revient (meal prep). Terminer → historique ; abandonner → suppression.
- Les minuteurs vivent côté navigateur (`lib/timers.ts`) et reposent sur une heure de fin : ils survivent aux changements de page, de recette et aux rechargements. L'alarme (son + vibration) est montée à la racine de l'app.
- « Une question ? » : `POST /api/cooking/:id/ask`, avec la recette, l'étape courante et au plus 6 échanges précédents. Réponse courte (schéma `{ answer }`), modèle léger par défaut (`AI_MODEL_ASK`). Volontairement limité : pas de conversation libre.

## Production

- Une seule image Docker : Express sert l'API et le front compilé (`apps/web/dist`), avec un renvoi vers `index.html` pour les routes de l'app. Caddy termine le HTTPS devant.
- **Accès** (`modules/auth`) : mot de passe unique (`APP_PASSWORD`, obligatoire en production) ; session = cookie signé HMAC sans état serveur (`<expiration>.<signature>`), `HttpOnly`, `SameSite=Lax`, `Secure` en production, 90 jours. Toutes les routes `/api` sauf `/health` et `/auth/*` exigent la session.
- **Limites** (`lib/rateLimit.ts`, en mémoire) : 10 tentatives de connexion / 15 min / IP ; `AI_CALLS_PER_HOUR` appels IA par heure.
- Le TypeScript est exécuté par `tsx` en production aussi (pas d'étape de compilation de l'API) : simple et suffisant pour une instance personnelle.
