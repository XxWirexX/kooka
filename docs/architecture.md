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
| IA         | **API Claude** (Anthropic), sorties JSON structurées  | Choix du modèle à l'étape 5. Appels uniquement côté serveur : la clé ne quitte jamais le back. |
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

## Principes pour l'intégration de l'IA (étape 5)

- Le back construit le contexte (inventaire compact, préférences, filtres, suggestions déjà vues) et appelle l'IA ; le front ne parle jamais directement au modèle.
- Les réponses sont en **JSON structuré**, validées par un schéma Zod ; en cas d'échec : une nouvelle tentative, puis une erreur claire.
- **Deux appels distincts** : des suggestions légères (titre, temps, difficulté, ingrédients clés, raison), puis la recette complète à la demande. C'est plus rapide et moins coûteux que de générer trois recettes complètes.
- Le **calcul de disponibilité** (« 4/5 ingrédients ») est fait par le back à partir de la liste d'ingrédients renvoyée par l'IA, en ignorant les ingrédients facultatifs et les basiques du placard (sel, poivre, huile…) — on ne laisse pas l'IA inventer ce chiffre.
- La **cohérence est vérifiée côté serveur** : temps total ≥ temps actif, temps passif = total − actif, nombre de portions dans des bornes raisonnables, quantité présente pour chaque ingrédient.
- Les suggestions sont **mises en cache** selon un hash du contexte (inventaire + préférences + filtres) ; « Autres idées » envoie la liste des titres déjà proposés.
- Les instructions libres de l'utilisateur sont insérées comme des préférences, jamais comme des règles système.
