# Node.js and TypeScript

- Package: `@freeclimb/sdk`
- Repository: `FreeClimbAPI/nodejs-sdk`
- Template: `templates/node-express`
- Request verifier: `RequestVerifier.verifyRequestSignature`

Use the exact package version and lockfile from the template.

```js
const { createConfiguration, DefaultApi, PerclScript, Say } = require("@freeclimb/sdk")

const api = new DefaultApi(createConfiguration({ accountId, apiKey }))
const percl = new PerclScript({ commands: [new Say({ text: "Hello, World" })] }).build()
```

Preserve the template's raw-body signature verification and absolute HTTPS base URL validation.
