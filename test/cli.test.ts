import assert from 'node:assert/strict';
import test from 'node:test';
import { execSync } from 'child_process';

// ---------------------------------------------------------------------------
// CLI arg parsing (tested via subprocess to exercise the real binary)
// ---------------------------------------------------------------------------

function cli(args: string): string {
  return execSync(`node dist/index.js ${args} 2>&1`, { encoding: 'utf-8' }).trim();
}

// help
test('cli: help shows usage info', () => {
  const out = cli('help');
  assert.ok(out.includes('google-mcp'));
  assert.ok(out.includes('setup'));
  assert.ok(out.includes('accounts'));
  assert.ok(out.includes('auth'));
});

test('cli: --help shows usage info', () => {
  const out = cli('--help');
  assert.ok(out.includes('google-mcp'));
});

// accounts
test('cli: accounts lists configured accounts', () => {
  const out = cli('accounts');
  assert.ok(out.includes('Configured accounts') || out.includes('No accounts configured'));
});

test('cli: accounts --account filters to specific account', () => {
  const out = cli('accounts --account nonexistent@example.com');
  assert.ok(out.includes('not found'));
});

// unknown command
test('cli: unknown command shows error and help', () => {
  try {
    cli('boguscommand');
    assert.fail('should have exited with error');
  } catch (e: any) {
    // execSync captures stdout in e.stdout
    const output = e.stdout?.toString() || e.stderr?.toString() || e.message;
    assert.ok(output.includes('Unknown command'));
  }
});
