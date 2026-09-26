import 'dotenv/config';
import path from 'node:path';
import express from 'express';
import session from 'express-session';
import { sql } from './db.ts';
import authRouter from './routes/auth.ts';
import profileRouter from './routes/profile.ts';
import prendasRouter from './routes/prendas.ts';
import tiposRouter from './routes/tipos.ts';
import subTiposRouter from './routes/subTipos.ts';
import usersRouter from './routes/users.ts';
import outfitsRouter from './routes/outfits.ts';
import { requireAuth } from './auth/requireAuth.ts';

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'lookia-local-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

app.use('/uploads/prendas', requireAuth, (req, res, next) => {
  const requestedUserId = req.path.split('/').filter(Boolean)[0];
  if (!requestedUserId || Number(requestedUserId) !== Number(req.session.userId)) {
    return res.sendStatus(404);
  }
  return next();
}, express.static(path.join(process.cwd(), 'uploads', 'prendas')));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/api/health', async (_req, res) => {
  try {
    await sql`SELECT NOW()`;
    res.json({ ok: true, database: true });
  } catch {
    res.status(503).json({ ok: false, database: false });
  }
});

app.use('/api/auth', authRouter);
app.use('/api/profile', profileRouter);
app.use('/api/prendas', prendasRouter);
app.use('/api/tipos', tiposRouter);
app.use('/api/sub-tipos', subTiposRouter);
app.use('/api/users', usersRouter);
app.use('/api/outfits', outfitsRouter);

app.listen(port, '0.0.0.0', () => {
  console.log(`Servidor Express escuchando en el puerto ${port}.`);
});
