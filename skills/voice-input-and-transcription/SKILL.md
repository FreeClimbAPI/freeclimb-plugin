---
name: voice-input-and-transcription
description: Use when building voice menus with GetSpeech or TranscribeUtterance, choosing speech vs DTMF input, or handling answering-machine detection on outbound calls.
---

# Voice Input and Transcription

Use this skill when callers should speak instead of (or in addition to) pressing keys, or when outbound calls must detect voicemail.

Guardrails: follow `rules/freeclimb.mdc` (canonical). Validate every PerCL array with the `validate_percl` MCP tool (`TranscribeUtterance` is supported).

For full PerCL syntax, use MCP resource `freeclimb://skills/freeclimb-percl-reference`.

## Core Workflow

1. Pick input mode: **GetDigits** for fixed menus; **GetSpeech** for spoken phrases; **TranscribeUtterance** for open-ended speech-to-text.
2. Return a terminal PerCL command; control resumes at its `actionUrl`.
3. Branch on webhook `reason` / `transcribeReason` / `termReason`.
4. For outbound dial campaigns, set `ifMachine` on **Make a Call** (REST) or **OutDial** (PerCL).

### GetSpeech (grammar-driven)

```json
[{
  "GetSpeech": {
    "actionUrl": "https://example.com/speech-result",
    "grammarType": "BUILTIN",
    "grammarFile": "VERSAY_YESNO",
    "prompts": [{ "Say": { "text": "Say yes or no." } }]
  }
}]
```

Custom GRXML: `grammarType` `URL`, `grammarFile` absolute HTTPS URL, optional `grammarRule`.

### TranscribeUtterance (transcription)

```json
[{
  "TranscribeUtterance": {
    "actionUrl": "https://example.com/transcribed",
    "playBeep": true,
    "record": { "maxLengthSec": 15, "saveRecording": true },
    "prompts": [{ "Say": { "text": "Describe your issue." } }]
  }
}]
```

## Built-In Grammars (15, en-US only)

Set `grammarType` to `BUILTIN` and `grammarFile` to one of:

| Name | Purpose |
|------|---------|
| `ALPHNUM6` | Six alphanumeric characters |
| `ANY_DIG` | 1–50 digits |
| `DIG1` … `DIG11` | Exactly 1–11 digits |
| `UP_TO_20_DIGIT_SEQUENCE` | 1–20 digits |
| `VERSAY_YESNO` | Yes/no variations |

`grammarRule` is ignored for built-in grammars.

## Key Parameters and Limits

| Command | Notable defaults / limits |
|---------|---------------------------|
| GetSpeech | Terminal; not supported in Conference or multi-leg calls |
| GetSpeech timeouts | `noInputTimeoutMs` 7000; `recognitionTimeoutMs` 10000 |
| GetSpeech barge-in | Nested `Say`/`Play`/`Pause` in `prompts` stop when caller speaks |
| TranscribeUtterance | Blocking/terminal; `record.maxLengthSec` min 1, max **25** |
| OutDial / Make a Call `ifMachine` | `hangup` or `redirect` (+ required `ifMachineUrl`) |
| AMD accuracy | Tone-based; not 100% reliable in all countries |

## GetDigits vs GetSpeech

| Use GetDigits when | Use GetSpeech when |
|--------------------|--------------------|
| Fixed menu (1, 2, 3) | Natural language ("billing", "sales") |
| PIN/account entry | Yes/no or digit sequences via built-ins |
| Highest reliability needed | Custom GRXML grammar available |

Hybrid IVRs often prompt with both: "Press 1 or say sales."

## Webhooks Involved

| `requestType` | Source | Key fields |
|---------------|--------|------------|
| `getSpeech` | GetSpeech `actionUrl` | `reason`, `recognitionResult`, `confidence` |
| `transcribe` | TranscribeUtterance `actionUrl` | `transcript`, `transcribeReason`, `recordingUrl` |
| `machineDetected` | OutDial `ifMachineUrl` when `ifMachine=redirect` | `machineType` (`answering machine`, `fax modem`) |

GetSpeech `reason` values: `recognition`, `noMatch`, `noInput`, `digit`, `hangup`, `error`, `recognitionTimeout`.

If `reason`/`termReason` is `hangup`, returned PerCL is not executed.

## Pitfalls

- Omit `ifMachineUrl` when `ifMachine` is `hangup`; including it rejects the command.
- `callConnectUrl` usually runs before `ifMachineUrl`; PerCL in progress may be aborted on machine detect.
- Set `privacyMode` / `privacyForLogging` on sensitive recognition or transcripts.
- Standalone `Say` has no barge-in; only nested prompts in GetSpeech/TranscribeUtterance do.

## References

- https://docs.freeclimb.com/reference/getspeech-1
- https://docs.freeclimb.com/reference/getspeech
- https://docs.freeclimb.com/reference/transcribeutterance
- https://docs.freeclimb.com/reference/transcribe
- https://docs.freeclimb.com/reference/outdial-1
- https://docs.freeclimb.com/reference/make-a-call
- https://docs.freeclimb.com/reference/machinedetected
- https://docs.freeclimb.com/docs/how-to-write-grammars
