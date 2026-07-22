# Python

- Package: `freeclimb`
- Repository: `FreeClimbAPI/python-sdk`
- Template: `templates/python-flask`
- Request verifier: `RequestVerifier.verify_request_signature`

Use the exact package version from the template requirements.

```python
import freeclimb

configuration = freeclimb.Configuration(username=account_id, password=api_key)
say = freeclimb.Say(text="Hello, World")
percl = freeclimb.PerclScript(commands=[say]).to_json()
```

Preserve the template's raw-body signature verification and absolute HTTPS base URL validation.
