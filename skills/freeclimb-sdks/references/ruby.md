# Ruby

- Package: `freeclimb`
- Repository: `FreeClimbAPI/ruby-sdk`
- Template: `templates/ruby-sinatra`
- Request verifier: `Freeclimb::RequestVerifier.verify_request_signature`

Use the exact gem version and lockfile from the template.

```ruby
Freeclimb.configure do |config|
  config.username = account_id
  config.password = api_key
end
api = Freeclimb::DefaultApi.new
percl = Freeclimb::PerclScript.new(commands: [Freeclimb::Say.new(text: "Hello, World")]).to_json
```

Preserve the template's raw-body signature verification and absolute HTTPS base URL validation.
