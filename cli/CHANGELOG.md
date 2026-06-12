# FreeClimb CLI Changelog

All notable changes to this project will be documented in this file.

The format of this changelog is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<a name="0.6.0"></a>

## [0.6.0] - 2025-03-17

### Added

- **Agent-DX overhaul**: Structured JSON output with `--json`, `--fields`, `--dry-run` flags for AI agent compatibility
- **MCP server**: 18+ tools exposed via Model Context Protocol using the official `@modelcontextprotocol/sdk`, with resources and prompts
- **Schema introspection**: `freeclimb describe <command>` shows flags, args, and schema for any command
- **`freeclimb update` command**: Check for newer CLI versions on npm with `--json` support
- **Startup version check hook**: Non-blocking 24h-cached check prints update notice on CLI launch
- **`freeclimb diagnose` command**: Connectivity, authentication, and account status diagnostics
- **Custom terminal UI**: Branded banner, themed tables with Unicode borders, spinners, status badges
- **CLAUDE.md, CONTEXT.md, AGENTS.md**: AI agent documentation for Claude Code, Cursor, and Copilot
- **Claude Code skills**: `.claude/skills/` with specialized prompts for CLI development
- **API client resilience**: Exponential backoff with jitter for transient errors (429, 5xx), request ID tracking via `X-Request-Id`

### Changed

- **oclif v4 migration**: Migrated all commands and tests from oclif v1 to v4 API
- **Dependency modernization**: TypeScript 5, `@napi-rs/keyring` (replaces keytar), `@inquirer/prompts` (replaces inquirer)
- **CI/CD modernized**: GitHub Actions updated to `actions/checkout@v4`, `actions/setup-node@v4`, Node 18/20/22 matrix
- **MCP server rewritten**: Migrated from hand-rolled JSON-RPC to official `@modelcontextprotocol/sdk`
- **Husky v9**: Updated `prepare` script from `husky install` to `husky`
- **Registered autocomplete plugin**: `@oclif/plugin-autocomplete` now in oclif plugins array
- **CLI version**: MCP server reads version dynamically from package.json instead of hardcoded value

### Fixed

- **`strip-ansi` dependency**: Replaced ESM-only import with inline ANSI regex for CommonJS compatibility
- **Typo**: "Reponse" corrected to "Response" in error messages
- **Stale branches**: Cleaned up 50+ stale local/remote branches from 2020-2023

<a name="0.5.5"></a>

## [0.5.5] - 2022-04-27

### Changed

- removed node v12 from capabilities set lowest version to 14.15.0

<a name="0.5.4"></a>

## [0.5.4] - 2022-04-26

### Changed

- plugin-help => help

<a name="0.5.3"></a>

## [0.5.3] - 2022-04-26

### Changed

- Added chalk explicitly as a dependency

<a name="0.5.2"></a>

## [0.5.2] - 2022-03-10

### Changed

- removed node version 12 from testing

<a name="0.5.1"></a>

## [0.5.1] - 2022-03-10

### Changed

- node version of deployment
- for registry use https not http

<a name="0.5.0"></a>

## [0.5.0] - 2022-03-09

### Added

- active param to list calls

<a name="0.4.1"></a>

## [0.4.1] - 2021-04-07

### Added

- npm deploy additional query params

<a name="0.4.0"></a>

## [0.4.0] - 2021-04-07

### Added

- query params to incoming numbers
- query params to available numbers

<a name="0.3.0"></a>

## [0.3.0] - 2021-04-07

### Added

- callConnectUrl flag to command calls:make

### Changed

- Descriptions of commands as well as flags and arguments

### Fixed

- Incorrect instances of --next
- Incorrect instances of --acountId as query parameters

<a name="0.2.2"></a>

## [0.2.2] - 2021-04-14

### Changed

- Deployments are now built on MacOS instead of Ubuntu

### Fixed

- Homebrew no suitable image error when running any command that required keytar

<a name="0.2.1"></a>

## [0.2.1] - 2021-04-07

### Fixed

- AWS and Git bugs preventing deployment to Homebrew

<a name="0.2.0"></a>

## [0.2.0] - 2021-04-06

### Added

- Color to the CLI
- Quotes around responses so that trailing spaces can be seen by the user
- Automated deployment scripts

### Changed

- Now using GitHub Actions instead of Travis CI

### Fixed

- Bug where if tsbuildinfo was present, then JS code would not get generated for NPM releases
- Uncaught error from SMS responses
- Typo in spelling of test outline

<a name="0.1.2"></a>

## [0.1.2] - 2020-12-04

### Fixed

- Incorrect license link
- TypeScript not being emitted

<a name="0.1.0"></a>

## [0.1.0] - 2020-11-18

### Added

- Add initial CLI code
- Add [README.md](https://github.com/FreeClimbAPI/freeclimb-cli) and LICENSE to github
- [CLI Quickstart Documentation](https://docs.freeclimb.com/docs/freeclimb-cli-quickstart)
