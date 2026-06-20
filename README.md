# google-mcp

Multi-account wrapper for the [Google Drive MCP Server](https://www.npmjs.com/package/@piotr-agier/google-drive-mcp). Adds account management, an interactive setup wizard, and Claude-assisted browser automation.

## What This Does

- **Multi-account support** — run separate MCP server instances for different Google accounts, each with isolated credentials and tokens
- **Setup wizard** — walks through GCP project creation, API enablement, and OAuth configuration step by step
- **Claude-assisted setup** — automates browser steps using Claude Code + Chrome extension
- **Account management** — list accounts, track setup progress, resume from failures

The actual MCP tools (Drive, Docs, Sheets, Slides, Calendar) come from [`@piotr-agier/google-drive-mcp`](https://github.com/piotr-agier/google-drive-mcp) — this project wraps it.

## Quick Start

```bash
# Run the setup wizard (no install needed)
npx -y @procyon-creative/google-mcp setup

# Add to Claude Code
claude mcp add -s user google-user-example -- npx -y @procyon-creative/google-mcp --account user@example.com
```

Prefer a pinned global install? See [Install](#install) below.

## Install

Pick whichever fits your workflow — every example below works with all three:

```bash
# 1. No install (always latest)
npx -y @procyon-creative/google-mcp <command>

# 2. Global install (pinned until you upgrade)
npm install -g @procyon-creative/google-mcp
google-mcp <command>

# 3. From a clone (for development)
git clone https://github.com/procyon-creative/google-mcp.git
cd google-mcp && npm install && npm run build
node dist/index.js <command>
```

The rest of this README uses `google-mcp` for brevity. Substitute `npx -y @procyon-creative/google-mcp` or `node dist/index.js` as needed.

## Setup

### Interactive Wizard

```bash
google-mcp setup
```

The wizard walks through:
1. Account email (for credential namespacing)
2. Mode selection (manual or Claude-assisted)
3. GCP project creation
4. API enablement (Drive, Docs, Sheets, Slides, Calendar)
5. OAuth consent screen (branding, audience, scopes)
6. OAuth credentials download
7. Authentication

### Claude-Assisted Mode

Select "Claude-assisted" in the wizard to automate the browser steps. Requires:
- [Claude Code CLI](https://claude.ai/code) installed
- [Chrome extension](https://claude.ai/chrome) connected

The wizard invokes `claude -p --chrome` for each browser step.

### CLI Flags

Pre-fill answers to skip prompts:

```bash
google-mcp setup --account user@gmail.com --project-id my-project --mode claude
google-mcp setup --account user@gmail.com --step audience --mode claude
google-mcp setup --credentials ~/Downloads/client_secret*.json --no-auth
```

Available flags: `--account`, `--project-id`, `--credentials`, `--mode` (manual/claude), `--step`, `--gcloud-account`, `--skip-browser`, `--skip-gcloud`, `--create-project`, `--run-auth`, `--no-auth`

## Multiple Accounts

Each account gets its own credential directory:

```
~/.config/google-drive-mcp/accounts/
  user-at-example-com/
    gcp-oauth.keys.json
    tokens.json
  jane-doe-at-gmail-com/
    gcp-oauth.keys.json
    tokens.json
```

### List Accounts

```bash
google-mcp accounts
google-mcp accounts --account jane.doe@gmail.com
```

Shows setup progress per account:
```
jane.doe@gmail.com
  mcp name: google-jane-doe-gmail
  project:  my-gcp-project
  setup:   enable-apis ✓  branding ✓  audience ✓  scopes ✓  credentials ✓  auth ·
```

### Add to Claude Code

Each account becomes a separate MCP server with a unique name:

```bash
claude mcp add -s user google-user-example \
  -- npx -y @procyon-creative/google-mcp --account user@example.com

claude mcp add -s user google-jane-doe-gmail \
  -- npx -y @procyon-creative/google-mcp --account jane.doe@gmail.com
```

If you globally installed, swap `npx -y @procyon-creative/google-mcp` for `google-mcp`. From a checkout, use `node /absolute/path/to/dist/index.js`.

### Authenticate

```bash
google-mcp auth --account jane.doe@gmail.com
```

## Available Tools

See the [upstream documentation](https://github.com/piotr-agier/google-drive-mcp#available-tools) for the full list of MCP tools (search, file management, Docs editing, Sheets, Slides, Calendar, etc.).

## Development

```bash
npm run build          # typecheck + bundle
npm run test:unit      # run tests
npm run watch          # esbuild watch mode
npm run lint           # tsc + eslint
```

## Linting

Pre-commit hooks run automatically on `git commit` and lint only staged
`src/**/*.ts` files.

To run the staged-file linter manually:

```bash
npx lint-staged
```

To run the full repo lint/test checks:

```bash
npm run lint
npm test
```

### Architecture

This is a thin CLI wrapper (4 source files, ~1000 lines):

- `src/index.ts` — CLI dispatcher. For `start`, spawns `npx @piotr-agier/google-drive-mcp` with account-specific env vars.
- `src/accounts.ts` — Account registry, credential paths, setup step tracking
- `src/auth.ts` — OAuth flow via `@google-cloud/local-auth`
- `src/setup.ts` — Interactive setup wizard with step-by-step browser automation
