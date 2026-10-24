import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('Falta configurar DATABASE_URL para aplicar la migración.');

const migrationsDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../server/migrations');
const migrations = readdirSync(migrationsDirectory)
  .filter(file => /^\d+_.*\.sql$/.test(file))
  .sort();
const sql = neon(databaseUrl);

try {
  for (const migration of migrations) {
    const statements = readFileSync(resolve(migrationsDirectory, migration), 'utf8')
      .replace(/^\s*--.*$/gm, '')
      .split(';')
      .map(statement => statement.trim())
      .filter(Boolean);
    for (const statement of statements) await sql.query(statement);
  }
  console.log('Migraciones aplicadas correctamente.');
} catch (error) {
  console.error('No se pudieron aplicar las migraciones de outfits.', {
    errorName: error instanceof Error ? error.name : 'UnknownError'
  });
  process.exitCode = 1;
}
