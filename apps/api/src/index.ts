import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { openDatabase } from './db/index.js';
import { createAIFromEnv } from './modules/ai/index.js';

const env = process.env;
const production = env.NODE_ENV === 'production';
const here = dirname(fileURLToPath(import.meta.url));

if (production && !env.APP_PASSWORD) {
  // Sans mot de passe, n'importe qui pourrait utiliser la clé IA (et la facture).
  throw new Error('APP_PASSWORD est obligatoire en production');
}

const port = Number(env.PORT ?? 3001);
const db = openDatabase(env.DATABASE_PATH ?? './data/kooka.db');

const app = createApp(db, {
  ai: createAIFromEnv(),
  auth: {
    password: env.APP_PASSWORD,
    secret: env.SESSION_SECRET,
    // Cookie réservé au HTTPS en production. SECURE_COOKIE=false seulement pour un test en HTTP simple.
    secureCookie: production && env.SECURE_COOKIE !== 'false',
  },
  aiCallsPerHour: env.AI_CALLS_PER_HOUR ? Number(env.AI_CALLS_PER_HOUR) : undefined,
  webDist: production ? resolve(here, '../../web/dist') : undefined,
  trustProxy: production,
});

app.listen(port, () => {
  console.log(`Kooka → http://localhost:${port}${production ? '' : ' (API)'}`);
});
