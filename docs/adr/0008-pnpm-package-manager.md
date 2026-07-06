# 8. pnpm as the monorepo package manager

Status: Accepted

> npm workspace and `package-lock.json` details in
> [ADR 0001](0001-monorepo-plugin-and-cli.md),
> [ADR 0004](0004-internal-workspace-and-standalone-mcp.md), and
> [ADR 0006](0006-blocking-ci-and-workspace-test-coverage.md) are superseded by
> this ADR for package-manager tooling. Those decisions remain accepted for
> repository structure, MCP distribution, and CI coverage policy.

## Context

The monorepo used npm workspaces with a committed root `package-lock.json`. npm hoists dependencies to the root `node_modules`, which broke the CLI test runner: Mocha could not reliably resolve the `tsx` TypeScript loader unless the test script pinned a workspace-local path (`./node_modules/tsx/dist/loader.mjs`). That workaround landed in commit `50dd596`. A stale `cli/pnpm-lock.yaml` also suggested an earlier partial pnpm experiment that was never wired at the repo root.

pnpm gives each workspace package its own symlinked `node_modules` with direct dependencies in `.bin`, which restores predictable loader resolution without path hacks. Corepack ships with Node and can activate the pinned pnpm version from `packageManager` in the root `package.json`, so contributors do not need a global pnpm install.

## Decision

Adopt pnpm 11.5.3 as the sole package manager for the monorepo:

- Add `pnpm-workspace.yaml` listing `core`, `cli`, and `mcp`.
- Remove npm `workspaces` from the root `package.json`; set `"packageManager": "pnpm@11.5.3"`.
- Replace the root lockfile with `pnpm-lock.yaml` and use `pnpm install --frozen-lockfile` in CI.
- Link internal packages with the `workspace:*` protocol (`@freeclimb/core`, `@freeclimb/mcp`).
- Rewrite root scripts to use `pnpm --filter`, `pnpm -r`, and `pnpm build`/`pnpm test`/`pnpm lint`.
- CI installs via `pnpm/action-setup@v4` (reads `packageManager`) and caches with `cache: pnpm`.
- Onboarding docs use `corepack enable && corepack prepare --activate` before `pnpm install` / `pnpm run setup`.
- Allow native build scripts needed by the CLI through `allowBuilds` in `pnpm-workspace.yaml` (`@napi-rs/keyring`, `@ngrok/ngrok`, `esbuild`, `unrs-resolver`).

## Consequences

- Contributors and CI run the same install graph; hoisting surprises from npm workspaces go away.
- The CLI Mocha suite sets `NODE_OPTIONS='--import tsx'` so Node resolves the tsx loader as a package under pnpm's symlink layout (Mocha treats `--import tsx` as a relative path).
- `@json-render/core` is pinned via `overrides` so TypeScript declaration emit does not see duplicate nested copies under `@json-render/ink`.
- Internal workspace dependencies must declare `workspace:*`; publishing the CLI later will need a prepublish step to rewrite those ranges.
- ADR 0004’s committed `package-lock.json` and `npm run setup` wording are historical; use `pnpm-lock.yaml` and `pnpm run setup` instead.
- ADR 0006’s `npm test --workspaces --if-present` becomes `pnpm -r --if-present test`; the blocking CI intent is unchanged.

## Alternatives considered

- Stay on npm workspaces and keep the tsx loader path hack: rejected; fragile across install layouts and already caused CI maintenance cost.
- Use npm with `npx`/`corepack` only at the root without changing package manager: rejected; does not fix hoisting or duplicate lockfiles.
- Yarn Berry: rejected; team already had pnpm artifacts in `cli/` and pnpm matches the desired strict per-package `node_modules` layout.
