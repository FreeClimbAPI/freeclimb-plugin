# PHP

- Package: `freeclimbapi/php-sdk`
- Repository: `FreeClimbAPI/php-sdk`
- Template: `templates/php-slim`
- Request verifier: `FreeClimb\Api\Util\SignatureInformation`

Use the exact Composer package version and lockfile from the template.

```php
$config = FreeClimb\Api\Configuration::getDefaultConfiguration()
    ->setUsername($accountId)
    ->setPassword($apiKey);
$api = new FreeClimb\Api\Api\DefaultApi(new GuzzleHttp\Client(), $config);
$say = new FreeClimb\Api\Model\Say();
$say->setText("Hello, World");
$script = new FreeClimb\Api\Model\PerclScript();
$script->setCommands([$say]);
$percl = $script->toJSON();
```

Preserve the template's raw-body signature verification and absolute HTTPS base URL validation.
