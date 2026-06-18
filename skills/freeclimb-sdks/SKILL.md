---
name: freeclimb-sdks
description: Catalog of official FreeClimb SDKs and when to use an SDK vs raw REST vs PerCL. Install the right SDK on demand instead of vendoring source. Use when building or scaffolding a FreeClimb app in any language.
---

# FreeClimb SDKs

FreeClimb publishes official SDKs for the most common languages. Use them as building blocks instead of hand-rolling HTTP and PerCL. This plugin does not vendor SDK source; install the SDK for the project's language on demand.

## Official SDKs

| Language | Package | Install |
| --- | --- | --- |
| Node.js / TypeScript | `@freeclimb/sdk` | `npm install @freeclimb/sdk` |
| Python | `freeclimb` | `pip install freeclimb` |
| Java | `com.freeclimb:freeclimb` | Maven/Gradle dependency on `freeclimb` |
| C# / .NET | `freeclimb` | `dotnet add package freeclimb` |
| Ruby | `freeclimb` | `gem install freeclimb` |
| PHP | `freeclimb/freeclimb` | `composer require freeclimb/freeclimb` |

Pick the SDK that matches the project you are working in. If the project is polyglot or has no clear web stack, default to Node.js (`@freeclimb/sdk`) for voice/SMS webhook apps, or Python (`freeclimb`) for AI/Python codebases. The repo ships two ready-to-run starters under `templates/` (`node-express`, `python-flask`).

## SDK vs REST vs PerCL

These are three different jobs; most apps use all three.

- PerCL (webhook responses): the JSON your server returns when FreeClimb POSTs a call/SMS event. Use the SDK's PerCL builders (`PerclScript`, `Say`, `GetDigits`, `RecordUtterance`, `Redirect`, `Hangup`, `Sms`, ...) to construct it, or emit the JSON array directly. Validate with the `validate_percl` MCP tool.
- SDK REST client (outbound API calls): use the SDK's API client to send SMS, place calls, create/update applications, buy numbers, and read account state from your own backend code.
- Raw REST: only when no SDK exists for the language or you need an endpoint the SDK does not expose. Authenticate with HTTP Basic (Account ID + API Key) against `https://www.freeclimb.com/apiserver/Accounts/{accountId}`.

For one-off operations from the agent (provisioning, inspection), prefer the FreeClimb MCP tools over writing SDK code.

## Node.js (`@freeclimb/sdk`) idioms

```js
const { createConfiguration, DefaultApi, PerclScript, Say } = require("@freeclimb/sdk")

const api = new DefaultApi(createConfiguration({ accountId, apiKey }))

await api.sendAnSmsMessage({ _from: FREECLIMB_NUMBER, to, text: "Hello" })

const percl = new PerclScript({ commands: [new Say({ text: "Hello, World" })] }).build()
```

## Python (`freeclimb`) idioms

```python
import freeclimb

configuration = freeclimb.Configuration(username=account_id, password=api_key)

say = freeclimb.Say(text="Hello, World")
percl = freeclimb.PerclScript(commands=[say]).to_json()

with freeclimb.ApiClient(configuration) as client:
    api = freeclimb.DefaultApi(client)
    # api.send_an_sms_message(...), api.list_applications(), etc.
```

## Credentials

SDKs authenticate with Account ID + API Key. In apps, read them from environment variables (e.g. `FREECLIMB_ACCOUNT_ID` / `FREECLIMB_API_KEY`); never hardcode or commit them. The agent never handles raw credentials — those live in the OS keyring via the plugin login flow.

## Request signature verification

For production webhooks, verify FreeClimb's request signatures using the SDK's request verifier (Node `RequestVerifier`, Python `RequestVerifier`, Ruby `Utils.verify_request`) with your signing secret. Add this when moving past local development.
