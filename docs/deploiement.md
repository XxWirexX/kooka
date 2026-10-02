# Déployer Kooka sur un VPS

Kooka tourne dans **un conteneur Docker** (API + front compilé). **Caddy**, placé devant, gère le HTTPS automatiquement avec Let's Encrypt.
Les données (base SQLite) vivent dans un volume Docker et survivent aux mises à jour.

```
Internet ──443──▶ Caddy ──▶ kooka:3001 (Express : /api + front) ──▶ /data/kooka.db
```

## 1. Prérequis

- Un VPS Linux avec **Docker** et le plugin **compose** :
  ```bash
  curl -fsSL https://get.docker.com | sh
  docker compose version
  ```
- Les ports **80 et 443** ouverts (`ufw allow 80,443/tcp` si tu utilises ufw).
- Un **nom de domaine** dont l'enregistrement A pointe vers l'IP du VPS.
  Pas de domaine ? `51-75-12-34.sslip.io` (ton IP avec des tirets) pointe automatiquement vers `51.75.12.34` et fonctionne avec Let's Encrypt.

Le HTTPS est indispensable : sans lui, la connexion ne tient pas (cookie sécurisé), l'installation sur l'écran d'accueil et le maintien de l'écran allumé ne fonctionnent pas.

## 2. Installation

```bash
git clone <url-du-depot> kooka && cd kooka
cp .env.production.example .env.production
nano .env.production        # remplis KOOKA_DOMAIN, APP_PASSWORD, SESSION_SECRET, OPENAI_API_KEY…
openssl rand -hex 32        # → à coller dans SESSION_SECRET
docker compose up -d --build
docker compose logs -f      # Ctrl+C pour quitter
```

Au démarrage, les logs doivent afficher `[ai] openai · suggestions : …` puis `Kooka → http://localhost:3001`.
Ouvre ensuite `https://<ton-domaine>`, entre ton mot de passe, puis sur ton téléphone : **Partager → Sur l'écran d'accueil** (iPhone) ou **⋮ → Installer l'application** (Android).

> Le dépôt est privé ? Clone-le avec une clé de déploiement GitHub (*Settings → Deploy keys*, en lecture seule) ou un jeton d'accès.

## 3. Mettre à jour

```bash
./deploy/update.sh          # git pull + reconstruction + redémarrage
```

Les migrations de la base s'appliquent toutes seules au démarrage.

## 4. Sauvegardes

```bash
./deploy/backup.sh          # copie à chaud de la base → ./backups/ (14 dernières gardées dans le volume)
```

Sauvegarde automatique chaque nuit à 3 h 10 (`crontab -e`) :

```
10 3 * * * cd /chemin/vers/kooka && ./deploy/backup.sh >> backups/backup.log 2>&1
```

Pense à copier de temps en temps `./backups` hors du VPS (sur ton PC, par exemple avec `scp`).

## 5. Reprendre tes données locales

Pour transférer l'inventaire et les recettes de ton PC (`apps/api/data/kooka.db`) :

```bash
scp apps/api/data/kooka.db vps:~/kooka/kooka.db          # depuis ton PC (app locale arrêtée)
docker compose stop kooka                                # sur le VPS
docker compose cp kooka.db kooka:/data/kooka.db
docker compose start kooka && rm kooka.db
```

## 6. Tu as déjà nginx (ou un autre site) sur les ports 80/443 ?

Supprime le service `caddy` de `docker-compose.yml`, publie Kooka sur la boucle locale uniquement :

```yaml
  kooka:
    ports:
      - "127.0.0.1:3001:3001"
```

puis ajoute un site nginx (avec ton certificat, par exemple via certbot) :

```nginx
location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## 7. Sécurité et coûts

- **Mot de passe** : obligatoire en production (l'app refuse de démarrer sans). 10 essais de connexion maximum par quart d'heure et par adresse.
- **Changer de mot de passe** ou de `SESSION_SECRET` déconnecte tous tes appareils.
- **Garde-fou IA** : `AI_CALLS_PER_HOUR` (60 par défaut) limite le nombre d'appels par heure.
- **Limite de dépense** : fixe un plafond mensuel dans les réglages de facturation OpenAI, et utilise une clé dédiée à la prod.
- **Suivi des coûts** : chaque appel IA est journalisé (`docker compose logs kooka | grep "\[ai\]"`).

## Dépannage

| Symptôme | Piste |
|---|---|
| Caddy n'obtient pas de certificat | Le domaine pointe-t-il vers le VPS ? Les ports 80/443 sont-ils ouverts ? `docker compose logs caddy` |
| La connexion « tourne en boucle » | L'app est ouverte en HTTP au lieu de HTTPS. Pour un test en HTTP uniquement : `SECURE_COOKIE=false` |
| `APP_PASSWORD est obligatoire en production` | Variable manquante dans `.env.production` |
| Erreur « Crédit IA épuisé » | Recharge le compte OpenAI ou vérifie la clé |
