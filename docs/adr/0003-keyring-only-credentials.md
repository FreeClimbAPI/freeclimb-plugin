# 3. Keyring-only credential handling

Status: Accepted

## Context

The plugin must let the agent operate FreeClimb without exposing the Account ID or API Key in chat, files, or plugin configuration. An earlier installed copy embedded plaintext credentials in an MCP `env` block, which is exactly the leak we want to prevent.

## Decision

Credentials live only in the OS keyring, set by the user running `freeclimb login` in their own terminal (an out-of-band, human step). The CLI and MCP server read the keyring automatically (`cli/src/credentials.ts`, service "FreeClimb"). The repo `.mcp.json` carries no `env` block, and CI enforces this via `scripts/validate-plugin.mjs`. Skills, rules, and the setup flow instruct the agent to never request, display, echo, or write credentials. Environment variables (`FREECLIMB_ACCOUNT_ID` / `FREECLIMB_API_KEY`) remain supported for CI only and must never be committed or pasted into chat.

## Consequences

- The agent never sees raw credentials; at most it sees account metadata returned by `get_account`.
- A user who has not run `freeclimb login` will see MCP auth failures; the onboarding flow and setup ordering (install, login, use) address this.
- Headless/CI usage is still possible via env vars, outside the agent.

## Alternatives considered

- Env-var-primary auth: rejected; encourages pasting secrets near the agent.
- Redacting the Account ID from `get_account` output: not adopted; the API Key is never exposed regardless, so the marginal benefit did not justify changing the CLI's MCP output.
