import assert from 'node:assert/strict';
import { test } from 'node:test';
import bcrypt from 'bcryptjs';
import {
  EXHIBITION_ACCOUNT_EMAIL,
  authorizeProfileUpload,
  denyExhibitionAccount,
  establishExhibitionSession,
  isExhibitionAccount,
} from './exhibitionAccount.ts';
import { requireAuth } from './requireAuth.ts';

test('authenticates only the configured exhibition email with its server-side bcrypt hash', async () => {
  const passwordHash = await bcrypt.hash('unit-test-exhibition-secret', 4);
  assert.equal(await isExhibitionAccount(EXHIBITION_ACCOUNT_EMAIL, 'unit-test-exhibition-secret', passwordHash), true);
  assert.equal(await isExhibitionAccount('other@example.com', 'unit-test-exhibition-secret', passwordHash), false);
  assert.equal(await isExhibitionAccount(EXHIBITION_ACCOUNT_EMAIL, 'wrong', passwordHash), false);
});

test('reports a missing exhibition password hash as a configuration error', async () => {
  await assert.rejects(
    isExhibitionAccount(EXHIBITION_ACCOUNT_EMAIL, 'unit-test-exhibition-secret', undefined),
    /no está configurada/,
  );
});

test('establishes an exhibition session without assigning a normal user ID', async () => {
  const session = {
    exhibitionAccount: false,
    userId: undefined as number | undefined,
    regenerate(callback: (error?: Error | null) => void) { callback(null); },
    save(callback: (error?: Error | null) => void) { callback(null); },
  };
  await establishExhibitionSession({ session } as never);
  assert.equal(session.exhibitionAccount, true);
  assert.equal(session.userId, undefined);
});

test('blocks exhibition sessions from normal API routes', () => {
  let nextCalled = false;
  let statusCode = 0;
  let responseBody: unknown;
  const request = { session: { exhibitionAccount: true } };
  const response = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(body: unknown) {
      responseBody = body;
      return this;
    },
  };

  denyExhibitionAccount(
    request as never,
    response as never,
    () => { nextCalled = true; },
  );

  assert.equal(nextCalled, false);
  assert.equal(statusCode, 403);
  assert.deepEqual(responseBody, { error: 'Esta función no está disponible en el modo exposición.' });
});

test('allows a normal session through exhibition-only API protection', () => {
  let nextCalled = false;
  const request = { session: { userId: 42 } };
  denyExhibitionAccount(request as never, {} as never, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});

test('requires auth middleware to deny exhibition sessions but allow normal sessions', () => {
  let exhibitionStatus = 0;
  let nextCalled = false;
  requireAuth(
    { session: { exhibitionAccount: true } } as never,
    { status(code: number) { exhibitionStatus = code; return this; }, json() { return this; } } as never,
    () => { nextCalled = true; },
  );
  assert.equal(exhibitionStatus, 403);
  assert.equal(nextCalled, false);

  requireAuth(
    { session: { userId: 12 } } as never,
    {} as never,
    () => { nextCalled = true; },
  );
  assert.equal(nextCalled, true);
});

test('profile uploads remain private to their owning normal account and blocked for exhibition', () => {
  let statusCode = 0;
  let nextCalled = false;
  const response = { sendStatus(code: number) { statusCode = code; return this; } };

  authorizeProfileUpload(
    { session: { exhibitionAccount: true }, path: '/12/avatar.webp' } as never,
    response as never,
    () => { nextCalled = true; },
  );
  assert.equal(statusCode, 403);
  assert.equal(nextCalled, false);

  statusCode = 0;
  authorizeProfileUpload(
    { session: { userId: 12 }, path: '/12/avatar.webp' } as never,
    response as never,
    () => { nextCalled = true; },
  );
  assert.equal(nextCalled, true);
  authorizeProfileUpload(
    { session: { userId: 12 }, path: '/13/avatar.webp' } as never,
    response as never,
    () => { nextCalled = true; },
  );
  assert.equal(statusCode, 404);
});
