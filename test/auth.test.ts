import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import { DEFAULT_SCOPES } from '../src/auth.js';

// ---------------------------------------------------------------------------
// DEFAULT_SCOPES
// ---------------------------------------------------------------------------
test('DEFAULT_SCOPES includes all 8 required scopes', () => {
  assert.equal(DEFAULT_SCOPES.length, 8);
  assert.ok(DEFAULT_SCOPES.some(s => s.includes('drive')));
  assert.ok(DEFAULT_SCOPES.some(s => s.includes('documents')));
  assert.ok(DEFAULT_SCOPES.some(s => s.includes('spreadsheets')));
  assert.ok(DEFAULT_SCOPES.some(s => s.includes('presentations')));
  assert.ok(DEFAULT_SCOPES.some(s => s.includes('calendar')));
});

test('DEFAULT_SCOPES are full URLs', () => {
  for (const scope of DEFAULT_SCOPES) {
    assert.ok(scope.startsWith('https://www.googleapis.com/auth/'), `Bad scope: ${scope}`);
  }
});

// ---------------------------------------------------------------------------
// runAuth error handling (tested via import, not subprocess)
// ---------------------------------------------------------------------------
import { runAuth } from '../src/auth.js';

test('runAuth throws when credentials file missing', async () => {
  await assert.rejects(
    () => runAuth('nonexistent-account-slug'),
    /Credentials file not found/,
  );
});
