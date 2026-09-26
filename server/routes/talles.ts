import { Router } from 'express';
import { sql } from '../db.ts';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const talles = await sql`SELECT * FROM public.talles`;
    res.json(talles);
  } catch {
    res.status(500).json({ error: 'No se pudieron obtener los talles.' });
  }
});

export default router;
