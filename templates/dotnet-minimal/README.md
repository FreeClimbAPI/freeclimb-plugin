# FreeClimb ASP.NET Minimal API Starter

ASP.NET Core minimal API starter for signed FreeClimb voice and SMS webhooks using SDK-native PerCL.

## Run

Export the values from `.env.example`, then run:

```bash
dotnet restore --locked-mode
dotnet run
```

`BASE_URL` is required and must be an absolute HTTPS URL. Set the FreeClimb Application voice URL to `${BASE_URL}/voice` and SMS URL to `${BASE_URL}/sms-inbound`.

`FREECLIMB_ACCOUNT_ID`, `FREECLIMB_API_KEY`, `FREECLIMB_SIGNING_SECRET`, and `FREECLIMB_NUMBER` are required at startup. The app constructs `DefaultApi` without making a request.

Webhook verification parses `t` and every `v1` value from `freeclimb-signature`, rejects timestamps more than 300 seconds in the past or future, signs `timestamp.rawBody` with HMAC-SHA256, and uses constant-time byte comparison.

## Routes

- `GET /health`
- `POST /voice`
- `POST /menu`
- `POST /sms-inbound`

## Test

```bash
dotnet restore tests/FreeClimbStarter.Tests.csproj --locked-mode
dotnet test tests/FreeClimbStarter.Tests.csproj --no-restore
```

Tests exercise health, signed voice and SMS PerCL responses, multiple signatures, invalid and future timestamps, and the manual HMAC verifier without billable API calls.
