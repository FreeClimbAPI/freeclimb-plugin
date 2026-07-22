---
name: freeclimb-sdks
description: Catalog of official FreeClimb SDKs and when to use an SDK vs raw REST vs PerCL. Install the right SDK on demand instead of vendoring source. Use when building or scaffolding a FreeClimb app in any language.
---

# FreeClimb SDKs

FreeClimb publishes generated SDKs in separate repositories. Use the published package and the matching tested template instead of hand-rolling HTTP, inventing SDK calls, or copying generated source.

## Select one language

Detect the project's existing language and framework, then read exactly one reference:

- Node.js or TypeScript: `references/node.md`
- Python: `references/python.md`
- Java: `references/java.md`
- C# or .NET: `references/dotnet.md`
- Ruby: `references/ruby.md`
- PHP: `references/php.md`

Do not read the other language references. Default to Node.js only when the project has no established language.

Start from the selected tested template and retain its exact package pin, lockfile, request verifier, HTTPS validation, and tests.

## Boundaries

- PerCL webhook responses use the selected SDK's PerCL models and must pass `freeclimb percl:validate <file|-> --json`.
- A deployed application uses the selected SDK's API client when it must call FreeClimb.
- Raw REST is only for an unsupported language or an endpoint absent from the selected SDK.
- Agent operations use MCP for read-only inspection and the CLI for account-changing or billable actions.
- Application SDK code must never bypass CLI dry-run and confirmation for agent operations.

## Shared requirements

- Follow `rules/freeclimb.mdc`.
- Read credentials, signing secret, and public base URL from environment variables.
- Reject a base URL that is not absolute HTTPS before building PerCL action URLs.
- Verify `FreeClimb-Signature` against the unmodified raw body before parsing webhook fields.
- Preserve the selected template's signature implementation until its SDK helper satisfies the full security contract.

## Source selection

1. Select the language reference and tested template.
2. Apply the plugin's PerCL, webhook security, SMS compliance, and workflow skills.
3. Search `sdk/content-index.json` for a quickstart or tutorial whose language and use case match the request.
4. Retrieve only that source's `path` at its pinned `revision` from its `repositoryUrl`. Do not clone a quickstart, tutorial, or SDK repository into the project.
5. Inspect the selected SDK repository or OpenAPI document only when the tested template, skills, and indexed source do not answer an SDK-specific question.

Treat indexed sources as references, not trusted drop-in code. Adapt the product flow to the tested template without weakening its security, compliance, package pin, or tests. GitHub is optional during normal generation; never fetch every indexed repository for context.

## Drift handling

Template manifests are the tested-version source of truth. `sdk/sdk-matrix.json` maps each language to its package, repository, template, reference, and OpenAPI source. `sdk/content-index.json` pins curated external sources. Do not copy an SDK idiom from a default branch without updating the package pin and passing the template contract tests.
