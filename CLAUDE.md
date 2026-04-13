# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

A multi-account wrapper around [`@piotr-agier/google-drive-mcp`](https://www.npmjs.com/package/@piotr-agier/google-drive-mcp). It does NOT contain the MCP server or Google API tools — those come from the upstream package as an npm dependency.

This project adds:
- **Multi-account credential management** — per-account credential/token storage under `~/.config/google-drive-mcp/accounts/{slug}/`
- **Interactive setup wizard** — GCP project creation, API enablement, OAuth consent, with manual and Claude-assisted modes
- **CLI wrapper** — spawns the upstream MCP server with the right env vars for the selected account

## Commands

```bash
npm run build          # typecheck (tsc --noEmit) + bundle (esbuild → dist/index.js)
npm run typecheck      # type checking only
npm run watch          # esbuild watch mode

npm run test:unit      # unit tests (accounts + setup)
npm run test:build     # compile tests to .tmp-test/

# Run a single test file after test:build:
node --test .tmp-test/test/accounts.test.js

npm run lint           # tsc + eslint

npm run setup          # interactive setup wizard
npm run auth           # run OAuth flow
```

### CLI usage

```bash
node dist/index.js setup --account user@gmail.com     # setup wizard
node dist/index.js accounts                            # list accounts + status
node dist/index.js auth --account user@gmail.com       # OAuth flow
node dist/index.js --account user@gmail.com            # start MCP server
```

## Architecture

```
src/
  index.ts      CLI wrapper — dispatches to setup/accounts/auth, or spawns upstream MCP
  accounts.ts   Account registry, slugs, paths, setup step tracking
  auth.ts       OAuth flow using @google-cloud/local-auth
  setup.ts      Interactive setup wizard (manual + Claude-assisted modes)
```

### How the MCP server runs

The `start` command (default) spawns `npx @piotr-agier/google-drive-mcp` as a subprocess with account-specific env vars:

```
GOOGLE_DRIVE_OAUTH_CREDENTIALS → ~/.config/.../accounts/{slug}/gcp-oauth.keys.json
GOOGLE_DRIVE_MCP_TOKEN_PATH    → ~/.config/.../accounts/{slug}/tokens.json
```

stdin/stdout are piped through so MCP clients talk to the upstream server transparently.

### Account storage

```
~/.config/google-drive-mcp/
  accounts.json                          # registry: email → slug, default, projectId, step status
  accounts/
    user-at-example-com/
      gcp-oauth.keys.json
      tokens.json
    jane-doe-at-gmail-com/
      gcp-oauth.keys.json
      tokens.json
```

### Setup wizard steps

Each step is defined once as data (`buildSetupSteps`). The orchestrator runs one loop — manual mode shows instructions, Claude-assisted mode invokes `claude -p --chrome`. State is saved per step per account.

Steps: `enable-apis`, `branding`, `audience`, `scopes`, `credentials`, `auth`

## Testing

Uses Node.js built-in `node:test` + `node:assert/strict`. No test framework.

- `test/accounts.test.ts` — account registry, slugs, paths, step tracking
- `test/setup.test.ts` — setup steps, URL builders, credential validation

### TDD workflow

Use red/green TDD:
1. Write a failing test first
2. Implement the minimum code to make it pass
3. Refactor

## Code Style

- `@typescript-eslint/no-explicit-any`: OFF
- `@typescript-eslint/no-floating-promises`: ERROR

### Principles

- **DRY** — Don't Repeat Yourself. If logic exists in two places, extract it. If the upstream package does something, don't reimplement it.
- **SLAP** — Single Level of Abstraction Principle. Each function should operate at one level of abstraction. Don't mix "what to do" with "how to interact" in the same function. The setup wizard demonstrates this: steps are data, execution mode is separate.
- **TDD** — Tests drive the design. Step functions accept optional params so they can be tested without interactive prompts.
