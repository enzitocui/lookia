import { Router } from 'express';
import { sql } from '../db.ts';
import { requireAuth } from '../auth/requireAuth.ts';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const tipo = String(req.query.tipo ?? '').trim();
    const subTipos = tipo
      ? await sql`
          SELECT st.id_subtipo, st.sub_tipo, st.id_tipo
          FROM public.sub_tipo st
          INNER JOIN public.tipos t ON t.id_tipo = st.id_tipo
          WHERE LOWER(t.tipo) = LOWER(${tipo})
          ORDER BY st.sub_tipo;
        `
      : await sql`
          SELECT st.id_subtipo, st.sub_tipo, st.id_tipo
          FROM public.sub_tipo st
          INNER JOIN public.tipos t ON t.id_tipo = st.id_tipo
          WHERE LOWER(t.tipo) IN ('superior', 'superiores', 'inferior', 'inferiores', 'calzado', 'accesorio', 'accesorios')
          ORDER BY st.id_tipo, st.sub_tipo;
        `;
    res.json(subTipos);
  } catch {
    res.status(500).json({ error: 'No se pudieron obtener los subtipos.' });
  }
});

export default router;
