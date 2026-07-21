---
name: conferences-queues-recordings
description: Design FreeClimb conference, queue, and recording workflows - lifecycle, PerCL commands, and privacy handling.
---

# Conferences, Queues & Recordings

Use this skill when a request involves multi-party calls, holding callers for an agent, or capturing audio (call center transfers, coaching/whisper setups, on-hold experiences, compliance recordings).

Guardrails: follow `rules/freeclimb.mdc` (canonical).

For exact PerCL command syntax and parameters, use the `percl-call-control` skill and `generate_percl`/`validate_percl` MCP tools rather than duplicating the reference here.

## Conferences

### Lifecycle

```
empty → populated → inProgress → terminated
```

- `empty`: created, no participants yet.
- `populated`: has participants but hasn't been explicitly started.
- `inProgress`: active, participants can talk/listen per their settings.
- `terminated`: ended.

### PerCL Commands

| Command | Use |
|---------|-----|
| `CreateConference` | Create a new conference and add the current call as the first participant |
| `AddToConference` | Add the current call to an existing conference, with `talk`/`listen` flags |
| `SetTalk` / `SetListen` | Change a participant's talk/listen permission mid-call |
| `RemoveFromConference` | Take the current call out of its conference |

### When-to-Use Patterns

- **Agent whisper / coaching**: add the supervisor with `talk: false` initially (listen-only) so they can monitor without the customer hearing them; flip `SetTalk` to `true` only when they want to break in.
- **Silent monitoring**: `listen: true, talk: false` — used for QA/training, always paired with a recorded-line disclosure (see Recordings below).
- **Three-way merge / warm transfer**: `AddToConference` both legs with `talk: true, listen: true` once the agent has confirmed the transfer is wanted.
- **Conference vs plain `OutDial` transfer**: use a conference when more than two parties may need to be present at once (warm transfer, supervisor join) or when a call may need to survive one leg dropping and rejoining. Use direct `OutDial` for a simple one-to-one transfer — it's simpler and needs no cleanup.

## Queues

### Strategy

- `Enqueue` places the current call in a queue with a `waitUrl` (PerCL returned periodically for the hold experience — hold music, position announcements, a callback offer) and an `actionUrl` (called once the call is dequeued).
- `Dequeue` is typically issued from agent-side webhook logic once an agent becomes available, moving the held call into the active flow (often straight into a conference or `OutDial` with the agent).
- Monitor queue health with `list_queues` (MCP) — watch for queues that stay non-empty for long stretches, which signals understaffing or a broken dequeue path rather than a code bug.

### Queues vs Direct `OutDial` Transfer

Use a queue when the number of available agents is unpredictable or zero at times — the caller needs somewhere to wait. Use a direct `OutDial` transfer when a specific destination is always expected to be reachable (e.g. routing straight to voicemail or a fixed forwarding number) and no hold experience is needed.

## Recordings

### RecordUtterance vs StartRecordCall

| Command | Captures | Typical use |
|---------|----------|--------------|
| `RecordUtterance` | One caller's speech until silence/timeout/keypress | Voicemail, single-response capture (e.g. "say your account number") |
| `StartRecordCall` | The entire call, both sides, until it ends | Full-call compliance/QA recording |

### Retrieving Recordings

- List and inspect metadata with `list_recordings` (MCP), optionally filtered by `callId`.
- Download or stream the audio file with the CLI: `freeclimb recordings:download RECORDINGID` or `freeclimb recordings:stream RECORDINGID` (both require authentication, same as any API call).
- Delete recordings no longer needed with `freeclimb recordings:delete RECORDINGID` (irreversible — deletes both the audio and the metadata).

### Consent & Announcements

As a practice, announce recording before it starts — a line like "This call may be recorded for quality and training purposes" before `StartRecordCall`. Consent requirements for recording calls vary by jurisdiction (some require all-party consent, others one-party); this skill doesn't attempt to enumerate that law. Treat an explicit spoken disclosure as the safe default and flag jurisdiction-specific legal questions to the user rather than asserting a rule.

### Privacy & Retention

Recordings contain PII and often sensitive conversation content:

- Don't download recordings into shared or public workspaces casually — treat a downloaded file like any other PII artifact.
- Delete test/demo recordings after use with `freeclimb recordings:delete` rather than leaving them on the account indefinitely.
- Avoid printing recording URLs or contents into logs, tickets, or chat where they'd persist beyond their purpose.
