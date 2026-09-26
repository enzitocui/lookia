import { Router } from 'express';
import { sql } from '../db.ts';
import { requireAuth } from '../auth/requireAuth.ts';

const router = Router();

router.get('/', requireAuth, async (_req, res) => {
  try {
    const tipos = await sql`
      SELECT id_tipo, tipo
      FROM public.tipos
      WHERE LOWER(tipo) IN ('superior', 'superiores', 'inferior', 'inferiores', 'calzado', 'accesorio', 'accesorios')
      ORDER BY CASE
        WHEN LOWER(tipo) IN ('superior', 'superiores') THEN 1
        WHEN LOWER(tipo) IN ('inferior', 'inferiores') THEN 2
        WHEN LOWER(tipo) = 'calzado' THEN 3
        ELSE 4
      END, tipo;
    `;
    res.json(tipos);
  } catch {
    res.status(500).json({ error: 'No se pudieron obtener los tipos.' });
  }
});

export default router;
