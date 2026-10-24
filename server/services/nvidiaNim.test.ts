import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  NVIDIA_NIM_ENDPOINT,
  NVIDIA_NIM_MODEL,
  OutfitGenerationError,
  requestOutfitFromNim,
} from './nvidiaNim.ts';

const wardrobe = [{ id_prendas: 1, tipo: 'Superior', sub_tipo: 'Remera', color: 'Negro' }];

test('uses the configured NVIDIA NIM Chat Completions endpoint without images or streaming', async () => {
  const previousKey = process.env.NVIDIA_NIM_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.NVIDIA_NIM_API_KEY = 'test-key';
  let requestUrl = '';
  let requestInit: RequestInit | undefined;
  globalThis.fetch = async (input, init) => {
    requestUrl = String(input);
    requestInit = init;
    return new Response(JSON.stringify({ choices: [{ message: { content: '{"selectedGarmentIds":[]}' } }] }), { status: 200 });
  };

  try {
    const response = await requestOutfitFromNim('Una combinación casual', wardrobe, []);
    assert.equal(response, '{"selectedGarmentIds":[]}');
    assert.equal(requestUrl, NVIDIA_NIM_ENDPOINT);
    assert.equal(requestInit?.method, 'POST');
    assert.equal(new Headers(requestInit?.headers).get('authorization'), 'Bearer test-key');
    const payload = JSON.parse(String(requestInit?.body)) as {
      model: string;
      stream: boolean;
      messages: Array<{ content: string }>;
    };
    assert.equal(payload.model, NVIDIA_NIM_MODEL);
    assert.equal(payload.stream, false);
    assert.ok(payload.messages.every(message => typeof message.content === 'string'));
    assert.ok(!String(requestInit?.body).includes('image_url'));
    assert.match(payload.messages[0].content, /entre una y cuatro prendas/);
    assert.match(payload.messages[0].content, /accesorios son opcionales/);
    assert.match(payload.messages[0].content, /evaluación/);
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
      requestOutfitFromNim('Una combinación casual', wardrobe, []),
      (error: unknown) => error instanceof OutfitGenerationError && error.status === 503,
    );
  } finally {
    if (previousKey !== undefined) process.env.NVIDIA_NIM_API_KEY = previousKey;
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
        requestOutfitFromNim('Una combinación casual', wardrobe, []),
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
