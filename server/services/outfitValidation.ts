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

export const categoryName = (category: string) => {
  const normalized = normalizeText(category);
  if (['superior', 'superiores'].includes(normalized)) return 'superior';
  if (['inferior', 'inferiores'].includes(normalized)) return 'inferior';
  if (normalized === 'calzado') return 'calzado';
  if (['accesorio', 'accesorios'].includes(normalized)) return 'accesorio';
  return normalized;
};

const addSelectedGarmentDetails = (evaluation: string, selected: WardrobeMetadata[]) => {
  const garmentNames = selected.map(garment => garment.sub_tipo || garment.tipo).join(', ');
  return `${evaluation} Prendas seleccionadas de tu ropero: ${garmentNames}.`;
};

const styleAliases: Record<string, string[]> = {
  Y2K: ['y2k', 'dosmilero', 'dosmilera', 'años 2000'],
  Boho: ['boho', 'bohemio', 'bohemia'],
  Casual: ['casual', 'informal', 'cotidiano', 'cotidiana'],
  Gotico: ['gotico', 'gotica', 'gótico', 'gótica', 'dark'],
  Grunge: ['grunge'],
  Vintage: ['vintage', 'retro'],
  Punk: ['punk'],
  Formal: ['formal', 'elegante', 'oficina'],
  Deportivo: ['deportivo', 'deportiva', 'sport'],
  Coquette: ['coquette'],
  'Old Money': ['old money'],
  Cottagecore: ['cottagecore'],
  Fairycore: ['fairycore'],
  'E-Girl': ['e-girl', 'egirl'],
};

const styleCues: Record<string, string[]> = {
  Y2K: ['denim', 'jean', 'cargo', 'mini', 'crop', 'tiro bajo', 'metalizado', 'brillante', 'rosa', 'plateado', 'estampado', 'plataforma'],
  Boho: ['beige', 'marron', 'crudo', 'terracota', 'tierra', 'floral', 'flores', 'lino', 'suelt', 'blusa', 'falda', 'vestido', 'fleco', 'sandalia', 'bordado'],
  Casual: ['jean', 'remera', 'zapatilla', 'buzo', 'algodon', 'campera', 'pantalon'],
  Gotico: ['negro', 'oscuro', 'gris', 'bordo', 'violeta', 'cuero', 'bota', 'plataforma', 'campera', 'camisa', 'falda'],
  Grunge: ['negro', 'gris', 'bordo', 'cuadros', 'flannel', 'jean', 'bota', 'remera', 'campera'],
  Vintage: ['retro', 'marron', 'beige', 'crema', 'bordado', 'estampado', 'falda', 'vestido', 'jean'],
  Punk: ['negro', 'cuero', 'rojo', 'cuadros', 'bota', 'plataforma', 'campera', 'jean'],
  Formal: ['negro', 'azul', 'gris', 'blanco', 'saco', 'camisa', 'pantalon', 'zapato', 'vestido'],
  Deportivo: ['deportivo', 'zapatilla', 'algodon', 'buzo', 'jogger', 'legging', 'short'],
  Coquette: ['rosa', 'blanco', 'crema', 'moño', 'encaje', 'falda', 'vestido', 'blusa'],
  'Old Money': ['azul', 'beige', 'blanco', 'crema', 'marron', 'saco', 'camisa', 'pantalon', 'zapato'],
  Cottagecore: ['floral', 'flores', 'verde', 'crema', 'beige', 'lino', 'falda', 'vestido', 'blusa'],
  Fairycore: ['rosa', 'violeta', 'lila', 'verde', 'brillante', 'falda', 'vestido', 'blusa'],
  'E-Girl': ['negro', 'rosa', 'violeta', 'cuadros', 'plataforma', 'remera', 'falda', 'jean'],
};

const requestStyle = (request: string, references: ExploreReference[]) => {
  const referenceCategory = references[0]?.category;
  if (referenceCategory) {
    const matchingStyle = Object.keys(styleAliases).find(style => normalizeText(style) === normalizeText(referenceCategory));
    if (matchingStyle) return matchingStyle;
  }
  const requestText = normalizeText(request);
  return Object.entries(styleAliases)
    .flatMap(([style, aliases]) => aliases.map(alias => ({ style, alias: normalizeText(alias) })))
    .filter(({ alias }) => requestText.includes(alias))
    .sort((first, second) => second.alias.length - first.alias.length)[0]?.style;
};

const buildFallbackEvaluation = (
  request: string,
  style: string | undefined,
  selected: WardrobeMetadata[],
) => {
  const garmentNames = selected.map(garment => garment.sub_tipo || garment.tipo).join(', ');
  const styleText = style ? ` para el estilo ${style}` : '';
  return selected.length
    ? `Esta es la aproximación disponible${styleText} con prendas reales de tu ropero: ${garmentNames}. Se priorizaron las restricciones y los atributos disponibles; la coincidencia estilística puede ser parcial.`
    : `No hay prendas utilizables que respeten las restricciones explícitas de “${request.slice(0, 120)}”.`;
};

export const createFallbackOutfitRecommendation = (
  request: string,
  wardrobe: WardrobeMetadata[],
  references: ExploreReference[] = [],
  previousPrimaryGarmentIds: number[] = [],
): OutfitRecommendation => {
  const excludedTerms = extractTerms(
    request,
    /\b(?:sin(?:\s+usar)?|no\s+(?:usar|uses|quiero)|evita(?:r)?|excluye|excluir)\s+([^,.;!?]+)/giu,
  );
  const candidates = wardrobe.filter(garment => !excludedTerms.some(term => termMatchesGarment(term, garment)));
  const requiredTerms = extractTerms(
    request,
    /\b(?:quiero\s+(?:usar|incluir)|incluye|incluí|agrega|agregá|usa|usá)\s+([^,.;!?]+)/giu,
  );
  const requiredGroups = requiredTerms
    .map(term => candidates.filter(garment => termMatchesGarment(term, garment)))
    .filter(group => group.length > 0);
  const style = requestStyle(request, references);
  const cues = (style && styleCues[style] ? styleCues[style] : []).map(normalizeText);
  const scoreGarment = (garment: WardrobeMetadata) => {
    const text = normalizeText([garment.tipo, garment.sub_tipo ?? '', garment.color].join(' '));
    const cueScore = cues.reduce((score, cue) => score + (text.includes(cue) ? 5 : 0), 0);
    const onePieceScore = /\b(?:vestido|mono|enterito)\b/.test(text) ? 4 : 0;
    return cueScore + onePieceScore;
  };
  const explicitlyRequestedIds = new Set(requiredGroups.flatMap(group => group.map(garment => garment.id_prendas)));
  const previousIds = new Set(previousPrimaryGarmentIds);
  const chooseBest = (items: WardrobeMetadata[]) => {
    const alternatives = items.filter(garment => !previousIds.has(garment.id_prendas)
      || explicitlyRequestedIds.has(garment.id_prendas));
    const choices = alternatives.length ? alternatives : items;
    return [...choices].sort((first, second) => scoreGarment(second) - scoreGarment(first))[0];
  };
  const selected: WardrobeMetadata[] = [];
  for (const category of ['superior', 'inferior', 'calzado']) {
    const requiredForCategory = requiredGroups.flat().filter(garment => categoryName(garment.tipo) === category);
    const categoryItems = candidates.filter(garment => categoryName(garment.tipo) === category);
    const next = chooseBest(requiredForCategory.length ? requiredForCategory : categoryItems);
    if (next && !selected.some(garment => garment.id_prendas === next.id_prendas)) selected.push(next);
  }
  for (const group of requiredGroups) {
    const requested = chooseBest(group);
    if (requested && !selected.some(garment => garment.id_prendas === requested.id_prendas) && selected.length < 4) {
      selected.push(requested);
    }
  }

  const missing = missingRequiredCategories(
    wardrobe,
    { selectedGarmentIds: selected.map(garment => garment.id_prendas), complementaryGarmentIds: [], usedReferenceIds: [], evaluation: '' },
    request,
  );
  return {
    selectedGarmentIds: selected.map(garment => garment.id_prendas),
    complementaryGarmentIds: [],
    usedReferenceIds: selected.length > 0 && references.length > 0 ? [references[0].id] : [],
    evaluation: missing.length
      ? `${buildFallbackEvaluation(request, style, selected)} La combinación queda incompleta porque faltan: ${missing.join(', ')}.`
      : buildFallbackEvaluation(request, style, selected),
  };
};

const requiredCategories = ['superior', 'inferior', 'calzado'];

export const missingRequiredCategories = (
  wardrobe: WardrobeMetadata[],
  recommendation: OutfitRecommendation,
  request: string,
) => {
  const selected = recommendation.selectedGarmentIds
    .map(id => wardrobe.find(garment => garment.id_prendas === id))
    .filter((garment): garment is WardrobeMetadata => Boolean(garment));
  const selectedCategories = new Set(selected.map(garment => categoryName(garment.tipo)));
  return requiredCategories.filter(category => !selectedCategories.has(category)).map(category => category === 'superior' ? 'superiores'
    : category === 'inferior' ? 'inferiores' : 'calzado');
};

export const completeOutfitRecommendation = (
  request: string,
  wardrobe: WardrobeMetadata[],
  recommendation: OutfitRecommendation,
  references: ExploreReference[] = [],
  previousPrimaryGarmentIds: number[] = [],
) => {
  const excludedTerms = extractTerms(
    request,
    /\b(?:sin(?:\s+usar)?|no\s+(?:usar|uses|quiero)|evita(?:r)?|excluye|excluir)\s+([^,.;!?]+)/giu,
  );
  const candidates = wardrobe.filter(garment => !excludedTerms.some(term => termMatchesGarment(term, garment)));
  const requiredTerms = extractTerms(
    request,
    /\b(?:quiero\s+(?:usar|incluir)|incluye|incluí|agrega|agregá|usa|usá)\s+([^,.;!?]+)/giu,
  );
  const explicitlyRequestedIds = new Set(requiredTerms.flatMap(term => (
    candidates.filter(garment => termMatchesGarment(term, garment)).map(garment => garment.id_prendas)
  )));
  const previousIds = new Set(previousPrimaryGarmentIds);
  const style = requestStyle(request, references);
  const cues = (style && styleCues[style] ? styleCues[style] : []).map(normalizeText);
  const scoreGarment = (garment: WardrobeMetadata) => {
    const text = normalizeText([garment.tipo, garment.sub_tipo ?? '', garment.color].join(' '));
    return cues.reduce((score, cue) => score + (text.includes(cue) ? 5 : 0), 0);
  };
  const chooseBest = (items: WardrobeMetadata[]) => {
    const alternatives = items.filter(garment => !previousIds.has(garment.id_prendas)
      || explicitlyRequestedIds.has(garment.id_prendas));
    return [...(alternatives.length ? alternatives : items)]
      .sort((first, second) => scoreGarment(second) - scoreGarment(first))[0];
  };
  const wardrobeById = new Map(wardrobe.map(garment => [garment.id_prendas, garment]));
  const modelSelection = recommendation.selectedGarmentIds
    .map(id => wardrobeById.get(id))
    .filter((garment): garment is WardrobeMetadata => Boolean(garment))
    .filter(garment => !excludedTerms.some(term => termMatchesGarment(term, garment)));
  const selected: WardrobeMetadata[] = [];
  let changed = false;

  for (const category of requiredCategories) {
    const categoryModelSelection = modelSelection.find(garment => categoryName(garment.tipo) === category);
    const canKeepModelSelection = categoryModelSelection
      && (!previousIds.has(categoryModelSelection.id_prendas)
        || explicitlyRequestedIds.has(categoryModelSelection.id_prendas));
    const categoryItems = candidates.filter(garment => (
      categoryName(garment.tipo) === category
      && !selected.some(item => item.id_prendas === garment.id_prendas)
    ));
    const chosen = canKeepModelSelection
      ? categoryModelSelection
      : chooseBest(categoryItems);
    if (chosen && !selected.some(garment => garment.id_prendas === chosen.id_prendas)) {
      selected.push(chosen);
      if (chosen.id_prendas !== categoryModelSelection?.id_prendas) changed = true;
    }
  }

  for (const requiredId of explicitlyRequestedIds) {
    const requiredGarment = wardrobeById.get(requiredId);
    if (requiredGarment && !selected.some(garment => garment.id_prendas === requiredId) && selected.length < 4) {
      selected.push(requiredGarment);
      changed = true;
    }
  }
  for (const garment of modelSelection) {
    const previousMainItem = requiredCategories.includes(categoryName(garment.tipo))
      && previousIds.has(garment.id_prendas)
      && !explicitlyRequestedIds.has(garment.id_prendas);
    if (!previousMainItem
      && !selected.some(item => item.id_prendas === garment.id_prendas)
      && selected.length < 4) {
      selected.push(garment);
      changed = true;
    }
  }
  if (selected.length !== recommendation.selectedGarmentIds.length) changed = true;

  const result = {
    ...recommendation,
    selectedGarmentIds: selected.slice(0, 4).map(garment => garment.id_prendas),
    complementaryGarmentIds: recommendation.complementaryGarmentIds.filter(id => (
      wardrobeById.has(id)
      && !selected.some(garment => garment.id_prendas === id)
      && (!previousIds.has(id) || explicitlyRequestedIds.has(id))
      && !excludedTerms.some(term => termMatchesGarment(term, wardrobeById.get(id)!))
    )),
  };
  if (changed) result.evaluation = buildFallbackEvaluation(request, style, selected);
  return result;
};

export const validateOutfitRecommendation = (
  request: string,
  wardrobe: WardrobeMetadata[],
  recommendation: OutfitRecommendation,
  references: ExploreReference[] = [],
  requireComplete = true,
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
  const evaluationText = normalizeText(recommendation.evaluation);
  const garmentMentions = selected.map(garment => normalizeText(garment.sub_tipo || garment.tipo));
  const hasGarmentMention = garmentMentions.some(garmentText => evaluationText.includes(garmentText));
  const hasStyleMention = /\b(?:y2k|boho|grunge|vintage|punk|coquette|casual|formal|deportivo|gótico|gotico|old money|cottagecore|fairycore|e girl|egirl|retro|elegante|romantico|romántico|minimalista)\b/.test(evaluationText);
  const hasConstraintMention = /\b(?:sin|sin usar|no usar|evita|excluye|sin rojo|sin azul|sin negro|sin blanco|sin verde|sin amarillo|sin beige|sin rayas|sin estampados|sin brillo)\b/.test(evaluationText);
  if (selected.length === 0 && !/\b(?:no|sin|ninguna|ningún|ninguno|imposible|faltan|falta|incompatible|insuficiente)\b/i.test(recommendation.evaluation)) {
    throw new OutfitGenerationError('La respuesta no seleccionó prendas ni explicó qué restricciones impidieron hacerlo.');
  }
  if (selected.length > 0 && !hasGarmentMention && !hasStyleMention && !hasConstraintMention) {
    throw new OutfitGenerationError('La evaluación de NVIDIA no identifica con claridad las prendas seleccionadas.');
  }
  if (selected.length > 0 && !hasGarmentMention) {
    recommendation.evaluation = addSelectedGarmentDetails(recommendation.evaluation, selected);
  }
  const eligibleGarments = wardrobe.filter(garment => !excludedTerms.some(term => termMatchesGarment(term, garment)));
  const eligibleCategories = new Set(eligibleGarments.map(garment => categoryName(garment.tipo)));
  const selectedCategories = new Set(selected.map(garment => categoryName(garment.tipo)));
  const missingAvailableCategories = requiredCategories.filter(category => (
    eligibleCategories.has(category) && !selectedCategories.has(category)
  ));
  if (requireComplete && missingAvailableCategories.length > 0) {
    throw new OutfitGenerationError('La selección no contiene todas las categorías obligatorias disponibles.');
  }
  return recommendation;
};

export const resolveOutfitRecommendation = (
  request: string,
  wardrobe: WardrobeMetadata[],
  content: string,
  references: ExploreReference[] = [],
  referencesSent: ExploreReference[] = references,
  previousPrimaryGarmentIds: number[] = [],
) => {
  try {
    const parsedRecommendation = validateOutfitRecommendation(
      request,
      wardrobe,
      parseOutfitRecommendation(content),
      referencesSent,
      false,
    );
    const completedRecommendation = completeOutfitRecommendation(
      request,
      wardrobe,
      parsedRecommendation,
      references,
      previousPrimaryGarmentIds,
    );
    return validateOutfitRecommendation(request, wardrobe, completedRecommendation, references);
  } catch (error) {
    if (!(error instanceof OutfitGenerationError)) throw error;
  }
  const fallback = createFallbackOutfitRecommendation(request, wardrobe, references, previousPrimaryGarmentIds);
  return fallback.selectedGarmentIds.length
    ? validateOutfitRecommendation(
      request,
      wardrobe,
      completeOutfitRecommendation(request, wardrobe, fallback, references, previousPrimaryGarmentIds),
      references,
    )
    : fallback;
};
