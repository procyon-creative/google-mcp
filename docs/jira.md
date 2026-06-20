# Jira Integration

## Project
- **Key:** `GMCP`
- **Board:** https://procyoncreative.atlassian.net/jira/software/c/projects/GMCP/boards
- **REST API base:** https://procyoncreative.atlassian.net/rest/api/3

## MCP Server
- **Server:** `procyon_atlassian` (Streamable HTTP) — registered in `.mcp.json`
- **URL:** https://mcp.atlassian.com/v1/mcp
- Tools are available once the project MCP config is loaded and authenticated in the client.

## Auth
- **Email:** `nick.galvez@procyoncreative.com` (set as the `JIRA_EMAIL` repo secret)
- **API token:** generate at https://id.atlassian.com/manage-profile/security/api-tokens
- The token is required as the `JIRA_API_TOKEN` repo secret. Do not commit it.

## Workflow Rules
- **No work without a ticket.** Every branch should reference a `GMCP-NNN` Jira ticket.
- **Branch name format:** `GMCP-NNN-short-description` (for example `GMCP-42-add-login-form`).
- **Ticket requirements:** add an estimate and acceptance criteria, including **Use Red/Green TDD**.
- **PR opens → ticket moves to QA.** Handled by `.github/workflows/jira.yml` when a matching ticket exists.
- **PR merges → ticket moves to Done.** Same workflow.

## CI Workflow
The `.github/workflows/jira.yml` action:
1. Syncs ticket metadata onto the PR on every PR push.
2. Attempts to transition to `QA` when a PR is opened or reopened.
3. Attempts to transition to `Done` when a PR is merged.

## Quick Reference
- Create / edit a ticket: Jira UI or Atlassian MCP
- Repo secrets expected by the workflow: `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`

## Notes
- The placeholder project key `GMCP` is wired into the repo config now.
- Actual project creation via the automated Jira project creator timed out twice, so verify the Jira project exists before relying on transitions/comments.
