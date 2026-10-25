import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseOutfitRecommendation, validateOutfitRecommendation } from './outfitValidation.ts';
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
  selectedGarmentIds: [1, 2],
  complementaryGarmentIds: [4],
  usedReferenceIds: [],
  evaluation: 'La remera y el jean responden al estilo casual; el color azul no coincide del todo con la preferencia oscura. Podés sumar las zapatillas blancas disponibles para dar contraste.',
  ...overrides,
}));

test('parses a complete structured model response', () => {
  assert.deepEqual(recommendation().selectedGarmentIds, [1, 2]);
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

test('requires the evaluation to name the selected real garments', () => {
  assert.throws(
    () => validateOutfitRecommendation('Look casual', wardrobe, recommendation({
      evaluation: 'La combinación cumple con el estilo casual y los colores elegidos.',
    })),
    /no identifica con claridad/,
  );
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
    selectedGarmentIds: [1, 2, 4, 5],
    complementaryGarmentIds: [],
    evaluation: 'La remera negra y el jean azul forman la base casual; las zapatillas blancas aportan contraste y el cinturón negro está disponible para completar el conjunto.',
  });
  assert.equal(validateOutfitRecommendation('Look casual', wardrobe, fourGarments).selectedGarmentIds.length, 4);

  const twoGarments = recommendation({ selectedGarmentIds: [1, 2], complementaryGarmentIds: [] });
  assert.equal(validateOutfitRecommendation('Look casual', wardrobe, twoGarments).selectedGarmentIds.length, 2);
});

test('rejects more than four selected garments and duplicate IDs', () => {
  assert.throws(() => recommendation({ selectedGarmentIds: [1, 2, 4, 5, 6] }), OutfitGenerationError);
  assert.throws(
    () => validateOutfitRecommendation('Look casual', wardrobe, recommendation({ selectedGarmentIds: [1, 2], complementaryGarmentIds: [2] })),
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
    () => validateOutfitRecommendation('Quiero algo casual sin usar campera', wardrobe, recommendation({ selectedGarmentIds: [2, 3] })),
    /restricción explícita/,
  );
});

test('does not suggest an explicitly excluded item as an optional complement', () => {
  assert.throws(
    () => validateOutfitRecommendation('Quiero algo casual sin campera', wardrobe, recommendation({
      selectedGarmentIds: [1, 2],
      complementaryGarmentIds: [3],
    })),
    /restricción explícita/,
  );
});

test('still requires a coherent upper and lower combination when excluding a single subtype', () => {
  assert.throws(
    () => validateOutfitRecommendation('Un conjunto casual sin campera', wardrobe, recommendation({ selectedGarmentIds: [1], complementaryGarmentIds: [] })),
    /superiores e inferiores disponibles/,
  );
  assert.deepEqual(
    validateOutfitRecommendation('Un conjunto casual sin campera', wardrobe, recommendation()).selectedGarmentIds,
    [1, 2],
  );
});

test('rejects a response that does not include an explicitly requested available garment', () => {
  assert.throws(
    () => validateOutfitRecommendation('Quiero usar remera', wardrobe, recommendation({ selectedGarmentIds: [2] })),
    /no incluyó una prenda solicitada/,
  );
});

test('accepts an explicit no-match response when the wardrobe cannot satisfy the request', () => {
  const result = validateOutfitRecommendation(
    'Quiero un vestido formal',
    wardrobe,
    recommendation({ selectedGarmentIds: [], complementaryGarmentIds: [], evaluation: 'No hay vestidos disponibles en tu ropero.' }),
  );
  assert.deepEqual(result.selectedGarmentIds, []);
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
