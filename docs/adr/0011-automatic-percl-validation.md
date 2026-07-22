# 11. Automatic PerCL validation through hooks and CLI

Status: Accepted

## Context

PerCL generation and validation were exposed as MCP tools, while agent guidance also directed builders toward official SDK models. This duplicated the workflow and made MCP a dependency for a deterministic local check.

The existing `afterFileEdit` hook emitted unsupported response fields, so validation failures did not reach the active agent. It also validated only standalone `.percl.json` files and depended on a built core module.

## Decision

Keep PerCL validation rules in `@freeclimb/core`.

- Official SDK models and the PerCL skill are the authoring interface.
- A `postToolUse` hook validates agent-written `.percl.json` files and returns supported `additional_context`.
- A bounded `stop` hook requests another repair turn while tracked PerCL files remain invalid.
- `freeclimb percl:validate <file|-> --json` exposes the same validator for runtime webhook output, humans, scripts, and CI without authentication.
- `/freeclimb-test-flow` validates serialized SDK output and exercises dynamic webhook routes.
- Remove `generate_percl` and `validate_percl` from MCP.

## Consequences

- Automatic validation no longer depends on MCP or account authentication.
- MCP remains focused on account inspection and read-only dashboards.
- Static hooks cover only `.percl.json`; dynamic SDK-built responses require route tests or CLI validation of captured output.
- Core must be built before the hook can validate. When unavailable, the hook reports the setup requirement without entering a repair loop.
- The repair loop is bounded to prevent invalid output or validator failures from causing infinite agent turns.
