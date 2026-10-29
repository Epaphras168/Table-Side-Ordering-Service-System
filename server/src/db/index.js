import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import DatabaseConstructor from 'better-sqlite3';

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(__dirname, 'schema.sql');

export function openDb(filename = join(__dirname, '..', '..', 'data', 'toss.sqlite')) {
  if (filename !== ':memory:') {
    mkdirSync(dirname(filename), { recursive: true });
  }
  const db = new DatabaseConstructor(filename);
  db.pragma('journal_mode = WAL');
  db.exec(readFileSync(schemaPath, 'utf8'));
  return db;
}
