import fs from 'node:fs';
import path from 'node:path';
import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { Router } from 'express';
import { sql } from '../db.ts';

const router = Router();

const sanitizeUser = (user: Record<string, any>) => ({
  id_users: user.id_users,
  nombre: user.nombre,
  apellido: user.apellido,
  username: user.username,
  photo: user.photo,
  email: user.email,
  created_dt: user.created_dt,
  update_dt: user.update_dt,
  last_login: user.last_login,
  fecha_nacimiento: user.fecha_nacimiento,
  pais: user.pais,
});

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Debés iniciar sesión para continuar.' });
  }

  return next();
};

router.get('/', requireAuth, async (req, res) => {
  const userId = Number(req.session.userId);

  try {
    const [user] = await sql`
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
      WHERE id_users = ${userId}
      LIMIT 1;
    `;

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    return res.json({ user: sanitizeUser(user) });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    return res.status(500).json({ error: 'No se pudo cargar el perfil.' });
  }
});

router.put('/', requireAuth, async (req, res) => {
  const userId = Number(req.session.userId);
  const nombre = String(req.body?.nombre ?? '').trim();
  const apellido = String(req.body?.apellido ?? '').trim();
  const username = String(req.body?.username ?? '').trim();
  const email = String(req.body?.email ?? '').trim();
  const fecha_nacimiento = String(req.body?.fecha_nacimiento ?? '').trim();
  const pais = String(req.body?.pais ?? '').trim();

  if (!nombre || !apellido || !username || !email || !fecha_nacimiento || !pais) {
    return res.status(400).json({ error: 'Completá todos los campos del perfil.' });
  }

  try {
    const [currentUser] = await sql`
      SELECT id_users, username, email
      FROM public.users
      WHERE id_users = ${userId}
      LIMIT 1;
    `;

    if (!currentUser) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    if ((currentUser.username ?? '').toLowerCase() !== username.toLowerCase()) {
      const duplicateUsername = await sql`
        SELECT id_users
        FROM public.users
        WHERE LOWER(username) = LOWER(${username})
          AND id_users != ${userId}
        LIMIT 1;
      `;

      if (duplicateUsername.length > 0) {
        return res.status(409).json({ error: 'Este username ya pertenece a otro usuario.' });
      }
    }

    if ((currentUser.email ?? '').toLowerCase() !== email.toLowerCase()) {
      const duplicateEmail = await sql`
        SELECT id_users
        FROM public.users
        WHERE LOWER(email) = LOWER(${email})
          AND id_users != ${userId}
        LIMIT 1;
      `;

      if (duplicateEmail.length > 0) {
        return res.status(409).json({ error: 'Este email ya pertenece a otro usuario.' });
      }
    }

    const [updatedUser] = await sql`
      UPDATE public.users
      SET
        nombre = ${nombre},
        apellido = ${apellido},
        username = ${username},
        email = ${email},
        fecha_nacimiento = ${fecha_nacimiento},
        pais = ${pais},
        update_dt = NOW()
      WHERE id_users = ${userId}
      RETURNING
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
        pais;
    `;

    return res.json({
      message: 'Perfil actualizado.',
      user: sanitizeUser(updatedUser),
    });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    return res.status(500).json({ error: 'No se pudo actualizar el perfil.' });
  }
});

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      const userId = Number((_req as any).session?.userId ?? 0);
      const destination = path.join(process.cwd(), 'uploads', 'profile', String(userId));
      fs.mkdirSync(destination, { recursive: true });
      callback(null, destination);
    },
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase() || '.jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`;
      callback(null, fileName);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      callback(new Error('Formato no permitido. Usa JPG, JPEG, PNG o WEBP.'));
      return;
    }

    callback(null, true);
  },
});

router.post('/photo', requireAuth, (req, res, next) => {
  const uploadSingle = upload.single('file');

  uploadSingle(req, res, async (error) => {
    if (error) {
      return res.status(400).json({ error: error.message || 'No se pudo guardar la foto.' });
    }

    const uploadedFile = (req as any).file as Express.Multer.File | undefined;
    if (!uploadedFile) {
      return res.status(400).json({ error: 'No se recibió ninguna imagen.' });
    }

    try {
      const userId = Number(req.session.userId);
      const photoPath = `/uploads/profile/${userId}/${uploadedFile.filename}`;

      const [updatedUser] = await sql`
        UPDATE public.users
        SET photo = ${photoPath}, update_dt = NOW()
        WHERE id_users = ${userId}
        RETURNING
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
          pais;
      `;

      return res.json({
        message: 'Foto de perfil actualizada.',
        photo: photoPath,
        user: sanitizeUser(updatedUser),
      });
    } catch (uploadError) {
      console.error('Error al guardar la foto de perfil:', uploadError);
      return res.status(500).json({ error: 'No se pudo guardar la foto de perfil.' });
    }
  });
});

export default router;
