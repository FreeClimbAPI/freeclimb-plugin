# FreeClimb Python/Flask Starter

A signed voice and SMS webhook starter using `freeclimb` 5.4.1.

Copy the environment file, provide your FreeClimb credentials and signing secret, then start the server:

```bash
cp .env.example .env
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Set the Application voice URL to `https://your-host.example/voice` and SMS URL to `https://your-host.example/sms-inbound`. `BASE_URL` must be an absolute public HTTPS URL because it is used for PerCL action URLs.

Routes are `POST /voice`, `POST /menu`, `POST /sms-inbound`, and `GET /health`. Webhook routes verify the `FreeClimb-Signature` header with the documented HMAC-SHA256 algorithm over the raw body, reject timestamps more than 300 seconds from server time, and compare every `v1` digest in constant time. SMS replies are returned as SDK-native PerCL and do not make an outbound SDK request.

```bash
pip install -r requirements-dev.txt
pytest
```
