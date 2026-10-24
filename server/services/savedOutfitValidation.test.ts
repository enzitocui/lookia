import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateSavedOutfitInput } from './savedOutfitValidation.ts';

const validPayload = {
  name: '  Look para salir  ',
  style: 'Casual',
  evaluation: 'La combinación responde al pedido y puede complementarse con las zapatillas disponibles.',
  garmentIds: [1, 2, 3],
};

test('trims a personalized name and retains the evaluation and real garment IDs', () => {
  assert.deepEqual(validateSavedOutfitInput(validPayload), {
    value: {
      name: 'Look para salir',
      style: 'Casual',
      evaluation: validPayload.evaluation,
      garmentIds: [1, 2, 3],
    },
  });
});

test('rejects blank or overlong outfit names', () => {
  assert.match(validateSavedOutfitInput({ ...validPayload, name: '   ' }).error ?? '', /nombre del outfit/);
  assert.match(validateSavedOutfitInput({ ...validPayload, name: 'x'.repeat(81) }).error ?? '', /80 caracteres/);
});

test('limits outfits to four unique, valid garment IDs', () => {
  assert.equal(validateSavedOutfitInput({ ...validPayload, garmentIds: [1, 2, 3, 4] }).value?.garmentIds.length, 4);
  assert.match(validateSavedOutfitInput({ ...validPayload, garmentIds: [1, 2, 3, 4, 5] }).error ?? '', /cuatro prendas/);
  assert.match(validateSavedOutfitInput({ ...validPayload, garmentIds: [1, 1] }).error ?? '', /no es válida/);
});

test('rejects invalid evaluation and excludes reference image data from persisted fields', () => {
  assert.match(validateSavedOutfitInput({ ...validPayload, evaluation: ' ' }).error ?? '', /evaluación/);
  const result = validateSavedOutfitInput({ ...validPayload, referenceImages: ['https://example.test/image.jpg'] });
  assert.ok(result.value);
  assert.deepEqual(Object.keys(result.value), ['name', 'style', 'evaluation', 'garmentIds']);
});

test('allows legacy manual saves without an AI evaluation', () => {
  assert.equal(validateSavedOutfitInput({ ...validPayload, evaluation: undefined }).value?.evaluation, null);
});
