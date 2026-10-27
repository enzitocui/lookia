import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createFallbackOutfitRecommendation,
  missingRequiredCategories,
  parseOutfitRecommendation,
  resolveOutfitRecommendation,
  validateOutfitRecommendation,
} from './outfitValidation.ts';
import { OutfitGenerationError } from './nvidiaNim.ts';

const wardrobe = [
  { id_prendas: 1, tipo: 'Superior', sub_tipo: 'Remera', color: 'Negro' },
  { id_prendas: 2, tipo: 'Inferior', sub_tipo: 'Jean', color: 'Azul' },
  { id_prendas: 3, tipo: 'Superior', sub_tipo: 'Campera', color: 'Negro' },
  { id_prendas: 4, tipo: 'Calzado', sub_tipo: 'Zapatillas', color: 'Blanco' },
  { id_prendas: 5, tipo: 'Accesorio', sub_tipo: 'Cinturón', color: 'Negro' },
  { id_prendas: 6, tipo: 'Accesorio', sub_tipo: 'Bufanda', color: 'Rojo' },
];

const recommendation = (overrides: Record<string, unknown> = {}) => parseOutfitRecommendation(JSON.stringify({
  selectedGarmentIds: [1, 2, 4],
  complementaryGarmentIds: [],
  usedReferenceIds: [],
  evaluation: 'La remera y el jean forman una base casual; las zapatillas blancas completan el conjunto.',
  ...overrides,
}));

test('parses a complete structured model response', () => {
  assert.deepEqual(recommendation().selectedGarmentIds, [1, 2, 4]);
});

test('rejects invalid JSON, incomplete schema, and non-numeric ids', () => {
  assert.throws(() => parseOutfitRecommendation('no es json'), OutfitGenerationError);
  assert.throws(() => parseOutfitRecommendation('{}'), OutfitGenerationError);
  assert.throws(() => recommendation({ selectedGarmentIds: ['1'] }), OutfitGenerationError);
  assert.throws(() => recommendation({ unrequestedField: true }), OutfitGenerationError);
  assert.throws(() => recommendation({ evaluation: '' }), OutfitGenerationError);
  assert.throws(() => recommendation({ evaluation: 'x'.repeat(2001) }), OutfitGenerationError);
});

test('rejects evaluations containing internal garment IDs or database field names', () => {
  assert.throws(
    () => validateOutfitRecommendation('Look casual', wardrobe, recommendation({
      evaluation: 'La remera combina con el jean; id_prendas: 6 permite agregar una bufanda roja.',
    })),
    /información técnica/,
  );
});

test('adds factual garment names to style-led evaluations without asserting unverified style fit', () => {
  const result = validateOutfitRecommendation('outfit Y2K, cómodo y sin rojo', wardrobe, recommendation({
    evaluation: 'La combinación tiene un estilo Y2K cómodo y visualmente coherente.',
  }));
  assert.deepEqual(result.selectedGarmentIds, [1, 2, 4]);
  assert.ok(result.evaluation.includes('Prendas seleccionadas de tu ropero: Remera, Jean, Zapatillas.'));
  assert.ok(!result.evaluation.includes('responde al y2k pedido'));
});

test('accepts only reference IDs provided to the model and returns used references', () => {
  const references = [{
    id: 501,
    category: 'Casual',
    gender: 'women',
    url: 'https://example.test/reference.jpg',
    description: 'Casual Outfit',
  }];
  const result = validateOutfitRecommendation('Look casual', wardrobe, recommendation({
    usedReferenceIds: [501],
  }), references);
  assert.deepEqual(result.usedReferenceIds, [501]);
  assert.deepEqual(
    validateOutfitRecommendation('Look casual', wardrobe, recommendation(), references).usedReferenceIds,
    [],
  );
  assert.throws(
    () => validateOutfitRecommendation('Look casual', wardrobe, recommendation({
      usedReferenceIds: [999],
    }), references),
    /referencia que no se utilizó/,
  );
});

test('allows up to four selected garments and does not require an accessory', () => {
  const fourGarments = recommendation({
    selectedGarmentIds: [1, 2, 3, 4],
    complementaryGarmentIds: [],
    evaluation: 'La remera negra y el jean azul forman la base casual; la campera negra y las zapatillas blancas completan el conjunto.',
  });
  assert.equal(validateOutfitRecommendation('Look casual', wardrobe, fourGarments).selectedGarmentIds.length, 4);

  const threeGarments = recommendation({ selectedGarmentIds: [1, 2, 4], complementaryGarmentIds: [] });
  assert.equal(validateOutfitRecommendation('Look casual', wardrobe, threeGarments).selectedGarmentIds.length, 3);
});

test('rejects more than four selected garments and duplicate IDs', () => {
  assert.throws(() => recommendation({ selectedGarmentIds: [1, 2, 4, 5, 6] }), OutfitGenerationError);
  assert.throws(
    () => validateOutfitRecommendation('Look casual', wardrobe, recommendation({ selectedGarmentIds: [1, 2, 4], complementaryGarmentIds: [2] })),
    /repitió prendas/,
  );
});

test('rejects IDs that are not present in the authenticated wardrobe', () => {
  assert.throws(
    () => validateOutfitRecommendation('look casual', wardrobe, recommendation({ selectedGarmentIds: [1, 999] })),
    /no pertenecen a tu ropero/,
  );
});

test('rejects a selection that violates an explicit clothing exclusion', () => {
  assert.throws(
    () => validateOutfitRecommendation('Quiero algo casual sin usar campera', wardrobe, recommendation({ selectedGarmentIds: [1, 2, 3, 4] })),
    /restricción explícita/,
  );
});

test('does not suggest an explicitly excluded item as an optional complement', () => {
  assert.throws(
    () => validateOutfitRecommendation('Quiero algo casual sin campera', wardrobe, recommendation({
      selectedGarmentIds: [1, 2, 4],
      complementaryGarmentIds: [3],
    })),
    /restricción explícita/,
  );
});

test('requires a complete outfit when superior, inferior, and footwear are available', () => {
  assert.throws(
    () => validateOutfitRecommendation('Un conjunto casual', wardrobe, recommendation({
      selectedGarmentIds: [1, 2],
      complementaryGarmentIds: [],
    })),
    /categorías obligatorias/,
  );
  assert.deepEqual(
    validateOutfitRecommendation('Un conjunto casual', wardrobe, recommendation()).selectedGarmentIds,
    [1, 2, 4],
  );
  assert.deepEqual(
    validateOutfitRecommendation('Un conjunto casual sin campera', wardrobe, recommendation()).selectedGarmentIds,
    [1, 2, 4],
  );
});

test('recovers a partial model selection with the best available Y2K outfit', () => {
  const y2kWardrobe = [
    { id_prendas: 21, tipo: 'Superior', sub_tipo: 'Remera estampada', color: 'Rosa' },
    { id_prendas: 22, tipo: 'Inferior', sub_tipo: 'Jean tiro bajo', color: 'Azul' },
    { id_prendas: 23, tipo: 'Calzado', sub_tipo: 'Zapatillas plataforma', color: 'Blanco' },
    { id_prendas: 24, tipo: 'Accesorio', sub_tipo: 'Cinturon', color: 'Rojo' },
  ];
  const references = [{
    id: 501,
    category: 'Y2K',
    gender: 'women',
    url: 'https://example.test/y2k.jpg',
    description: 'Y2K Outfit',
  }];
  const partialModelResponse = JSON.stringify({
    selectedGarmentIds: [999],
    complementaryGarmentIds: [],
    usedReferenceIds: [],
    evaluation: 'No pude encontrar prendas.',
  });
  const result = resolveOutfitRecommendation('Outfit Y2K', y2kWardrobe, partialModelResponse, references);
  assert.deepEqual([...result.selectedGarmentIds].sort(), [21, 22, 23]);
  assert.equal(result.selectedGarmentIds.length, 3);
  assert.deepEqual(result.usedReferenceIds, [501]);
  assert.match(result.evaluation, /Y2K/);
  assert.ok(result.selectedGarmentIds.every(id => y2kWardrobe.some(garment => garment.id_prendas === id)));
  const categories = result.selectedGarmentIds.map(id => y2kWardrobe.find(garment => garment.id_prendas === id)?.tipo);
  assert.ok(categories.includes('Superior'));
  assert.ok(categories.includes('Inferior'));
  assert.ok(categories.includes('Calzado'));
});

test('completes an otherwise valid partial NVIDIA selection before final validation', () => {
  const y2kWardrobe = [
    { id_prendas: 21, tipo: 'Superior', sub_tipo: 'Remera estampada', color: 'Rosa' },
    { id_prendas: 22, tipo: 'Inferior', sub_tipo: 'Jean tiro bajo', color: 'Azul' },
    { id_prendas: 23, tipo: 'Calzado', sub_tipo: 'Zapatillas plataforma', color: 'Blanco' },
  ];
  const result = resolveOutfitRecommendation(
    'Outfit Y2K',
    y2kWardrobe,
    JSON.stringify({
      selectedGarmentIds: [21],
      complementaryGarmentIds: [],
      usedReferenceIds: [],
      evaluation: 'La remera estampada aporta una señal Y2K.',
    }),
  );
  assert.deepEqual(result.selectedGarmentIds, [21, 22, 23]);
  assert.deepEqual(missingRequiredCategories(y2kWardrobe, result, 'Outfit Y2K'), []);
});

test('re-evaluates Boho and Casual styles against the whole wardrobe', () => {
  const flexibleWardrobe = [
    { id_prendas: 31, tipo: 'Superior', sub_tipo: 'Blusa', color: 'Beige' },
    { id_prendas: 32, tipo: 'Inferior', sub_tipo: 'Falda', color: 'Marron' },
    { id_prendas: 33, tipo: 'Superior', sub_tipo: 'Remera', color: 'Negro' },
    { id_prendas: 34, tipo: 'Inferior', sub_tipo: 'Jean', color: 'Azul' },
    { id_prendas: 35, tipo: 'Calzado', sub_tipo: 'Zapatillas', color: 'Blanco' },
  ];
  const bohoReference = { id: 601, category: 'Boho', gender: 'women', url: 'https://example.test/boho.jpg', description: 'Boho Outfit' };
  const casualReference = { id: 602, category: 'Casual', gender: 'women', url: 'https://example.test/casual.jpg', description: 'Casual Outfit' };
  const boho = createFallbackOutfitRecommendation('Outfit Boho', flexibleWardrobe, [bohoReference]);
  const casual = createFallbackOutfitRecommendation('Outfit Casual', flexibleWardrobe, [casualReference]);
  assert.ok(boho.selectedGarmentIds.includes(31));
  assert.ok(boho.selectedGarmentIds.includes(32));
  assert.ok(casual.selectedGarmentIds.includes(33));
  assert.ok(casual.selectedGarmentIds.includes(34));
  assert.notDeepEqual(boho.selectedGarmentIds, casual.selectedGarmentIds);
});

test('uses dark real garments as a Gothic alternative without requiring Gothic accessories', () => {
  const gothicWardrobe = [
    { id_prendas: 41, tipo: 'Superior', sub_tipo: 'Remera', color: 'Negro' },
    { id_prendas: 42, tipo: 'Inferior', sub_tipo: 'Pantalon', color: 'Gris oscuro' },
    { id_prendas: 43, tipo: 'Calzado', sub_tipo: 'Zapatillas', color: 'Blanco' },
  ];
  const reference = { id: 701, category: 'Gotico', gender: 'men', url: 'https://example.test/goth.jpg', description: 'Gothic Outfit' };
  const result = createFallbackOutfitRecommendation('Outfit gótico', gothicWardrobe, [reference]);
  assert.ok(result.selectedGarmentIds.includes(41));
  assert.ok(result.selectedGarmentIds.includes(42));
  assert.deepEqual(result.usedReferenceIds, [701]);
  assert.ok(result.selectedGarmentIds.every(id => gothicWardrobe.some(garment => garment.id_prendas === id)));
});

test('completes Y2K, Boho, Casual, and Gothic outfits without repeating available main garments', () => {
  const variedWardrobe = [
    { id_prendas: 101, tipo: 'Superior', sub_tipo: 'Remera estampada', color: 'Rosa' },
    { id_prendas: 102, tipo: 'Superior', sub_tipo: 'Blusa', color: 'Beige' },
    { id_prendas: 103, tipo: 'Superior', sub_tipo: 'Remera', color: 'Negro' },
    { id_prendas: 201, tipo: 'Inferior', sub_tipo: 'Jean tiro bajo', color: 'Azul' },
    { id_prendas: 202, tipo: 'Inferior', sub_tipo: 'Falda', color: 'Marron' },
    { id_prendas: 203, tipo: 'Inferior', sub_tipo: 'Pantalon', color: 'Negro' },
    { id_prendas: 301, tipo: 'Calzado', sub_tipo: 'Zapatillas plataforma', color: 'Blanco' },
    { id_prendas: 302, tipo: 'Calzado', sub_tipo: 'Sandalias', color: 'Beige' },
    { id_prendas: 303, tipo: 'Calzado', sub_tipo: 'Botas', color: 'Negro' },
    { id_prendas: 401, tipo: 'Accesorio', sub_tipo: 'Cinturon', color: 'Negro' },
  ];
  const sequence = ['Outfit Y2K', 'Outfit Boho', 'Outfit Casual', 'Outfit gótico'];
  let previousIds: number[] = [];

  for (const [index, request] of sequence.entries()) {
    const modelIds = previousIds.length ? previousIds : [101, 201, 301];
    const recommendation = resolveOutfitRecommendation(
      request,
      variedWardrobe,
      JSON.stringify({
        selectedGarmentIds: modelIds,
        complementaryGarmentIds: index > 0 ? [401] : [],
        usedReferenceIds: [],
        evaluation: `La selección sigue el estilo ${request.replace('Outfit ', '')}.`,
      }),
      [],
      [],
      previousIds,
    );
    const selectedGarments = recommendation.selectedGarmentIds.map(id => (
      variedWardrobe.find(garment => garment.id_prendas === id)!
    ));
    for (const requiredCategory of ['Superior', 'Inferior', 'Calzado']) {
      assert.ok(selectedGarments.some(garment => garment.tipo === requiredCategory));
    }
    if (previousIds.length > 0) {
      for (const requiredCategory of ['Superior', 'Inferior', 'Calzado']) {
        const previous = variedWardrobe.find(garment => (
          previousIds.includes(garment.id_prendas) && garment.tipo === requiredCategory
        ));
        const current = selectedGarments.find(garment => garment.tipo === requiredCategory);
        assert.ok(!previous || !current || current.id_prendas !== previous.id_prendas);
      }
      assert.ok(recommendation.complementaryGarmentIds.includes(401));
    }
    assert.deepEqual(missingRequiredCategories(variedWardrobe, recommendation, request), []);
    assert.ok(selectedGarments.every(garment => variedWardrobe.some(itemInWardrobe => itemInWardrobe.id_prendas === garment.id_prendas)));
    previousIds = recommendation.selectedGarmentIds;
  }
});

test('returns a small valid selection when only a few garments are available', () => {
  const fewGarments = [wardrobe[0]];
  const result = createFallbackOutfitRecommendation('Outfit Y2K', fewGarments);
  assert.deepEqual(result.selectedGarmentIds, [1]);
  assert.doesNotThrow(() => validateOutfitRecommendation('Outfit Y2K', fewGarments, result));
  assert.deepEqual(missingRequiredCategories(fewGarments, result, 'Outfit Y2K'), ['inferiores', 'calzado']);
});

test('honors explicit color restrictions in a wardrobe fallback', () => {
  const result = createFallbackOutfitRecommendation('Outfit casual sin rojo', wardrobe, [], [1, 2, 4]);
  assert.ok(result.selectedGarmentIds.length > 0);
  assert.ok(result.selectedGarmentIds.every(id => wardrobe.find(garment => garment.id_prendas === id)?.color !== 'Rojo'));
  assert.ok(result.selectedGarmentIds.includes(3));
  assert.doesNotThrow(() => validateOutfitRecommendation('Outfit casual sin rojo', wardrobe, result));
});

test('does not avoid a previous garment that the user explicitly requested', () => {
  const result = resolveOutfitRecommendation(
    'Outfit casual quiero usar remera negra',
    wardrobe,
    JSON.stringify({
      selectedGarmentIds: [1, 2, 4],
      complementaryGarmentIds: [],
      usedReferenceIds: [],
      evaluation: 'La remera negra, el jean azul y las zapatillas blancas forman un conjunto casual.',
    }),
    [],
    [],
    [1, 2, 4],
  );
  assert.ok(result.selectedGarmentIds.includes(1));
  assert.equal(result.selectedGarmentIds.length, 3);
});

test('does not invent a selection when the wardrobe is empty or all garments violate restrictions', () => {
  const empty = createFallbackOutfitRecommendation('Outfit Y2K', []);
  assert.deepEqual(empty.selectedGarmentIds, []);
  const excluded = createFallbackOutfitRecommendation('Outfit sin rojo', [wardrobe[5]]);
  assert.deepEqual(excluded.selectedGarmentIds, []);
  assert.match(excluded.evaluation, /No hay prendas utilizables/);
});

test('recovers malformed NVIDIA output with a local selection', () => {
  const result = resolveOutfitRecommendation('Outfit casual', wardrobe, 'not json');
  assert.ok(result.selectedGarmentIds.length > 0);
  assert.ok(result.selectedGarmentIds.every(id => wardrobe.some(garment => garment.id_prendas === id)));
});

test('rejects a response that does not include an explicitly requested available garment', () => {
  assert.throws(
    () => validateOutfitRecommendation('Quiero usar remera', wardrobe, recommendation({ selectedGarmentIds: [2] })),
    /no incluyó una prenda solicitada/,
  );
});

test('uses the best available wardrobe outfit when no requested dress exists', () => {
  const result = resolveOutfitRecommendation(
    'Quiero un vestido formal',
    wardrobe,
    JSON.stringify({
      selectedGarmentIds: [],
      complementaryGarmentIds: [],
      usedReferenceIds: [],
      evaluation: 'No hay vestidos disponibles en tu ropero.',
    }),
  );
  assert.ok(result.selectedGarmentIds.length >= 3);
  assert.ok(result.selectedGarmentIds.every(id => wardrobe.some(garment => garment.id_prendas === id)));
});

test('rejects an empty selection without explaining the unmet request', () => {
  assert.throws(
    () => validateOutfitRecommendation('Quiero algo casual', wardrobe, recommendation({
      selectedGarmentIds: [],
      complementaryGarmentIds: [],
      evaluation: 'Elegí una combinación moderna y cómoda.',
    })),
    /no seleccionó prendas/,
  );
});
