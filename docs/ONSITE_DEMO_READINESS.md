# FreeClimb Onsite Demo Readiness

Date tested: July 20, 2026

## Readiness verdict

Ready for a dashboard-first internal demo after syncing the tested plugin revision.

The complete path was exercised from removed keyring credentials and deleted build artifacts through setup, browser authentication, Cursor MCP discovery, dashboard rendering, a live inbound call, and post-call verification.

## Verified

- Plugin manifest and component metadata validation pass.
- Secret scanning passes.
- Core, MCP, and CLI builds pass.
- Core, MCP, and CLI tests pass.
- Lint completes with no errors.
- The presentation site production build passes.
- The pre-build session hook points the user to `/freeclimb-setup`.
- `pnpm run setup` installs all workspaces and builds the MCP server from a clean generated state.
- The post-build session hook points the user to browser authentication.
- Browser authentication stores credentials in the OS keyring.
- Successful browser authentication exits cleanly without printing the Account ID.
- The CLI and MCP share the same authenticated keyring entry.
- Running the test suite while authenticated does not read or overwrite the real keyring entry.
- Cursor discovers all 19 FreeClimb MCP tools after restart.
- `render_dashboard` accepts the privacy-safe operations specification in the IDE.
- The terminal dashboard renders account health, active-call count, recent-call count, and filtered-error count.
- The risky CLI hook requests approval without `--dry-run`.
- The same command is allowed with `--dry-run`.
- Invalid `.percl.json` content triggers the PerCL guard.
- Filtered logs succeed with PQL after removing the unsupported `maxItems` request-body field.
- One owned number is assigned to an existing Application.
- A live inbound call changed active calls from 0 to 1.
- After completion, active calls returned to 0 and recent calls changed from 81 to 82.
- No Application update, number reassignment, number purchase, outbound call, or SMS was needed.

## Defects found and fixed

### Plugin MCP path resolved from the wrong directory

Cursor launched the configured relative argument from the user home directory and attempted to open `/Users/jbohne/mcp/lib/bin.js`.

The MCP configuration now uses:

```json
{
  "type": "stdio",
  "command": "node",
  "args": ["${CURSOR_PLUGIN_ROOT}/mcp/lib/bin.js"]
}
```

Plugin validation now rejects configurations that do not use `CURSOR_PLUGIN_ROOT`.

### Browser login exposed account metadata and stayed alive

The login command printed the Account ID after success and retained an HTTP connection long enough to keep the process alive.

The success message is now generic, the response finishes before shutdown, and remaining HTTP connections are closed.

### Authenticated developer tests could use the real keyring

Core and CLI tests could read or overwrite the production `FreeClimb` keyring service on an authenticated workstation.

Tests now use isolated keyring service names. A full suite run preserves the real authenticated account.

### Filtered log requests returned HTTP 422

The core filter sent `maxItems` in the POST body even though the API accepts only `pql`.

The request now sends only `pql` and limits returned log entries locally.

### Presentation dashboard exposed unnecessary identifiers

The calls preset includes call IDs and phone numbers.

The onsite dashboard shows only aggregate counts and account status. The deck prompt explicitly hides account IDs, phone numbers, message bodies, and log text.

## Thursday run order

1. Sync the plugin revision containing the MCP path, login, keyring-test, and filtered-log fixes.
2. From the actual installed plugin root, confirm `mcp/lib/bin.js` exists.
3. Confirm Cursor lists the FreeClimb MCP tools.
4. Open the deck directly at the dashboard demo slide with `?slide=8`.
5. Paste the privacy-safe prompt from the slide.
6. Render the in-IDE operations dashboard.
7. Call the existing assigned FreeClimb number.
8. Show active calls change during the call.
9. End the call and show recent calls increment.
10. Summarize status and reliability without projecting identifiers or raw payloads.
11. If the in-IDE renderer fails, run the privacy-safe terminal dashboard from the plugin root:

```bash
freeclimb dashboard --spec demo/onsite-operations-dashboard.json --no-live
```

12. Return to the value and roadmap slides, then use the final Q&A slide.

## Remaining presentation risks

- The current workstation has both a local FreeClimb plugin and a marketplace-cached copy. Use one intended installation for the presentation and verify its MCP process path before presenting.
- Marketplace sync does not include generated `lib/` artifacts. A newly synced revision still requires `/freeclimb-setup`.
- Initial `pnpm install` emits harmless bin-link warnings before the MCP build creates `mcp/lib/bin.js`.
- The MCP process is not automatically retried after a non-retryable startup error; restart Cursor after setup or MCP path changes.
- The in-IDE dashboard is a point-in-time snapshot. Refresh it explicitly after the inbound call; use the terminal renderer only as a fallback.
- Keep raw call, SMS, number, log, and account payloads off the projector.

## Final preflight

Run this 30 minutes before the presentation:

```bash
pnpm validate
pnpm build
pnpm test
pnpm lint
```

Then confirm:

- Cursor reports the FreeClimb MCP server as ready.
- The active MCP process points to the intended plugin installation.
- The privacy-safe dashboard renders.
- The assigned number still routes to the intended Application.
- The inbound call phone has service.
- Notifications are hidden.
- The deck opens locally without network access.
