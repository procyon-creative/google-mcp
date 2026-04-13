import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdirSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import {
  slugifyEmail,
  mcpServerName,
  listAccounts,
  addAccount,
  getDefaultAccount,
  setDefaultAccount,
  getAccountDir,
  getAccountCredentialsPath,
  getAccountTokenPath,
  updateAccountProject,
  updateStepStatus,
  getAccountSetup,
} from '../src/accounts.js';

// ---------------------------------------------------------------------------
// slugifyEmail
// ---------------------------------------------------------------------------
test('slugifyEmail converts email to filesystem-safe slug', () => {
  assert.equal(slugifyEmail('user@example.com'), 'user-at-example-com');
});

test('slugifyEmail handles gmail', () => {
  assert.equal(slugifyEmail('jane.doe@gmail.com'), 'jane-doe-at-gmail-com');
});

test('slugifyEmail handles uppercase', () => {
  assert.equal(slugifyEmail('Alice@Example.COM'), 'alice-at-example-com');
});

test('slugifyEmail handles subdomains', () => {
  assert.equal(slugifyEmail('user@mail.company.co.uk'), 'user-at-mail-company-co-uk');
});

test('slugifyEmail handles plus addressing', () => {
  assert.equal(slugifyEmail('user+tag@gmail.com'), 'user-tag-at-gmail-com');
});

// ---------------------------------------------------------------------------
// mcpServerName
// ---------------------------------------------------------------------------
test('mcpServerName generates google-user-domain format', () => {
  assert.equal(mcpServerName('jane.doe@gmail.com'), 'google-jane-doe-gmail');
});

test('mcpServerName handles simple email', () => {
  assert.equal(mcpServerName('user@example.com'), 'google-user-example');
});

test('mcpServerName handles uppercase', () => {
  assert.equal(mcpServerName('Alice@Example.COM'), 'google-alice-example');
});

test('mcpServerName handles plus addressing', () => {
  assert.equal(mcpServerName('user+work@gmail.com'), 'google-user-work-gmail');
});

// ---------------------------------------------------------------------------
// Account registry (uses temp dir)
// ---------------------------------------------------------------------------
const TEMP_CONFIG = join(tmpdir(), `accounts-test-${Date.now()}`);
mkdirSync(TEMP_CONFIG, { recursive: true });

// Override config dir for testing
const origEnv = process.env.XDG_CONFIG_HOME;
process.env.XDG_CONFIG_HOME = TEMP_CONFIG;

test('listAccounts returns empty when no accounts.json exists', () => {
  const accounts = listAccounts();
  assert.deepEqual(accounts, []);
});

test('addAccount creates registry and returns slug', () => {
  const slug = addAccount('user@example.com');
  assert.equal(slug, 'user-at-example-com');
});

test('addAccount sets first account as default', () => {
  const accounts = listAccounts();
  assert.equal(accounts.length, 1);
  assert.equal(accounts[0].email, 'user@example.com');
  assert.equal(accounts[0].default, true);
});

test('addAccount adds second account without making it default', () => {
  addAccount('work@company.com');
  const accounts = listAccounts();
  assert.equal(accounts.length, 2);
  const work = accounts.find(a => a.email === 'work@company.com');
  assert.equal(work?.default, false);
});

test('addAccount is idempotent — adding same email again does not duplicate', () => {
  addAccount('user@example.com');
  const accounts = listAccounts();
  assert.equal(accounts.length, 2);
});

test('getDefaultAccount returns the default account slug', () => {
  const slug = getDefaultAccount();
  assert.equal(slug, 'user-at-example-com');
});

test('setDefaultAccount changes the default', () => {
  setDefaultAccount('work@company.com');
  const slug = getDefaultAccount();
  assert.equal(slug, 'work-at-company-com');

  // Previous default is no longer default
  const accounts = listAccounts();
  const first = accounts.find(a => a.email === 'user@example.com');
  assert.equal(first?.default, false);
});

test('setDefaultAccount throws for unknown email', () => {
  assert.throws(() => setDefaultAccount('unknown@example.com'), /not found/);
});

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------
test('getAccountDir returns path under accounts/', () => {
  const dir = getAccountDir('user-at-example-com');
  assert.ok(dir.includes('google-drive-mcp'));
  assert.ok(dir.includes('accounts'));
  assert.ok(dir.includes('user-at-example-com'));
});

test('getAccountCredentialsPath returns gcp-oauth.keys.json in account dir', () => {
  const p = getAccountCredentialsPath('user-at-example-com');
  assert.ok(p.endsWith('gcp-oauth.keys.json'));
  assert.ok(p.includes('user-at-example-com'));
});

test('getAccountTokenPath returns tokens.json in account dir', () => {
  const p = getAccountTokenPath('user-at-example-com');
  assert.ok(p.endsWith('tokens.json'));
  assert.ok(p.includes('user-at-example-com'));
});

// ---------------------------------------------------------------------------
// Project and setup status tracking
// ---------------------------------------------------------------------------
test('updateAccountProject saves project ID', () => {
  updateAccountProject('user@example.com', 'my-gcp-project');
  const setup = getAccountSetup('user@example.com');
  assert.equal(setup?.projectId, 'my-gcp-project');
});

test('getAccountSetup returns null for unknown email', () => {
  assert.equal(getAccountSetup('nobody@example.com'), null);
});

test('updateStepStatus marks step as done', () => {
  updateStepStatus('user@example.com', 'enable-apis', 'done');
  updateStepStatus('user@example.com', 'branding', 'done');
  const setup = getAccountSetup('user@example.com');
  assert.equal(setup?.steps['enable-apis'], 'done');
  assert.equal(setup?.steps['branding'], 'done');
});

test('updateStepStatus marks step as failed', () => {
  updateStepStatus('user@example.com', 'audience', 'failed');
  const setup = getAccountSetup('user@example.com');
  assert.equal(setup?.steps['audience'], 'failed');
});

test('updateStepStatus overwrites previous status', () => {
  updateStepStatus('user@example.com', 'audience', 'done');
  const setup = getAccountSetup('user@example.com');
  assert.equal(setup?.steps['audience'], 'done');
});

test('updateStepStatus throws for unknown email', () => {
  assert.throws(() => updateStepStatus('nobody@example.com', 'branding', 'done'), /not found/);
});

test('getAccountSetup returns projectId and steps together', () => {
  const setup = getAccountSetup('user@example.com');
  assert.equal(setup?.projectId, 'my-gcp-project');
  assert.equal(setup?.steps['enable-apis'], 'done');
  assert.equal(setup?.steps['branding'], 'done');
  assert.equal(setup?.steps['audience'], 'done');
  // Steps not yet attempted are undefined
  assert.equal(setup?.steps['scopes'], undefined);
});

// Cleanup
test('cleanup accounts test', () => {
  rmSync(TEMP_CONFIG, { recursive: true, force: true });
  if (origEnv !== undefined) {
    process.env.XDG_CONFIG_HOME = origEnv;
  } else {
    delete process.env.XDG_CONFIG_HOME;
  }
});
