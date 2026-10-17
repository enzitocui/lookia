import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('Falta configurar DATABASE_URL para aplicar la migración.');

const migrationPath = resolve(dirname(fileURLToPath(import.meta.url)), '../server/migrations/001_saved_outfits.sql');
const statements = readFileSync(migrationPath, 'utf8')
  .replace(/^\s*--.*$/gm, '')
  .split(';')
  .map(statement => statement.trim())
  .filter(Boolean);
const sql = neon(databaseUrl);

try {
  for (const statement of statements) await sql.query(statement);
  console.log('Migración de outfits guardados aplicada correctamente.');
} catch (error) {
  console.error('No se pudo aplicar la migración de outfits guardados.', {
    errorName: error instanceof Error ? error.name : 'UnknownError'
  });
  process.exitCode = 1;
}
