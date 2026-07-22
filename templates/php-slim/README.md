# FreeClimb PHP Slim Starter

Minimal signed voice and SMS webhooks using Slim and the official FreeClimb PHP SDK.

## Setup

```bash
cp .env.example .env
composer install
composer start
```

Set `BASE_URL` to an absolute, publicly reachable HTTPS URL. Set the FreeClimb Application voice URL to `${BASE_URL}/voice` and SMS URL to `${BASE_URL}/sms-inbound`.

## Routes

- `GET /health`
- `POST /voice`
- `POST /menu`
- `POST /sms-inbound`

All webhook routes require a valid `FreeClimb-Signature` header. Verification follows the documented FreeClimb algorithm against the preserved raw body, accepts every `v1` candidate, uses constant-time comparison, and rejects timestamps more than 300 seconds in the past or future. The SDK remains responsible for the REST client and PerCL models.

## Test

```bash
composer test
```

Tests construct the SDK client and exercise health, PerCL, and signature verification without making network calls.
