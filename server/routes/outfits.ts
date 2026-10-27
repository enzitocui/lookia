import { Router } from 'express';
import { sql } from '../db.ts';
import { requireAuth } from '../auth/requireAuth.ts';
import { OutfitGenerationError, requestOutfitFromNim, type WardrobeMetadata } from '../services/nvidiaNim.ts';
import {
  categoryName,
  completeOutfitRecommendation,
  createFallbackOutfitRecommendation,
  missingRequiredCategories,
  resolveOutfitRecommendation,
  validateOutfitRecommendation,
  type OutfitRecommendation,
} from '../services/outfitValidation.ts';
import { selectExploreReferences } from '../services/exploreReferences.ts';
import { validateSavedOutfitInput } from '../services/savedOutfitValidation.ts';

const router = Router();
const MAX_REQUEST_LENGTH = 1000;
const MAX_WARDROBE_ITEMS = 100;
const GENERATION_WINDOW_MS = 10 * 60 * 1000;
const MAX_GENERATIONS_PER_WINDOW = 6;
const generationWindows = new Map<number, { count: number; expiresAt: number }>();

type WardrobeGarment = WardrobeMetadata & {
  foto: string;
};

const consumeGenerationLimit = (userId: number) => {
  const now = Date.now();
  if (generationWindows.size > 1000) {
    for (const [existingUserId, window] of generationWindows) {
      if (window.expiresAt <= now) generationWindows.delete(existingUserId);
    }
  }
  const current = generationWindows.get(userId);
  if (!current || current.expiresAt <= now) {
    generationWindows.set(userId, { count: 1, expiresAt: now + GENERATION_WINDOW_MS });
    return true;
  }
  if (current.count >= MAX_GENERATIONS_PER_WINDOW) return false;
  current.count += 1;
  return true;
};

router.get('/saved', requireAuth, async (req, res) => {
  const userId = Number(req.session.userId);
  try {
    const outfits = await sql`
      SELECT
        outfit.id_outfit,
        outfit.name,
        outfit.style,
        outfit.evaluation,
        outfit.created_at,
        COALESCE(
          json_agg(json_build_object(
            'id_prendas', garment.id_prendas,
            'tipo', garment.tipo,
            'sub_tipo', garment.sub_tipo,
            'foto', garment.foto,
            'color', garment.color
          ) ORDER BY garment.id_prendas)
            FILTER (WHERE garment.id_prendas IS NOT NULL),
          '[]'::json
        ) AS garments
      FROM public.lookia_outfits outfit
      LEFT JOIN public.lookia_outfit_prendas outfit_garment ON outfit_garment.id_outfit = outfit.id_outfit
      LEFT JOIN public.prendas garment
        ON garment.id_prendas = outfit_garment.id_prendas
       AND garment.id_users = outfit.id_users
      WHERE outfit.id_users = ${userId}
      GROUP BY outfit.id_outfit
      ORDER BY outfit.created_at DESC, outfit.id_outfit DESC;
    `;
    return res.json(outfits);
  } catch (error) {
    console.error('Could not load saved outfits.', { errorName: error instanceof Error ? error.name : 'UnknownError' });
    return res.status(500).json({ error: 'No se pudieron cargar tus outfits guardados.' });
  }
});

router.post('/saved', requireAuth, async (req, res) => {
  const userId = Number(req.session.userId);
  const validation = validateSavedOutfitInput(req.body);
  if (validation.error) return res.status(400).json({ error: validation.error });
  const { name, style, evaluation, garmentIds } = validation.value;

  try {
    const [saved] = await sql`
      WITH requested AS MATERIALIZED (
        SELECT value::bigint AS id_prendas
        FROM jsonb_array_elements_text(${JSON.stringify(garmentIds)}::jsonb)
      ),
      owned AS MATERIALIZED (
        SELECT garment.id_prendas
        FROM public.prendas garment
        INNER JOIN requested ON requested.id_prendas = garment.id_prendas
        WHERE garment.id_users = ${userId}
      ),
      created AS (
        INSERT INTO public.lookia_outfits (id_users, name, style, evaluation)
        SELECT ${userId}, ${name}, ${style || null}, ${evaluation}
        WHERE (SELECT COUNT(*) FROM owned) = ${garmentIds.length}
        RETURNING id_outfit
      ),
      linked AS (
        INSERT INTO public.lookia_outfit_prendas (id_outfit, id_prendas)
        SELECT created.id_outfit, owned.id_prendas
        FROM created CROSS JOIN owned
        RETURNING id_outfit
      )
      SELECT id_outfit FROM linked LIMIT 1;
    `;

    if (!saved) return res.status(400).json({ error: 'Una o más prendas ya no están disponibles en tu ropero.' });
    return res.status(201).json({ id_outfit: Number(saved.id_outfit) });
  } catch (error) {
    console.error('Could not save outfit.', { errorName: error instanceof Error ? error.name : 'UnknownError' });
    return res.status(500).json({ error: 'No se pudo guardar el outfit.' });
  }
});

router.delete('/saved/:id', requireAuth, async (req, res) => {
  const userId = Number(req.session.userId);
  const outfitId = Number(req.params.id);
  if (!Number.isSafeInteger(outfitId) || outfitId <= 0) return res.status(400).json({ error: 'Outfit inválido.' });

  try {
    const [deleted] = await sql`
      DELETE FROM public.lookia_outfits
      WHERE id_outfit = ${outfitId} AND id_users = ${userId}
      RETURNING id_outfit;
    `;
    if (!deleted) return res.status(404).json({ error: 'Outfit no encontrado.' });
    return res.json({ message: 'Outfit eliminado.' });
  } catch (error) {
    console.error('Could not delete outfit.', { errorName: error instanceof Error ? error.name : 'UnknownError' });
    return res.status(500).json({ error: 'No se pudo eliminar el outfit.' });
  }
});

router.post('/generate', requireAuth, async (req, res) => {
  const request = req.body?.request;
  if (typeof request !== 'string' || !request.trim()) {
    return res.status(400).json({ error: 'Contanos qué outfit estás buscando.' });
  }
  if (request.length > MAX_REQUEST_LENGTH) {
    return res.status(400).json({ error: `El pedido no puede superar los ${MAX_REQUEST_LENGTH} caracteres.` });
  }

  const rawPreviousIds: unknown = req.body?.previousGarmentIds ?? [];
  if (!Array.isArray(rawPreviousIds) || rawPreviousIds.length > 4
    || rawPreviousIds.some(id => typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0)
    || new Set(rawPreviousIds).size !== rawPreviousIds.length) {
    return res.status(400).json({ error: 'La selección anterior no es válida.' });
  }

  const userId = Number(req.session.userId);
  try {
    const wardrobeRows = await sql`
      SELECT id_prendas, tipo, sub_tipo, foto, color
      FROM public.prendas
      WHERE id_users = ${userId}
      ORDER BY id_prendas DESC
      LIMIT ${MAX_WARDROBE_ITEMS};
    `;
    const wardrobe: WardrobeGarment[] = wardrobeRows.map(garment => ({
      id_prendas: Number(garment.id_prendas),
      tipo: String(garment.tipo ?? ''),
      sub_tipo: garment.sub_tipo == null ? null : String(garment.sub_tipo),
      color: String(garment.color ?? ''),
      foto: String(garment.foto ?? ''),
    })).filter(garment => Number.isSafeInteger(garment.id_prendas) && garment.id_prendas > 0);
    const wardrobeById = new Map(wardrobe.map(garment => [garment.id_prendas, garment]));
    const previousPrimaryGarmentIds = (rawPreviousIds as number[])
      .map(id => wardrobeById.get(id))
      .filter((garment): garment is WardrobeGarment => Boolean(garment))
      .filter(garment => ['superior', 'inferior', 'calzado'].includes(categoryName(garment.tipo)))
      .map(garment => garment.id_prendas);

    if (!wardrobe.length) {
      return res.json({
        garments: [],
        complementaryItems: [],
        referenceImages: [],
        evaluation: null,
        wardrobeMessage: 'Todavía no tenés prendas en tu ropero. Agregá algunas para crear una combinación personalizada.',
      });
    }

    if (!consumeGenerationLimit(userId)) {
      return res.status(429).json({ error: 'Alcanzaste el límite temporal de generaciones. Esperá unos minutos para volver a intentar.' });
    }
    const references = selectExploreReferences(
      request.trim(),
      typeof req.body?.exploreCategory === 'string' ? req.body.exploreCategory : undefined,
    );
    let referencesSent = references;
    let recommendation: OutfitRecommendation;
    try {
      const modelResponse = await requestOutfitFromNim(
        request.trim(),
        wardrobe.map(({ id_prendas, tipo, sub_tipo, color }) => ({ id_prendas, tipo, sub_tipo, color })),
        references,
        previousPrimaryGarmentIds,
      );
      referencesSent = modelResponse.referencesIncluded ? references : [];
      recommendation = resolveOutfitRecommendation(
        request.trim(),
        wardrobe,
        modelResponse.content,
        references,
        referencesSent,
        previousPrimaryGarmentIds,
      );
      if (recommendation.usedReferenceIds.length > 0) referencesSent = references;
    } catch (error) {
      if (!(error instanceof OutfitGenerationError)) throw error;
      console.warn('NVIDIA outfit response could not be used; selecting a wardrobe-based fallback.', {
        status: error.status,
      });
      recommendation = createFallbackOutfitRecommendation(
        request.trim(),
        wardrobe,
        references,
        previousPrimaryGarmentIds,
      );
      if (recommendation.selectedGarmentIds.length) {
        recommendation = validateOutfitRecommendation(
          request.trim(),
          wardrobe,
          completeOutfitRecommendation(
            request.trim(),
            wardrobe,
            recommendation,
            references,
            previousPrimaryGarmentIds,
          ),
          references,
        );
      }
      referencesSent = references;
    }
    const toClientGarment = (id: number) => {
      const garment = wardrobeById.get(id)!;
      return {
        id: garment.id_prendas,
        name: garment.sub_tipo || garment.tipo,
        category: garment.tipo,
        color: garment.color || undefined,
        imageUrl: garment.foto,
      };
    };
    const garments = recommendation.selectedGarmentIds.map(toClientGarment);
    const complementaryItems = recommendation.complementaryGarmentIds.map(toClientGarment);
    const missingCategories = missingRequiredCategories(wardrobe, recommendation, request.trim());
    const referencesById = new Map(referencesSent.map(reference => [reference.id, reference]));
    const referenceImages = recommendation.usedReferenceIds.map(id => referencesById.get(id)!);

    return res.json({
      garments,
      complementaryItems,
      referenceImages,
      referenceMessage: referenceImages.length
        ? undefined
        : 'No se utilizaron imágenes de referencia de Explorar para esta combinación.',
      evaluation: recommendation.evaluation,
      ...(missingCategories.length ? {
        wardrobeMessage: `No se puede completar el outfit: faltan estas categorías obligatorias disponibles y compatibles con tus restricciones: ${missingCategories.join(', ')}.`,
      } : {}),
      ...(garments.length === 0 ? {
        wardrobeMessage: missingCategories.length
          ? `No se puede completar el outfit: faltan estas categorías obligatorias disponibles y compatibles con tus restricciones: ${missingCategories.join(', ')}.`
          : 'No encontramos una combinación que cumpla tu pedido con las prendas disponibles.',
      } : {}),
    });
  } catch (error) {
    if (error instanceof OutfitGenerationError) {
      console.warn('Outfit generation was not completed.', { status: error.status });
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Outfit generation failed due to an internal server error.', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    return res.status(500).json({ error: 'No pudimos generar el outfit. Intentá nuevamente.' });
  }
});

export default router;
