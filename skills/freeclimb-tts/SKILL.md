---
name: freeclimb-tts
description: Use when choosing a Say TTS engine, voice, SSML, or deciding between synthesized speech and pre-recorded Play audio.
---

# FreeClimb TTS

Use this skill when tuning how PerCL `Say` sounds—or when TTS is the wrong tool.

Guardrails: follow `rules/freeclimb.mdc` (canonical). Validate PerCL with `validate_percl` before live calls.

Engine details: https://docs.freeclimb.com/reference/say and https://docs.freeclimb.com/docs/freeclimb-tts

## Core Workflow

1. Pick an engine tier matching fidelity, language, and content type needs.
2. Set `text` and engine-specific parameters on `Say`.
3. Use SSML only on engines that support it (set the correct content type / `textType`).
4. Prefer **Play** when audio is fixed, branded, or must be identical every time.

```json
[{
  "Say": {
    "text": "Welcome to FreeClimb.",
    "engine": {
      "name": "freeclimb.neural",
      "parameters": { "voice": "Eva", "textType": "text", "language": "en-US" }
    }
  }
}]
```

## Engine Comparison

| Engine | `engine.name` | Text limit | SSML | Voice selection |
|--------|---------------|------------|------|-----------------|
| Classic (default) | omit | 4 KB | No | `language` only (default `en-US`) |
| Standard | `freeclimb.standard` | 4 KB | UCMA SSML (`Content-Type`: `application/ssml+xml`) | `Voice` + `Culture` (25 voices) |
| Neural | `freeclimb.neural` | **256 characters** | Full Coqui SSML (`textType`: `ssml`) | `voice` (default `Eva`), `language` |
| ElevenLabs | `ElevenLabs` | 4 KB | Per ElevenLabs stream API | `voice_id` (required), `model_id`, etc. |

Neural prosody: `<prosody rate volume pitch>` and contour shaping per docs.

ElevenLabs: best for conversational speech; **not** recommended for digit-by-digit readback (phone numbers, account numbers).

## SSML Support Matrix

| Feature | Classic | Standard | Neural | ElevenLabs |
|---------|---------|----------|--------|------------|
| Plain text | Yes | Yes (`text/plain`) | Yes (`textType`: `text`) | Yes |
| SSML | No | Limited UCMA | Full Coqui | See ElevenLabs docs |
| `language` top-level | Yes | No (use `Culture`) | Use `parameters.language` | Use `language_code` |

Wrap all SSML in a single root element. See neural best-practices guide for `say-as` patterns (dates, numbers).

## When to Play Instead of Say

| Use Say (TTS) | Use Play (recorded file) |
|---------------|--------------------------|
| Dynamic or personalized text | Brand IVR prompts, hold music, legal disclaimers |
| Rapid iteration without recording | Exact wording/timing required |
| Multilingual via engine voices | Studio-quality voice talent already recorded |

`Say` flushes the DTMF buffer. `Say` cannot run inside an active Conference.

## Pricing

Per-minute TTS charges vary by engine tier. Check current rates at https://www.freeclimb.com/pricing/api before scaling production prompts.

## Pitfalls

- Neural **256-character** cap—split long prompts into multiple `Say` commands or use Classic/Standard/ElevenLabs for longer text.
- Empty `text` skips the command silently.
- Set `privacyMode` on PCI/sensitive prompts.
- ElevenLabs requires `voice_id` (and typically your ElevenLabs `api-key` in engine parameters per docs)—never commit keys to source.

## References

- https://docs.freeclimb.com/reference/say
- https://docs.freeclimb.com/docs/freeclimb-tts
- https://www.freeclimb.com/pricing/api
- https://docs.freeclimb.com/reference/play
