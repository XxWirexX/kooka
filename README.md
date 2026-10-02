# Kooka

> Achète ce qui te fait envie. Kooka s'occupe du reste.

Application de cuisine mobile-first assistée par IA : tu renseignes ce que tu as chez toi, Kooka te propose quoi cuisiner.

## Démarrer

Prérequis : Node.js ≥ 22.

```bash
npm install
cp .env.example .env     # puis renseigne ANTHROPIC_API_KEY (sans clé : mode simulé)
npm run dev              # API sur :3001, front sur http://localhost:5173
```

Le front proxifie `/api` vers l'API ; la base SQLite est créée automatiquement dans `apps/api/data/`.
Pour tester sur ton téléphone : même réseau Wi-Fi, puis ouvre l'URL « Network » affichée par Vite.

| Commande            | Rôle                                    |
| ------------------- | --------------------------------------- |
| `npm run dev`       | API + front en mode développement       |
| `npm test`          | Tests de l'API (Vitest + Supertest)     |
| `npm run typecheck` | Vérification TypeScript de tout le repo |
| `npm run build`     | Build de production du front            |

## Structure

```
apps/
  api/      Express 5 + SQLite (better-sqlite3) — logique métier, validation, appels IA
  web/      React 19 + Vite + Tailwind 4 — interface mobile-first
packages/
  shared/   Schémas Zod et types partagés entre le front et l'API
docs/       Choix techniques et feuille de route
```

Voir [`docs/architecture.md`](docs/architecture.md) pour les choix techniques et [`docs/roadmap.md`](docs/roadmap.md) pour l'avancement.
