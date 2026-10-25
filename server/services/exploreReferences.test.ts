import assert from 'node:assert/strict';
import { test } from 'node:test';
import { selectExploreReferences } from './exploreReferences.ts';

test('selects style-matched images from the Explore catalog, not random categories', () => {
  const references = selectExploreReferences('Quiero algo casual para salir con amigos', 'Boho');

  assert.equal(references.length, 2);
  assert.ok(references.every(reference => reference.category === 'Casual'));
  assert.ok(references.every(reference => /^https:\/\//.test(reference.url)));
  assert.equal(new Set(references.map(reference => reference.id)).size, references.length);
});

test('uses the active Explore category when the request does not name a style', () => {
  const references = selectExploreReferences('Quiero algo cómodo para hoy', 'Vintage');

  assert.equal(references.length, 2);
  assert.ok(references.every(reference => reference.category === 'Vintage'));
});

test('does not confuse a color preference for an Explore style category', () => {
  const references = selectExploreReferences('Quiero algo casual con colores oscuros', 'Boho');

  assert.ok(references.every(reference => reference.category === 'Casual'));
});

test('uses the current Explore default category if neither the request nor active category identifies one', () => {
  const references = selectExploreReferences('Quiero un outfit para hoy', undefined);

  assert.equal(references.length, 2);
  assert.ok(references.every(reference => reference.category === 'Boho'));
});

test('does not invent reference images for Explore categories without a backend catalog', () => {
  assert.deepEqual(selectExploreReferences('Quiero algo para hoy', 'AURA'), []);
});

test('uses the same non-random reference sample on regeneration', () => {
  const first = selectExploreReferences('Un look casual', 'Casual');
  const next = selectExploreReferences('Un look casual', 'Casual');

  assert.deepEqual(next, first);
});
