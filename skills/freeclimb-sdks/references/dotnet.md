# .NET

- Package: `freeclimb`
- Repository: `FreeClimbAPI/csharp-sdk`
- Template: `templates/dotnet-minimal`
- Request verifier: `RequestVerifier.verifyRequestSignature`

Use the exact NuGet package version and lockfiles from the template.

```csharp
var configuration = new Configuration { Username = accountId, Password = apiKey };
var api = new DefaultApi(configuration);
var percl = new PerclScript(new List<PerclCommand> { new Say("Hello, World") }).ToJson();
```

Preserve the template's raw-body signature verification and absolute HTTPS base URL validation.
