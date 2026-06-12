# Publishing the CLI (optional / future)

Today the plugin installs the CLI from bundled source via `/freeclimb-setup` (see [ADR 0002](adr/0002-bundled-build-onboarding.md)). Publishing the CLI to npm is optional and removes the self-location and build-toolchain risks of the bundled-build approach.

## Goal

Publish the `cli/` package so onboarding can use a global install instead of building from source.

## Prerequisites

- npm publish rights to the `freeclimb-cli` package (currently owned under `dev@freeclimb.com`). If those rights cannot be obtained, publish under a scoped name you control (for example `@freeclimbapi/cli`).

## Steps

1. In `cli/package.json`, confirm `name`, `version`, `bin` (`freeclimb`), and the `files` whitelist (`/bin`, `/lib`, `/oclif.manifest.json`, `/skills`).
2. Build and test:

   ```bash
   cd cli
   npm install
   npm run prepack
   npm test
   ```

3. Publish:

   ```bash
   npm publish
   ```

4. Smoke test on a clean machine:

   ```bash
   npm i -g freeclimb-cli
   freeclimb login
   freeclimb mcp:start
   ```

## Flip the plugin wiring

Once published, update the onboarding to prefer the published package while keeping build+link as a fallback:

- `skills/freeclimb-onboarding/SKILL.md`: prefer `npm i -g freeclimb-cli` (or the scoped name) over building from `cli/`.
- If a scoped name is used, update `.mcp.json` only if the binary name changes (the `bin` stays `freeclimb`, so `command: "freeclimb"` is unaffected).

The `.mcp.json` `command: "freeclimb"` already works with a global install, so no change is needed there when keeping the `freeclimb` bin name.
