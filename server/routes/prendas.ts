import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import multer from 'multer';
import { fileTypeFromFile } from 'file-type';
import { sql } from '../db.ts';
import { requireAuth } from '../auth/requireAuth.ts';

const router = Router();
const uploadsRoot = path.resolve(process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads'));
const uploadRoot = path.join(uploadsRoot, 'prendas');
const acceptedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const extensionsByMime: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, callback) => {
      const userId = Number(req.session.userId);
      const destination = path.join(uploadRoot, String(userId));
      fs.mkdir(destination, { recursive: true }).then(() => callback(null, destination), error => callback(error as Error, destination));
    },
    filename: (_req, _file, callback) => callback(null, `${randomUUID()}.upload`),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

const categoryAliases: Record<string, string[]> = {
  superior: ['superior', 'superiores'],
  inferior: ['inferior', 'inferiores'],
  calzado: ['calzado'],
  accesorio: ['accesorio', 'accesorios'],
};

const getCatalogSelection = async (tipo: string, subTipo: string) => {
  const [selectedType] = await sql`
    SELECT id_tipo, tipo
    FROM public.tipos
    WHERE LOWER(tipo) = LOWER(${tipo})
    LIMIT 1;
  `;

  if (!selectedType || !Object.values(categoryAliases).some(aliases => aliases.includes(String(selectedType.tipo).toLowerCase()))) {
    return null;
  }

  const [selectedSubType] = await sql`
    SELECT id_subtipo, sub_tipo
    FROM public.sub_tipo
    WHERE id_tipo = ${selectedType.id_tipo}
      AND LOWER(sub_tipo) = LOWER(${subTipo})
    LIMIT 1;
  `;

  if (!selectedSubType) return null;
  return { tipo: String(selectedType.tipo), sub_tipo: String(selectedSubType.sub_tipo) };
};

const removeOwnedImage = async (photo: unknown, userId: number) => {
  if (typeof photo !== 'string') return;
  const expectedPrefix = `/uploads/prendas/${userId}/`;
  if (!photo.startsWith(expectedPrefix)) return;

  const filename = photo.slice(expectedPrefix.length);
  if (!filename || path.basename(filename) !== filename) return;
  const absolutePath = path.join(uploadRoot, String(userId), filename);
  await fs.unlink(absolutePath).catch(() => {});
};

const processUpload = (req: Request, res: Response, next: NextFunction) => {
  upload.single('file')(req, res, error => {
    if (error) {
      const message = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE'
        ? 'La imagen debe pesar menos de 5 MB.'
        : error.message || 'No se pudo procesar la imagen.';
      res.status(400).json({ error: message });
      return;
    }
    next();
  });
};

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    const prendas = await sql`
      SELECT id_prendas, tipo, sub_tipo, foto, color
      FROM public.prendas
      WHERE id_users = ${Number(req.session.userId)}
      ORDER BY id_prendas DESC;
    `;
    res.json(prendas);
  } catch {
    res.status(500).json({ error: 'No se pudieron obtener las prendas.' });
  }
});

router.post('/', processUpload, async (req, res) => {
  const userId = Number(req.session.userId);
  const tipo = String(req.body?.tipo ?? '').trim();
  const subTipo = String(req.body?.sub_tipo ?? '').trim();
  const color = String(req.body?.color ?? '').trim();
  const file = req.file;

  if (!file) return res.status(400).json({ error: 'Seleccioná una imagen para la prenda.' });
  if (!tipo || !subTipo || !color) {
    await fs.unlink(file.path).catch(() => {});
    return res.status(400).json({ error: 'Completá el tipo, subtipo y color de la prenda.' });
  }

  let storedPath = file.path;
  try {
    const detectedType = await fileTypeFromFile(file.path);
    if (!detectedType || !acceptedMimeTypes.has(detectedType.mime)) {
      await fs.unlink(file.path).catch(() => {});
      return res.status(400).json({ error: 'El archivo no es una imagen JPG, JPEG o PNG válida.' });
    }

    const extension = extensionsByMime[detectedType.mime];
    storedPath = path.join(path.dirname(file.path), `${randomUUID()}${extension}`);
    await fs.rename(file.path, storedPath);

    const catalogSelection = await getCatalogSelection(tipo, subTipo);
    if (!catalogSelection) {
      await fs.unlink(storedPath).catch(() => {});
      return res.status(400).json({ error: 'El tipo y subtipo seleccionados no son válidos.' });
    }

    const photo = `/uploads/prendas/${userId}/${path.basename(storedPath)}`;
    const [prenda] = await sql`
      INSERT INTO public.prendas (tipo, sub_tipo, foto, color, id_users)
      VALUES (${catalogSelection.tipo}, ${catalogSelection.sub_tipo}, ${photo}, ${color}, ${userId})
      RETURNING id_prendas, tipo, sub_tipo, foto, color;
    `;

    return res.status(201).json({ prenda });
  } catch (error) {
    await fs.unlink(storedPath).catch(() => {});
    await fs.unlink(file.path).catch(() => {});
    console.error('Error al crear prenda:', error);
    return res.status(500).json({ error: 'No se pudo guardar la prenda.' });
  }
});

router.put('/:id', async (req, res) => {
  const userId = Number(req.session.userId);
  const prendaId = Number(req.params.id);
  const tipo = String(req.body?.tipo ?? '').trim();
  const subTipo = String(req.body?.sub_tipo ?? '').trim();
  const color = String(req.body?.color ?? '').trim();

  if (!Number.isInteger(prendaId) || prendaId <= 0) return res.status(400).json({ error: 'Prenda inválida.' });
  if (!tipo || !subTipo || !color) return res.status(400).json({ error: 'Completá el tipo, subtipo y color de la prenda.' });

  try {
    const catalogSelection = await getCatalogSelection(tipo, subTipo);
    if (!catalogSelection) return res.status(400).json({ error: 'El tipo y subtipo seleccionados no son válidos.' });

    const [prenda] = await sql`
      UPDATE public.prendas
      SET tipo = ${catalogSelection.tipo}, sub_tipo = ${catalogSelection.sub_tipo}, color = ${color}
      WHERE id_prendas = ${prendaId} AND id_users = ${userId}
      RETURNING id_prendas, tipo, sub_tipo, foto, color;
    `;
    if (!prenda) return res.status(404).json({ error: 'Prenda no encontrada.' });
    return res.json({ prenda });
  } catch (error) {
    console.error('Error al actualizar prenda:', error);
    return res.status(500).json({ error: 'No se pudo actualizar la prenda.' });
  }
});

router.delete('/:id', async (req, res) => {
  const userId = Number(req.session.userId);
  const prendaId = Number(req.params.id);
  if (!Number.isInteger(prendaId) || prendaId <= 0) return res.status(400).json({ error: 'Prenda inválida.' });

  try {
    const [prenda] = await sql`
      DELETE FROM public.prendas
      WHERE id_prendas = ${prendaId} AND id_users = ${userId}
      RETURNING foto;
    `;
    if (!prenda) return res.status(404).json({ error: 'Prenda no encontrada.' });
    await removeOwnedImage(prenda.foto, userId);
    return res.json({ message: 'Prenda eliminada.' });
  } catch (error) {
    console.error('Error al eliminar prenda:', error);
    return res.status(500).json({ error: 'No se pudo eliminar la prenda.' });
  }
});

export default router;
