#!/usr/bin/env sh
# Met à jour Kooka sur le VPS : récupère le code, reconstruit l'image, redémarre.
set -e
cd "$(dirname "$0")/.."
git pull --ff-only
docker compose up -d --build
docker image prune -f >/dev/null
docker compose ps
