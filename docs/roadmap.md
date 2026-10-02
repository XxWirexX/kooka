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
- [ ] **À faire avant tout le reste : tester et ajuster les prompts avec la vraie IA** (qualité, diversité, temps de réponse, coût)
- [ ] **9. Préférences** — quelques préférences structurées + instructions libres
- [ ] **10. Mode cuisine simple** — une étape par écran, minuteurs basiques
- [ ] **11. PWA** — manifest, installation sur l'écran d'accueil, écran maintenu allumé en mode cuisine

## Petites idées à forte valeur (à décider)

- **Basiques du placard** : une case « j'ai les basiques » (sel, poivre, huile, beurre, farine…) plutôt que de les saisir un par un.
- **Mettre à jour l'inventaire après avoir cuisiné** : proposer (sans l'imposer) de marquer les ingrédients utilisés comme « presque fini » ou « plus du tout ».

## Après le MVP

Dates de péremption et aliments ouverts, apprentissage des goûts, historique et notes, liste de courses, planification hebdomadaire, desserts et entrées, comptes utilisateurs, assistant pendant la cuisson.
