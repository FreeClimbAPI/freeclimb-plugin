# 10. Official SDKs in the agent workflow

Status: Accepted

## Context

FreeClimb publishes generated SDKs for Node.js, Python, Java, .NET, Ruby, and PHP in separate repositories. The plugin currently documents those packages and includes Node.js and Python starter applications, while its own CLI and MCP runtime use the private `@freeclimb/core` package.

Agents need a reliable way to build user applications with the official SDK for the user's language. Coupling the plugin runtime to every generated SDK would duplicate transport behavior, weaken the existing operational boundary, and make the plugin release depend on six language ecosystems.

Generated repositories can also drift independently. Matching version numbers across languages is not a useful invariant because each package has its own release history and tag conventions.

## Decision

The plugin maintains one machine-readable SDK catalog containing each official repository, package identity, template path, release-tag convention, and OpenAPI source.

Published SDK packages are the runtime source of truth for generated user applications. Java is resolved from the exact official repository tag through JitPack because the SDK has no Maven Central artifact. Every supported SDK has a first-class template pinned to an exact tested release and a small language-specific reference. Agents load only the selected language reference and adapt its template instead of placing all six SDK idioms in the default context.

The plugin also maintains a curated content index for official quickstarts and tutorials. Each entry records its language, use case, repository URL, source path, and immutable Git revision. Agents retrieve one matching source only when the tested template and plugin skills do not cover the requested workflow. Indexed examples are references to adapt, not replacements for the templates, and their repositories are never cloned or vendored into generated projects.

The plugin does not vendor generated SDK source. `@freeclimb/core` remains the runtime dependency for the CLI and MCP server. MCP remains read-only, and billable or account-changing agent operations continue through the CLI with dry-run and confirmation requirements.

Drift is detected through three independent signals:

1. Package release checks compare every template's tested version with the latest published release.
2. Normalized OpenAPI fingerprints compare the API contracts published by all six SDK repositories without treating formatting or key order as meaningful.
3. Indexed content checks verify that every pinned source path remains readable and report when its repository advances beyond the reviewed revision.

Dependency update automation proposes package upgrades. Each upgrade must pass the template's non-billable contract suite before merge. OpenAPI divergence is reported separately because an unreleased contract change cannot be repaired by changing a package pin.

## Consequences

Agents gain current, language-specific SDK examples and reproducible application baselines without expanding the plugin's account permissions.

The repository owns six small templates and their contract tests. CI therefore requires the corresponding language toolchains.

SDK releases can remain independently versioned. The SDK catalog validates coverage and repository identity, while template manifests remain the single source for tested package versions. Quickstarts and tutorials remain independently maintained upstream without making GitHub a runtime dependency for normal generation.

Branch protection must require plugin validation, the workspace test suite, and the SDK template matrix. A newer release or divergent OpenAPI contract becomes visible through scheduled automation rather than silently changing generated applications.
