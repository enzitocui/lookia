import { OutfitGenerationError, type WardrobeMetadata } from './nvidiaNim.ts';
import type { ExploreReference } from './exploreReferences.ts';

export type OutfitRecommendation = {
  selectedGarmentIds: number[];
  complementaryGarmentIds: number[];
  usedReferenceIds: number[];
  evaluation: string;
};

const normalizeText = (value: string) => value
  .toLocaleLowerCase('es')
  .normalize('NFD')
  .replace(/\p{Diacritic}/gu, '');

const cleanText = (value: unknown, key: string, maxLength = 500) => {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) {
    throw new OutfitGenerationError(`NVIDIA devolvió un campo inválido: ${key}.`);
  }
  return value.replace(/[\u0000-\u001f\u007f]/g, '').trim();
};

const readIds = (value: unknown, key: string, maximum: number) => {
  if (!Array.isArray(value) || value.length > maximum) {
    throw new OutfitGenerationError(`NVIDIA devolvió una lista inválida: ${key}.`);
  }
  const ids = value.map(id => {
    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0) {
      throw new OutfitGenerationError(`NVIDIA devolvió un identificador inválido en ${key}.`);
    }
    return id;
  });
  if (new Set(ids).size !== ids.length) {
    throw new OutfitGenerationError(`NVIDIA devolvió identificadores repetidos en ${key}.`);
  }
  return ids;
};

export const parseOutfitRecommendation = (content: string): OutfitRecommendation => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content.trim());
  } catch {
    throw new OutfitGenerationError('NVIDIA devolvió una respuesta que no pudimos procesar.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new OutfitGenerationError('NVIDIA devolvió una respuesta incompleta.');
  }

  const response = parsed as Record<string, unknown>;
  const expectedKeys = [
    'selectedGarmentIds',
    'complementaryGarmentIds',
    'usedReferenceIds',
    'evaluation',
  ];
  if (Object.keys(response).length !== expectedKeys.length || expectedKeys.some(key => !(key in response))) {
    throw new OutfitGenerationError('NVIDIA devolvió una respuesta incompleta.');
  }

  return {
    selectedGarmentIds: readIds(response.selectedGarmentIds, 'selectedGarmentIds', 4),
    complementaryGarmentIds: readIds(response.complementaryGarmentIds, 'complementaryGarmentIds', 4),
    usedReferenceIds: readIds(response.usedReferenceIds, 'usedReferenceIds', 2),
    evaluation: cleanText(response.evaluation, 'evaluation', 2000),
  };
};

const extractTerms = (request: string, expression: RegExp) => {
  const terms: string[] = [];
  for (const match of request.matchAll(expression)) {
    const term = (match[1] ?? '')
      .split(/\b(?:y|ni|pero|aunque|para|con|porque|que)\b/i)[0]
      .replace(/^(?:usar|use|uses|quiero|quisiera|un|una|unos|unas|el|la|los|las)\s+/i, '')
      .trim();
    if (term) terms.push(term);
  }
  return terms;
};

const termMatchesGarment = (term: string, garment: WardrobeMetadata) => {
  const garmentText = normalizeText([garment.tipo, garment.sub_tipo ?? '', garment.color].join(' '));
  const terms = normalizeText(term).split(/\s+/).filter(word => !['ropa', 'prenda', 'color', 'colores'].includes(word));
  return terms.length > 0 && terms.every(word => (
    garmentText.includes(word) || (word.length >= 4 && garmentText.includes(word.slice(0, -1)))
  ));
};

const categoryName = (category: string) => {
  const normalized = normalizeText(category);
  if (['superior', 'superiores'].includes(normalized)) return 'superior';
  if (['inferior', 'inferiores'].includes(normalized)) return 'inferior';
  if (normalized === 'calzado') return 'calzado';
  if (['accesorio', 'accesorios'].includes(normalized)) return 'accesorio';
  return normalized;
};

export const validateOutfitRecommendation = (
  request: string,
  wardrobe: WardrobeMetadata[],
  recommendation: OutfitRecommendation,
  references: ExploreReference[] = [],
) => {
  const wardrobeById = new Map(wardrobe.map(garment => [garment.id_prendas, garment]));
  const allIds = [...recommendation.selectedGarmentIds, ...recommendation.complementaryGarmentIds];
  if (new Set(allIds).size !== allIds.length) {
    throw new OutfitGenerationError('La respuesta de NVIDIA repitió prendas entre la selección y los complementos.');
  }
  if (allIds.some(id => !wardrobeById.has(id))) {
    throw new OutfitGenerationError('La respuesta de NVIDIA incluyó prendas que no pertenecen a tu ropero.');
  }
  const referenceIds = new Set(references.map(reference => reference.id));
  if (recommendation.usedReferenceIds.some(id => !referenceIds.has(id))) {
    throw new OutfitGenerationError('La respuesta de NVIDIA incluyó una referencia que no se utilizó en esta solicitud.');
  }

  const technicalEvaluation = /\b(?:id_prendas|id_users|id_outfit|selectedGarmentIds|complementaryGarmentIds|usedReferenceIds|sub_tipo|foto|json|sql|database|base de datos)\b|\b(?:tabla|campo)\s+(?:de\s+)?(?:prendas|outfits|base de datos)\b|\b(?:id|identificador)\s*[:#=]\s*\d+/i;
  if (technicalEvaluation.test(recommendation.evaluation)) {
    throw new OutfitGenerationError('La evaluación de NVIDIA contiene información técnica y no se puede mostrar.');
  }

  const excludedTerms = extractTerms(
    request,
    /\b(?:sin(?:\s+usar)?|no\s+(?:usar|uses|quiero)|evita(?:r)?|excluye|excluir)\s+([^,.;!?]+)/giu,
  );
  const excludedGarments = wardrobe.filter(garment => excludedTerms.some(term => termMatchesGarment(term, garment)));
  if (allIds.some(id => excludedGarments.some(garment => garment.id_prendas === id))) {
    throw new OutfitGenerationError('La selección no respetó una restricción explícita de tu pedido.');
  }

  const requiredTerms = extractTerms(
    request,
    /\b(?:quiero\s+(?:usar|incluir)|incluye|incluí|agrega|agregá|usa|usá)\s+([^,.;!?]+)/giu,
  );
  for (const term of requiredTerms) {
    const matchingGarments = wardrobe.filter(garment => termMatchesGarment(term, garment));
    if (matchingGarments.length > 0 && !matchingGarments.some(garment => recommendation.selectedGarmentIds.includes(garment.id_prendas))) {
      throw new OutfitGenerationError('La selección no incluyó una prenda solicitada explícitamente.');
    }
  }

  const selected = recommendation.selectedGarmentIds.map(id => wardrobeById.get(id)!);
  if (selected.some(garment => !normalizeText(recommendation.evaluation).includes(normalizeText(garment.sub_tipo || garment.tipo)))) {
    throw new OutfitGenerationError('La evaluación de NVIDIA no identifica con claridad las prendas seleccionadas.');
  }
  const selectedCategories = new Set(selected.map(garment => categoryName(garment.tipo)));
  const excludedCategories = new Set(
    ['superior', 'inferior'].filter(category => excludedTerms.some(term => (
      categoryName(term) === category || normalizeText(term).includes(category)
    ))),
  );
  const availableCategories = new Set(wardrobe.map(garment => categoryName(garment.tipo)));
  const onePiece = selected.some(garment => /\b(vestido|mono|enterito)\b/i.test(normalizeText(garment.sub_tipo ?? '')));
  if (!onePiece
    && !excludedCategories.has('superior')
    && !excludedCategories.has('inferior')
    && availableCategories.has('superior')
    && availableCategories.has('inferior')
    && recommendation.selectedGarmentIds.length > 0
    && (!selectedCategories.has('superior') || !selectedCategories.has('inferior'))) {
    throw new OutfitGenerationError('La combinación no contiene prendas superiores e inferiores disponibles.');
  }
  if (wardrobe.length > 0 && recommendation.selectedGarmentIds.length === 0
    && !/\b(no|sin|ninguna|ningún|ninguno|imposible|faltan|falta|incompatible|insuficiente)\b/i.test(recommendation.evaluation)) {
    throw new OutfitGenerationError('La respuesta no seleccionó prendas ni explicó qué restricciones impidieron hacerlo.');
  }

  return recommendation;
};
