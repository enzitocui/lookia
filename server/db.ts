import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('Falta configurar DATABASE_URL en el archivo .env del servidor.');
}

export const sql = neon(databaseUrl);
