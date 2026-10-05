import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import multer from 'multer';
import { fileTypeFromFile } from 'file-type';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { sql } from '../db.ts';
import { requireAuth } from '../auth/requireAuth.ts';

const router = Router();
const uploadsRoot = path.resolve(process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads'));
const uploadRoot = path.join(uploadsRoot, 'prendas');
const extensionsByMime: Record<string, string> = { 'image/jpeg': '.jpg' };

const sanitizeSvg = (contents: string) => {
  if (/<!DOCTYPE|<!ENTITY/i.test(contents)) return null;
  let hasParseError = false;
  const document = new DOMParser({
    onError: level => {
      if (level !== 'warning') hasParseError = true;
    },
  }).parseFromString(contents, 'image/svg+xml');
  const root = document.documentElement;
  if (hasParseError || root?.localName.toLowerCase() !== 'svg'
    || (root.namespaceURI && root.namespaceURI !== 'http://www.w3.org/2000/svg')) return null;
  if (!root.namespaceURI) root.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  const blockedElements = new Set([
    'script', 'style', 'foreignobject', 'iframe', 'object', 'embed', 'audio', 'video',
    'animate', 'animatemotion', 'animatetransform', 'set',
  ]);
  const elements = document.getElementsByTagName('*');
  for (let elementIndex = elements.length - 1; elementIndex >= 0; elementIndex -= 1) {
    const element = elements.item(elementIndex);
    if (!element) continue;
    if (blockedElements.has(element.localName.toLowerCase())) {
      element.parentNode?.removeChild(element);
      continue;
    }

    for (let attributeIndex = element.attributes.length - 1; attributeIndex >= 0; attributeIndex -= 1) {
      const attribute = element.attributes.item(attributeIndex);
      if (!attribute) continue;
      const name = attribute.localName.toLowerCase();
      const value = attribute.value.trim();
      const unsafeReference = /^(?:href|src)$/i.test(name) && value !== '' && !value.startsWith('#');
      const unsafeUrlFunction = /url\s*\(\s*(['"]?)(?!#)[^)]*\)/i.test(value);
      const unsafeStyle = name === 'style' && (/expression\s*\(|@import/i.test(value));
      if (name.startsWith('on') || unsafeReference || unsafeUrlFunction || unsafeStyle || /javascript\s*:/i.test(value)) {
        element.removeAttributeNode(attribute);
      }
    }
  }

  return new XMLSerializer().serializeToString(document);
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
    const safeSvg = !detectedType || detectedType.mime === 'image/svg+xml'
      ? sanitizeSvg(await fs.readFile(file.path, 'utf8'))
      : null;
    const isSvg = detectedType?.mime === 'image/svg+xml' || safeSvg !== null;
    if ((detectedType?.mime === 'image/svg+xml' && safeSvg === null)
      || (!detectedType?.mime.startsWith('image/') && safeSvg === null)) {
      await fs.unlink(file.path).catch(() => {});
      return res.status(400).json({ error: 'El contenido del archivo no es una imagen válida.' });
    }

    const extension = isSvg || detectedType?.mime === 'image/svg+xml'
      ? '.svg'
      : extensionsByMime[detectedType!.mime] || `.${detectedType!.ext}`;
    storedPath = path.join(path.dirname(file.path), `${randomUUID()}${extension}`);
    if (safeSvg !== null) {
      await fs.writeFile(storedPath, safeSvg, 'utf8');
      await fs.unlink(file.path);
    } else {
      await fs.rename(file.path, storedPath);
    }

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
