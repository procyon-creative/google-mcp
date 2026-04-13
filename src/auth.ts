/**
 * Authentication module.
 *
 * Uses @google-cloud/local-auth for the browser-based OAuth flow.
 * Tokens are stored per-account in the account directory.
 */

import { authenticate } from '@google-cloud/local-auth';
import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { getAccountCredentialsPath, getAccountTokenPath } from './accounts.js';

export const DEFAULT_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/presentations',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
];

/**
 * Run the OAuth authentication flow for an account.
 * Opens a browser for consent, saves tokens to the account directory.
 */
export async function runAuth(accountSlug: string): Promise<void> {
  const keyfilePath = getAccountCredentialsPath(accountSlug);
  const tokenPath = getAccountTokenPath(accountSlug);

  if (!existsSync(keyfilePath)) {
    throw new Error(
      `Credentials file not found: ${keyfilePath}\n` +
      'Run setup first: node dist/index.js setup'
    );
  }

  console.error('Opening browser for authentication...\n');

  const client = await authenticate({
    keyfilePath,
    scopes: DEFAULT_SCOPES,
  });

  if (!client.credentials) {
    throw new Error('Authentication failed — no credentials returned.');
  }

  mkdirSync(dirname(tokenPath), { recursive: true });
  writeFileSync(tokenPath, JSON.stringify(client.credentials), { mode: 0o600 });
  console.error(`Tokens saved to: ${tokenPath}`);
}
