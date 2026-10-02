# Feuille de route

La boucle à valider : **Inventaire → Suggestions → Choix → Recette.**

## MVP

- [x] **1. Stack** — voir `architecture.md`
- [x] **2. Initialisation** — monorepo, API, front, tests
- [x] **3. Premières interfaces** — navigation mobile (Idées / Inventaire / Recettes), identité visuelle de base
- [x] **4. Inventaire** — ajout rapide de plusieurs ingrédients, modification, suppression, recherche, niveaux de stock, catégories facultatives
- [x] **5. Suggestions IA** — 3 suggestions à partir de l'inventaire, « Autres idées », raison de chaque suggestion, indicateur de disponibilité, cache
- [x] **6. Fiche recette** — ingrédients avec leur statut (disponible / inconnu / manquant / facultatif), quantités selon le nombre de portions, temps actif/passif, étapes, remarques
- [x] **7. Filtres** — temps, type de cuisine, mode découverte (sans inventaire), conservés entre les visites
- [x] **8. Livre de recettes** — sauvegarde simple, statuts recalculés selon l'inventaire actuel
- [x] **Premiers tests avec la vraie IA** (GPT) : qualité jugée bonne ; coût réduit (modèle et réflexion par appel, génération uniquement à la demande)
- [x] **9. Préférences** — personnes, temps, niveau, découverte, vaisselle, cuisines, ingrédients aimés / à éviter, instructions libres
- [x] **10. Mode cuisine** — une étape par écran, minuteurs persistants, écran maintenu allumé, plusieurs recettes en parallèle (meal prep) avec reprise, questions ponctuelles à l'IA, historique des recettes cuisinées
- [x] **11. PWA (base)** — manifest et icônes : installable sur l'écran d'accueil
- [x] **12. Mise en ligne** — image Docker (API + front), Caddy (HTTPS), mot de passe, limite d'appels IA, sauvegardes : voir `deploiement.md`

## Petites idées à forte valeur (à décider)

- ~~Basiques du placard~~ : fait (dans le profil).

- **Mettre à jour l'inventaire après avoir cuisiné** : proposer (sans l'imposer) de marquer les ingrédients utilisés comme « presque fini » ou « plus du tout ».

## Après le MVP

Dates de péremption et aliments ouverts, apprentissage des goûts, historique et notes, liste de courses, planification hebdomadaire, desserts et entrées, comptes utilisateurs, assistant pendant la cuisson.
