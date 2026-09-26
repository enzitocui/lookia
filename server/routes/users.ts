import { Router } from 'express';
import { sql } from '../db.ts';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const users = await sql`
      SELECT
        id_users,
        nombre,
        apellido,
        username,
        photo,
        email,
        created_dt,
        update_dt,
        last_login,
        fecha_nacimiento,
        pais
      FROM public.users
    `;
    res.json(users);
  } catch {
    res.status(500).json({ error: 'No se pudieron obtener los usuarios.' });
  }
});

export default router;
