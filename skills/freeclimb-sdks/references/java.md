# Java

- Package: `com.github.FreeClimbAPI:java-sdk`
- Repository: `FreeClimbAPI/java-sdk`
- Template: `templates/java-spring`
- Request verifier: `RequestVerifier.verifyRequestSignature`

The SDK is resolved from an exact repository tag through JitPack. Preserve the template's JitPack repository and tagged coordinate.

```java
ApiClient client = Configuration.getDefaultApiClient();
client.setAccountId(accountId);
client.setApiKey(apiKey);
DefaultApi api = new DefaultApi(client);
String percl = new PerclScript().addCommand(new Say().text("Hello, World")).toJson();
```

Preserve the template's raw-body signature verification and absolute HTTPS base URL validation.
