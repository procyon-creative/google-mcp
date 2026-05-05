/**
 * google-mcp — Multi-account wrapper for @piotr-agier/google-drive-mcp.
 *
 * Custom commands: setup, accounts, auth
 * Default: spawns the upstream MCP server with account-specific env vars.
 */

import { spawn } from 'child_process';
import {
  slugifyEmail, listAccounts, getDefaultAccount,
  getAccountSetup, getAccountCredentialsPath, getAccountTokenPath,
  mcpServerName,
} from './accounts.js';
import { runAuth } from './auth.js';

// ── Arg parsing ─────────────────────────────────────────────────────────────

interface CliArgs {
  command?: string;
  account?: string;
  rest: string[];  // remaining args to pass to setup/etc.
}

function parseArgs(argv: string[]): CliArgs {
  let command: string | undefined;
  let account: string | undefined;
  const rest: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--account' && argv[i + 1]) {
      account = argv[i + 1];
      i++;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      command = 'help';
      continue;
    }

    if (!command && !arg.startsWith('--')) {
      command = arg;
      continue;
    }

    rest.push(arg);
    // Also grab the next arg if this is a flag with a value
    if (arg.startsWith('--') && argv[i + 1] && !argv[i + 1].startsWith('--')) {
      rest.push(argv[i + 1]);
      i++;
    }
  }

  return { command, account, rest };
}

function parseSetupOpts(rest: string[], account?: string): Record<string, any> {
  const opts: Record<string, any> = {};
  if (account) opts.account = account;

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    const next = rest[i + 1];

    switch (arg) {
      case '--project-id':     opts.projectId = next; i++; break;
      case '--credentials':    opts.credentialsPath = next; i++; break;
      case '--mode':           opts.mode = next; i++; break;
      case '--gcloud-account': opts.gcloudAccount = next; i++; break;
      case '--step':           opts.step = next; i++; break;
      case '--skip-browser':   opts.skipBrowser = true; break;
      case '--skip-gcloud':    opts.skipGcloud = true; break;
      case '--create-project': opts.createProject = true; break;
      case '--run-auth':       opts.runAuth = true; break;
      case '--no-auth':        opts.runAuth = false; break;
    }
  }

  return opts;
}

// ── Account resolution ──────────────────────────────────────────────────────

function resolveAccountSlug(account?: string): string {
  if (account) return slugifyEmail(account);

  const defaultSlug = getDefaultAccount();
  if (defaultSlug) return defaultSlug;

  console.error('No account specified and no default account configured.');
  console.error('Run: node dist/index.js setup');
  process.exit(1);
}

// ── Commands ────────────────────────────────────────────────────────────────

async function showAccounts(account?: string) {
  let accounts = listAccounts();
  if (account) {
    accounts = accounts.filter(a => a.email === account || a.slug === account);
  }
  if (accounts.length === 0) {
    console.log(account ? `Account "${account}" not found.` : 'No accounts configured. Run: node dist/index.js setup');
    return;
  }

  const ALL_STEPS = ['enable-apis', 'branding', 'audience', 'scopes', 'credentials', 'auth'] as const;
  console.log('Configured accounts:\n');
  for (const a of accounts) {
    const marker = a.default ? ' (default)' : '';
    const setup = getAccountSetup(a.email);
    console.log(`  ${a.email}${marker}`);
    console.log(`    mcp name: ${mcpServerName(a.email)}`);
    if (setup?.projectId) {
      console.log(`    project:  ${setup.projectId}`);
    }
    const stepLine = ALL_STEPS.map(s => {
      const status = setup?.steps[s];
      if (status === 'done') return `${s} \x1b[32m✓\x1b[0m`;
      if (status === 'failed') return `${s} \x1b[31m✗\x1b[0m`;
      return `${s} \x1b[2m·\x1b[0m`;
    }).join('  ');
    console.log(`    setup:   ${stepLine}`);
  }
}

function startMcpServer(accountSlug: string) {
  const credPath = getAccountCredentialsPath(accountSlug);
  const tokenPath = getAccountTokenPath(accountSlug);

  const child = spawn('npx', ['@piotr-agier/google-drive-mcp'], {
    env: {
      ...process.env,
      GOOGLE_DRIVE_OAUTH_CREDENTIALS: credPath,
      GOOGLE_DRIVE_MCP_TOKEN_PATH: tokenPath,
    },
    stdio: [process.stdin, process.stdout, 'inherit'],
  });

  child.on('exit', (code) => process.exit(code ?? 0));
  child.on('error', (err) => {
    console.error('Failed to start MCP server:', err.message);
    process.exit(1);
  });
}

function showHelp() {
  console.log(`
google-mcp — Multi-account wrapper for Google Drive MCP

Usage:
  google-mcp [command] [--account <email>] [options]

Commands:
  setup      Interactive setup wizard (GCP project, APIs, OAuth)
  accounts   List configured accounts and setup status
  auth       Run OAuth authentication for an account
  start      Start the MCP server (default)
  help       Show this help message

Options:
  --account <email>   Use a specific Google account

Examples:
  google-mcp setup --account user@gmail.com
  google-mcp accounts
  google-mcp auth --account user@gmail.com
  google-mcp --account user@gmail.com
`);
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const { command, account, rest } = parseArgs(process.argv.slice(2));

  switch (command) {
    case 'setup': {
      const { runSetup } = await import('./setup.js');
      const opts = parseSetupOpts(rest, account);
      await runSetup(opts);
      break;
    }

    case 'accounts':
      await showAccounts(account);
      break;

    case 'auth': {
      const slug = resolveAccountSlug(account);
      try {
        await runAuth(slug);
        console.error('\n✅ Authentication successful!');
        process.exit(0);
      } catch (err: any) {
        console.error('\n❌ Authentication failed:', err.message);
        process.exit(1);
      }
      break;
    }

    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;

    case 'start':
    case undefined: {
      const slug = resolveAccountSlug(account);
      startMcpServer(slug);
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
