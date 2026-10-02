#!/usr/bin/env sh
# Sauvegarde la base depuis le conteneur (garde les 14 dernières, dans le volume /data/backups),
# puis copie la plus récente sur le VPS, dans ./backups.
set -e
cd "$(dirname "$0")/.."
docker compose exec -T kooka node --import tsx apps/api/scripts/backup.ts /data/backups
mkdir -p backups
latest=$(docker compose exec -T kooka sh -c 'ls -1 /data/backups | tail -n 1')
docker compose cp "kooka:/data/backups/$latest" "backups/$latest"
echo "Copie locale : backups/$latest"
