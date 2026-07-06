# 9. A single core REST resources seam

Status: Accepted

## Context

Phase 1 gave `@freeclimb/core` a single authenticated/account-scoped HTTP seam (`apiRequest`/`publicRequest` in `core/src/http.ts`), but the FreeClimb REST paths, query/body params, and response handling built on top of it still leaked across every consumer:

- `mcp/src/server.ts` hand-built paths (`/Calls`, `/Messages`, `/Logs`, `/IncomingPhoneNumbers`, `/AvailablePhoneNumbers`, `/Applications`, `/Recordings`, `/Conferences`, `/Queues`, the account root) and its own param assembly for every tool handler, plus a second copy of the same paths in the `ReadResourceRequestSchema` handler.
- `cli/src/dashboard/data.ts` kept a parallel `DATA_SOURCES` map with its own fetchers for the same nine resources, including a bespoke GET-vs-POST branch for `/Logs` depending on whether a PQL filter was present.
- `cli/src/commands/status.ts` and `cli/src/dev/app-manager.ts`/`number-manager.ts` each re-implemented `GET /Applications/{id}` and `GET /IncomingPhoneNumbers/{id}` reads with their own response-field extraction.
- Resource-ID validation (`validateResourceId`, `validatePhoneNumber`, `rejectControlChars`) was applied ad hoc at each call site rather than once at the point where an ID enters a path.

Any change to a FreeClimb path, param name, or response envelope had to be hunted down in four or more places, and there was no single test surface covering path construction.

## Decision

Add one core module, `core/src/resources.ts` (exported from `core/src/index.ts`), that owns every FreeClimb REST resource path, param shape, and response envelope on top of `apiRequest`:

- Typed per-resource read functions are the primary interface: `getAccount`, `listCalls`/`getCall`, `listMessages`/`getMessage`, `listIncomingNumbers`/`getIncomingNumber`, `searchAvailableNumbers`, `listApplications`/`getApplication`, `listLogs`/`filterLogs`, `listRecordings`, `listConferences`, `listQueues`. Params get lightweight interfaces (`CallListParams`, `MessageListParams`, `AvailableNumberSearchParams`, `LogListParams`, `RecordingListParams`, `ConferenceListParams`); list responses are typed as a generic `FreeClimbPage<T>` envelope, since callers largely pass the payload through rather than modeling every field.
- A derived string-keyed `readResources` registry (`Record<string, (params?) => Promise<unknown>>`) is built from the same typed functions, keyed by the exact dashboard source names (`calls`, `sms`, `queues`, `conferences`, `account`, `logs`, `numbers`, `applications`, `recordings`). It preserves the `/Logs` GET-vs-POST branch (GET with `maxItems` by default, POST with `{ pql, maxItems }` when a PQL filter is present) as a single implementation instead of two. Because it only wraps the read functions, it is structurally read-only, reinforcing ADR 0005 at the type level rather than by convention.
- `getCall`, `getMessage`, `getIncomingNumber`, `getApplication`, and the optional `callId` on `listRecordings` call `validateResourceId` internally, so callers no longer validate IDs themselves before building a path.
- `mcp/src/server.ts`, `cli/src/dashboard/data.ts`, `cli/src/commands/status.ts`, and `cli/src/dev/app-manager.ts`/`number-manager.ts` now call these functions/registry instead of building paths by hand. Mutating calls (`createTempApp`, `updateAppUrls`, `restoreAppUrls`, `deleteTempApp`, `assignNumber`, `restoreNumber`) are out of scope for this read-only seam and keep using `createApiAxios` directly. The 61 generated oclif command files are untouched (Phase 4).

## Consequences

- A FreeClimb path, param name, or response shape now changes in exactly one place; `core/test/resources.test.mjs` is the single test surface for path/param construction, the `/Logs` GET-vs-POST switch, ID-validation rejection, and registry-to-function dispatch, using the same local `node:http` server pattern as `core/test/http.test.mjs`.
- Adding validation inside `get*` functions is a small behavior change at the margins: `app-manager.ts`'s `getAppUrls` and `number-manager.ts`'s `getNumber` now reject malformed IDs before making a request instead of only after the API returns an error, and the dashboard's `calls`/`sms` sources now validate `to`/`from` phone numbers the same way the MCP tools always did.
- `cli/src/dashboard/data.ts`'s `DashboardDataManager` no longer shares one `axios` client across a poll tick's concurrent fetches; each `readResources` call resolves its own client via `apiRequest`. The pre-flight `createApiAxios()` check is kept so the existing `"auth"` vs `"fetch"` error bucketing for dashboard rendering is unaffected in the common case.
- The MCP surface's read-only property is now structural: every MCP tool handler calls a `readResources`/typed-function seam that only performs GET/POST reads, rather than relying on reviewers to notice a stray mutating call in `mcp/src/server.ts`.

## Alternatives considered

- Keep per-consumer fetchers but share only param-building helpers: rejected; it still leaves N copies of response-shape handling and doesn't give a single test surface.
- Model every FreeClimb resource as a full DTO instead of a generic `FreeClimbPage<Record<string, unknown>>`: rejected as premature; most callers pass the payload straight to MCP/dashboard consumers that already know the shape (`mcp/src/ui.ts`), so full modeling would add maintenance cost without a corresponding safety win.
- Fold this into the Phase 3 MCP runtime collapse instead of landing it separately: rejected; the resource seam is valuable to the CLI (`status`, dashboard, dev tooling) independent of any MCP restructuring, and landing it first makes Phase 3 a smaller, lower-risk diff.
