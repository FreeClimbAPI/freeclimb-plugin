# 1. Monorepo for plugin and CLI

Status: Accepted

## Context

The Cursor plugin depends on the FreeClimb CLI for its MCP server and local dev tooling. The CLI previously lived in a separate fork (`github.com/jbohnevail/freeclimb-cli`), and the canonical published package (`freeclimb-cli`) is controlled by another team and lags behind. The plugin needs a single, trustworthy source for the CLI it runs.

## Decision

Consolidate the plugin and the CLI into one repository, `FreeClimbAPI/freeclimb-plugin`, with the CLI source under `cli/`. The plugin lives at the repo root so Cursor discovers `.cursor-plugin/plugin.json` and components in their default locations. The repo starts with fresh history (no preserved fork history). Release/dev-only infrastructure (`benchmarks/`, `demos/`, `deployment-scripts/`, `release-dockerfiles/`, `docker-utility-scripts/`, `generation/`, `.claude/`) is dropped. CI is defined once at the repo root and targets `cli/`; nested `cli/.github` would be inert.

## Consequences

- One source of truth: the CLI the plugin runs is the CLI in this repo.
- Cursor syncs both plugin and CLI source to team members in one step.
- Two package contexts coexist (root plugin, `cli/` Node package), so tooling (CI, dependabot) must be path-aware.
- The superseded `FreeClimbAPI/freeclimb-cli` is simply no longer a dependency; it is not under our control to archive.

## Alternatives considered

- Keep the CLI in a separate repo and depend on a published npm package: blocked by lack of publish control and version lag.
- Preserve fork history via subtree: rejected in favor of a clean public repo.
