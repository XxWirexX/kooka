/**
 * Sauvegarde à chaud de la base SQLite (sans arrêter l'app).
 * Usage : tsx scripts/backup.ts [dossier]   (par défaut : <dossier de la base>/backups)
 * Garde les 14 dernières sauvegardes.
 */
import Database from 'better-sqlite3';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const dbPath = resolve(process.env.DATABASE_PATH ?? './data/kooka.db');
const dir = resolve(process.argv[2] ?? join(dirname(dbPath), 'backups'));
mkdirSync(dir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const target = join(dir, `kooka-${stamp}.db`);
const db = new Database(dbPath, { readonly: true });
await db.backup(target);
db.close();
console.log(`Sauvegarde : ${target}`);

const old = readdirSync(dir)
  .filter((f) => /^kooka-.*\.db$/.test(f))
  .sort()
  .slice(0, -14);
for (const f of old) rmSync(join(dir, f));
