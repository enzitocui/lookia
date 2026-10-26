import { Router, type Request } from 'express';
import bcrypt from 'bcryptjs';
import { sql } from '../db.ts';
import {
  establishExhibitionSession,
  EXHIBITION_ACCOUNT_EMAIL,
  isExhibitionAccount,
  denyExhibitionAccount,
} from '../auth/exhibitionAccount.ts';

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

const requireString = (value: unknown, fallback = '') => String(value ?? fallback).trim();

const establishUserSession = (req: Request, userId: number) => new Promise<void>((resolve, reject) => {
  req.session.regenerate(error => {
    if (error) {
      reject(error);
      return;
    }

    req.session.userId = userId;
    req.session.save(saveError => saveError ? reject(saveError) : resolve());
  });
});

router.post('/register', denyExhibitionAccount, async (req, res) => {
  const nombre = requireString(req.body?.nombre);
  const apellido = requireString(req.body?.apellido);
  const username = requireString(req.body?.username);
  const email = requireString(req.body?.email);
  const fecha_nacimiento = requireString(req.body?.fecha_nacimiento);
  const pais = requireString(req.body?.pais);
  const contrasena = requireString(req.body?.contrasena);

  if (!nombre || !apellido || !username || !email || !fecha_nacimiento || !pais || !contrasena) {
    return res.status(400).json({ error: 'Completá todos los campos obligatorios.' });
  }

  if (contrasena.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Ingresá un email válido.' });
  }
  if (email.toLocaleLowerCase('en') === EXHIBITION_ACCOUNT_EMAIL) {
    return res.status(409).json({ error: 'Este correo está reservado para la cuenta de exposición.' });
  }

  const userExists = await sql`
    SELECT 1
    FROM public.users
    WHERE LOWER(email) = LOWER(${email})
       OR LOWER(username) = LOWER(${username})
    LIMIT 1;
  `;

  if (userExists.length > 0) {
    const hasEmail = userExists.some((item: any) => String(item.email ?? '').toLowerCase() === email.toLowerCase());
    const hasUsername = userExists.some((item: any) => String(item.username ?? '').toLowerCase() === username.toLowerCase());

    if (hasEmail) {
      return res.status(409).json({ error: 'Este email ya está registrado.' });
    }

    if (hasUsername) {
      return res.status(409).json({ error: 'Este username ya está en uso.' });
    }
  }

  const passwordHash = await bcrypt.hash(contrasena, 12);
  const now = new Date();

  try {
    const [createdUser] = await sql`
      INSERT INTO public.users (
        nombre,
        apellido,
        username,
        email,
        fecha_nacimiento,
        pais,
        contrasena,
        created_dt,
        update_dt,
        last_login,
        photo
      )
      VALUES (
        ${nombre},
        ${apellido},
        ${username},
        ${email},
        ${fecha_nacimiento},
        ${pais},
        ${passwordHash},
        ${now},
        ${now},
        ${now},
        NULL
      )
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

    await establishUserSession(req, Number(createdUser.id_users));
    return res.status(201).json({
      message: 'Registro exitoso.',
      user: sanitizeUser(createdUser),
    });
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    return res.status(500).json({ error: 'No se pudo crear el usuario. Intentalo de nuevo.' });
  }
});

router.post('/login', denyExhibitionAccount, async (req, res) => {
  const identifier = requireString(req.body?.identifier);
  const contrasena = requireString(req.body?.contrasena);

  if (!identifier || !contrasena) {
    return res.status(400).json({ error: 'Ingresá tu email o username y tu contraseña.' });
  }

  try {
    if (identifier.trim().toLocaleLowerCase('en') === EXHIBITION_ACCOUNT_EMAIL) {
      if (!process.env.EXHIBITION_ACCOUNT_PASSWORD_HASH) {
        return res.status(503).json({ error: 'La cuenta de exposición no está configurada.' });
      }
      const validExhibitionLogin = await isExhibitionAccount(
        identifier,
        contrasena,
        process.env.EXHIBITION_ACCOUNT_PASSWORD_HASH,
      );
      if (!validExhibitionLogin) return res.status(401).json({ error: 'Credenciales inválidas.' });
      await establishExhibitionSession(req);
      return res.json({ message: 'Inicio de sesión exitoso.', user: null, exhibitionAccount: true });
    }

    const [user] = await sql`
      SELECT *
      FROM public.users
      WHERE LOWER(email) = LOWER(${identifier})
         OR LOWER(username) = LOWER(${identifier})
      LIMIT 1;
    `;

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const matches = await bcrypt.compare(contrasena, user.contrasena);

    if (!matches) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const [updatedUser] = await sql`
      UPDATE public.users
      SET last_login = NOW(), update_dt = NOW()
      WHERE id_users = ${user.id_users}
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

    await establishUserSession(req, Number(user.id_users));

    return res.json({
      message: 'Inicio de sesión exitoso.',
      user: sanitizeUser(updatedUser ?? user),
    });
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    return res.status(500).json({ error: 'No se pudo iniciar sesión. Intentalo de nuevo.' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      console.error('Error al cerrar sesión:', error);
      return res.status(500).json({ error: 'No se pudo cerrar la sesión.' });
    }

    res.clearCookie('connect.sid');
    return res.json({ message: 'Sesión cerrada.' });
  });
});

router.get('/me', async (req, res) => {
  if (req.session?.exhibitionAccount) {
    return res.json({ user: null, exhibitionAccount: true });
  }
  const userId = req.session?.userId;

  if (!userId) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

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
      req.session.destroy(() => {});
      return res.status(401).json({ error: 'Sesión inválida.' });
    }

    return res.json({ user: sanitizeUser(user) });
  } catch (error) {
    console.error('Error al obtener el usuario actual:', error);
    return res.status(500).json({ error: 'No se pudo obtener la sesión.' });
  }
});

export default router;
