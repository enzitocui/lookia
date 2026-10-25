import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  NVIDIA_NIM_ENDPOINT,
  NVIDIA_NIM_MODEL,
  OutfitGenerationError,
  requestOutfitFromNim,
} from './nvidiaNim.ts';
import type { ExploreReference } from './exploreReferences.ts';

const wardrobe = [{ id_prendas: 1, tipo: 'Superior', sub_tipo: 'Remera', color: 'Negro' }];
const references: ExploreReference[] = [{
  id: 501,
  category: 'Casual',
  gender: 'women',
  url: 'https://example.test/reference.jpg',
  description: 'Casual Outfit',
}];

test('uses the configured NVIDIA NIM endpoint and sends selected Explore references as images', async () => {
  const previousKey = process.env.NVIDIA_NIM_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.NVIDIA_NIM_API_KEY = 'test-key';
  let requestUrl = '';
  let requestInit: RequestInit | undefined;
  globalThis.fetch = async (input, init) => {
    requestUrl = String(input);
    requestInit = init;
    return new Response(JSON.stringify({
      choices: [{ message: { content: '{"selectedGarmentIds":[],"complementaryGarmentIds":[],"usedReferenceIds":[],"evaluation":"No hay prendas disponibles."}' } }],
    }), { status: 200 });
  };

  try {
    const response = await requestOutfitFromNim('Una combinación casual', wardrobe, [], references);
    assert.equal(response, '{"selectedGarmentIds":[],"complementaryGarmentIds":[],"usedReferenceIds":[],"evaluation":"No hay prendas disponibles."}');
    assert.equal(requestUrl, NVIDIA_NIM_ENDPOINT);
    assert.equal(requestInit?.method, 'POST');
    assert.equal(new Headers(requestInit?.headers).get('authorization'), 'Bearer test-key');
    const payload = JSON.parse(String(requestInit?.body)) as {
      model: string;
      stream: boolean;
      messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }>;
    };
    assert.equal(payload.model, NVIDIA_NIM_MODEL);
    assert.equal(payload.stream, false);
    assert.ok(typeof payload.messages[0].content === 'string');
    assert.ok(Array.isArray(payload.messages[1].content));
    const userContent = payload.messages[1].content as Array<{ type: string; text?: string; image_url?: { url: string } }>;
    assert.ok(userContent.some(part => part.type === 'image_url' && part.image_url?.url === references[0].url));
    const context = userContent.find(part => part.type === 'text')?.text;
    assert.ok(context?.includes('solicitudOriginal'));
    assert.ok(context?.includes('Una combinación casual'));
    assert.ok(context?.includes('referenciasDeExplorarDisponibles'));
    assert.ok(context?.includes('Remera'));
    assert.match(payload.messages[0].content, /entre una y cuatro prendas/);
    assert.match(payload.messages[0].content, /accesorios son opcionales/);
    assert.match(payload.messages[0].content, /evaluación/);
    assert.match(payload.messages[0].content, /Nunca incluyas IDs/);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.NVIDIA_NIM_API_KEY;
    else process.env.NVIDIA_NIM_API_KEY = previousKey;
  }
});

test('does not send an image when no Explore reference candidate exists', async () => {
  const previousKey = process.env.NVIDIA_NIM_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.NVIDIA_NIM_API_KEY = 'test-key';
  let requestInit: RequestInit | undefined;
  globalThis.fetch = async (_input, init) => {
    requestInit = init;
    return new Response(JSON.stringify({
      choices: [{ message: { content: '{"selectedGarmentIds":[],"complementaryGarmentIds":[],"usedReferenceIds":[],"evaluation":"No hay prendas disponibles."}' } }],
    }), { status: 200 });
  };

  try {
    await requestOutfitFromNim('Quiero un conjunto', wardrobe, [], []);
    const payload = JSON.parse(String(requestInit?.body)) as {
      messages: Array<{ content: string | Array<{ type: string }> }>;
    };
    const userContent = payload.messages[1].content as Array<{ type: string }>;
    assert.ok(!userContent.some(part => part.type === 'image_url'));
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.NVIDIA_NIM_API_KEY;
    else process.env.NVIDIA_NIM_API_KEY = previousKey;
  }
});

test('returns a safe configuration error when the server key is missing', async () => {
  const previousKey = process.env.NVIDIA_NIM_API_KEY;
  delete process.env.NVIDIA_NIM_API_KEY;
  try {
    await assert.rejects(
      requestOutfitFromNim('Una combinación casual', wardrobe, [], []),
      (error: unknown) => error instanceof OutfitGenerationError && error.status === 503,
    );
  } finally {
    if (previousKey !== undefined) process.env.NVIDIA_NIM_API_KEY = previousKey;
  }
});

test('maps an aborted NVIDIA request to a safe gateway timeout', async () => {
  const previousKey = process.env.NVIDIA_NIM_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.NVIDIA_NIM_API_KEY = 'test-key';
  globalThis.fetch = async () => {
    throw new DOMException('Request aborted', 'AbortError');
  };

  try {
    await assert.rejects(
      requestOutfitFromNim('Una combinación casual', wardrobe, [], []),
      (error: unknown) => error instanceof OutfitGenerationError
        && error.status === 504
        && error.message === 'La generación tardó demasiado. Intentá nuevamente.',
    );
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.NVIDIA_NIM_API_KEY;
    else process.env.NVIDIA_NIM_API_KEY = previousKey;
  }
});

test('handles NVIDIA authentication and usage-limit responses without exposing provider details', async () => {
  const previousKey = process.env.NVIDIA_NIM_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.NVIDIA_NIM_API_KEY = 'test-key';
  try {
    for (const [providerStatus, expectedStatus] of [[401, 503], [429, 429]]) {
      globalThis.fetch = async () => new Response('', { status: providerStatus });
      await assert.rejects(
        requestOutfitFromNim('Una combinación casual', wardrobe, [], []),
        (error: unknown) => error instanceof OutfitGenerationError
          && error.status === expectedStatus
          && !error.message.includes('test-key'),
      );
    }
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.NVIDIA_NIM_API_KEY;
    else process.env.NVIDIA_NIM_API_KEY = previousKey;
  }
});
