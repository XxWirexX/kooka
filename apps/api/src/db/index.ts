import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export type Db = Database.Database;

/**
 * Migrations SQL appliquées dans l'ordre. La version courante est stockée dans `PRAGMA user_version`.
 * Ne jamais modifier une migration déjà appliquée : en ajouter une nouvelle à la fin.
 */
const migrations: string[] = [
  `
  CREATE TABLE inventory_items (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL,
    normalized_name TEXT    NOT NULL UNIQUE,
    quantity        REAL,
    unit            TEXT,
    category        TEXT,
    stock_level     TEXT    NOT NULL DEFAULT 'some'
                    CHECK (stock_level IN ('plenty', 'some', 'low', 'out')),
    created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
  `,
  `
  CREATE TABLE saved_recipes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT NOT NULL,
    data       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
  `,
];

export function openDatabase(path: string): Db {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  migrate(db);
  return db;
}

function migrate(db: Db) {
  const current = db.pragma('user_version', { simple: true }) as number;
  for (let version = current; version < migrations.length; version++) {
    db.transaction(() => {
      db.exec(migrations[version]!);
      db.pragma(`user_version = ${version + 1}`);
    })();
  }
}
