using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Xunit;

internal static class ContractFixture
{
    internal static readonly JsonElement Root = JsonDocument
        .Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "contract-fixtures.json")))
        .RootElement.Clone();
}

public sealed class StarterFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        JsonElement fixture = ContractFixture.Root;
        builder.UseSetting("BASE_URL", fixture.GetProperty("baseUrl").GetString());
        builder.UseSetting("FREECLIMB_SIGNING_SECRET", WebhookTests.Secret);
        builder.UseSetting(
            "FREECLIMB_NUMBER",
            fixture.GetProperty("sms").GetProperty("request").GetProperty("to").GetString()
        );
        builder.UseSetting("FREECLIMB_ACCOUNT_ID", "ACtest");
        builder.UseSetting("FREECLIMB_API_KEY", "test-api-key");
    }
}

public sealed class WebhookTests : IClassFixture<StarterFactory>
{
    internal const string Secret = "test-signing-secret";
    private readonly HttpClient client;

    public WebhookTests(StarterFactory factory)
    {
        client = factory.CreateClient();
    }

    [Fact]
    public async Task HealthRouteReturnsStatus()
    {
        JsonElement health = ContractFixture.Root.GetProperty("health");
        using HttpResponseMessage response = await client.GetAsync(
            health.GetProperty("path").GetString()
        );
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using JsonDocument body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(
            health.GetProperty("status").GetString(),
            body.RootElement.GetProperty("status").GetString()
        );
        Assert.Equal(
            ContractFixture.Root.GetProperty("baseUrl").GetString(),
            body.RootElement.GetProperty("baseUrl").GetString()
        );
    }

    [Fact]
    public async Task VoiceRouteReturnsSdkPercl()
    {
        JsonElement voice = ContractFixture.Root.GetProperty("voice");
        string body = voice.GetProperty("request").GetRawText();
        using HttpResponseMessage response = await PostSigned(
            voice.GetProperty("path").GetString()!,
            body
        );
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using JsonDocument percl = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        JsonElement getDigits = percl.RootElement[0].GetProperty(
            voice.GetProperty("requiredCommand").GetString()!
        );
        Assert.Equal(
            voice.GetProperty("actionUrl").GetString(),
            getDigits.GetProperty("actionUrl").GetString()
        );
        Assert.Equal(
            voice.GetProperty("maxDigits").GetInt32(),
            getDigits.GetProperty("maxDigits").GetInt32()
        );
    }

    [Fact]
    public async Task SmsRouteReturnsSdkPercl()
    {
        JsonElement smsFixture = ContractFixture.Root.GetProperty("sms");
        JsonElement request = smsFixture.GetProperty("request");
        string body = request.GetRawText();
        using HttpResponseMessage response = await PostSigned(
            smsFixture.GetProperty("path").GetString()!,
            body
        );
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using JsonDocument percl = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        JsonElement sms = percl.RootElement[0].GetProperty(
            smsFixture.GetProperty("requiredCommand").GetString()!
        );
        Assert.Equal(request.GetProperty("from").GetString(), sms.GetProperty("to").GetString());
        Assert.Equal(request.GetProperty("to").GetString(), sms.GetProperty("from").GetString());
        Assert.Equal(
            smsFixture.GetProperty("replyText").GetString(),
            sms.GetProperty("text").GetString()
        );
    }

    [Fact]
    public async Task WebhookRejectsInvalidSignature()
    {
        using StringContent content = JsonContent("{}");
        content.Headers.Add("freeclimb-signature", "t=1,v1=invalid");
        using HttpResponseMessage response = await client.PostAsync(
            ContractFixture.Root.GetProperty("voice").GetProperty("path").GetString(),
            content
        );
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public void ManualVerifierAcceptsValidSignatureAmongAllV1Values()
    {
        string body = "{\"requestType\":\"test\"}";
        Assert.True(WebhookSignatureVerifier.Verify(body, Signature(body), Secret));
    }

    [Fact]
    public async Task WebhookRejectsFutureTimestamp()
    {
        JsonElement voice = ContractFixture.Root.GetProperty("voice");
        string body = voice.GetProperty("request").GetRawText();
        long futureTimestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds() + 600;
        using StringContent content = JsonContent(body);
        content.Headers.Add("freeclimb-signature", Signature(body, futureTimestamp));
        using HttpResponseMessage response = await client.PostAsync(
            voice.GetProperty("path").GetString(),
            content
        );
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public void BaseUrlRejectsNonHttpsValues()
    {
        IConfiguration configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(
                new Dictionary<string, string?>
                {
                    ["BASE_URL"] = "http://starter.example",
                    ["FREECLIMB_SIGNING_SECRET"] = Secret,
                    ["FREECLIMB_NUMBER"] = "+15551234567"
                }
            )
            .Build();
        InvalidOperationException error = Assert.Throws<InvalidOperationException>(
            () => StarterSettings.FromConfiguration(configuration)
        );
        Assert.Equal("BASE_URL must be an absolute HTTPS URL", error.Message);
    }

    [Fact]
    public void ApiKeyIsRequiredAtStartup()
    {
        IConfiguration configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(
                new Dictionary<string, string?>
                {
                    ["BASE_URL"] = ContractFixture.Root.GetProperty("baseUrl").GetString(),
                    ["FREECLIMB_SIGNING_SECRET"] = Secret,
                    ["FREECLIMB_NUMBER"] = ContractFixture
                        .Root.GetProperty("sms")
                        .GetProperty("request")
                        .GetProperty("to")
                        .GetString(),
                    ["FREECLIMB_ACCOUNT_ID"] = "ACtest"
                }
            )
            .Build();
        InvalidOperationException error = Assert.Throws<InvalidOperationException>(
            () => StarterSettings.FromConfiguration(configuration)
        );
        Assert.Equal("FREECLIMB_API_KEY is required", error.Message);
    }

    private async Task<HttpResponseMessage> PostSigned(string path, string body)
    {
        using StringContent content = JsonContent(body);
        content.Headers.Add("freeclimb-signature", Signature(body));
        return await client.PostAsync(path, content);
    }

    private static StringContent JsonContent(string body)
    {
        return new StringContent(body, Encoding.UTF8, "application/json");
    }

    private static string Signature(string body)
    {
        return Signature(body, DateTimeOffset.UtcNow.ToUnixTimeSeconds());
    }

    private static string Signature(string body, long timestamp)
    {
        using HMACSHA256 hmac = new HMACSHA256(Encoding.ASCII.GetBytes(Secret));
        byte[] digest = hmac.ComputeHash(Encoding.ASCII.GetBytes($"{timestamp}.{body}"));
        return $"t={timestamp},v1={new string('0', 64)},v1={Convert.ToHexString(digest).ToLowerInvariant()}";
    }
}
