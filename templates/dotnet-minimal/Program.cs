using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using freeclimb.Api;
using freeclimb.Client;
using freeclimb.Model;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

public partial class Program
{
    public static void Main(string[] args)
    {
        BuildApp(args).Run();
    }

    public static WebApplication BuildApp(string[] args)
    {
        WebApplicationBuilder builder = WebApplication.CreateBuilder(args);
        StarterSettings settings = StarterSettings.FromConfiguration(builder.Configuration);
        Configuration configuration = new Configuration
        {
            Username = settings.AccountId,
            Password = settings.ApiKey
        };
        builder.Services.AddSingleton(settings);
        builder.Services.AddSingleton(new DefaultApi(configuration));

        WebApplication app = builder.Build();
        app.MapGet(
            "/health",
            (StarterSettings current) =>
                Results.Json(new { status = "ok", baseUrl = current.BaseUrl })
        );
        app.MapPost("/voice", WebhookHandlers.Voice);
        app.MapPost("/menu", WebhookHandlers.Menu);
        app.MapPost("/sms-inbound", WebhookHandlers.Sms);
        return app;
    }
}

public sealed record StarterSettings(
    string BaseUrl,
    string SigningSecret,
    string FreeClimbNumber,
    string AccountId,
    string ApiKey
)
{
    public static StarterSettings FromConfiguration(IConfiguration configuration)
    {
        string baseUrl = Required(configuration, "BASE_URL").TrimEnd('/');
        if (
            !Uri.TryCreate(baseUrl, UriKind.Absolute, out Uri? uri)
            || uri.Scheme != Uri.UriSchemeHttps
            || string.IsNullOrWhiteSpace(uri.Host)
            || !string.IsNullOrEmpty(uri.Query)
            || !string.IsNullOrEmpty(uri.Fragment)
        )
        {
            throw new InvalidOperationException("BASE_URL must be an absolute HTTPS URL");
        }
        return new StarterSettings(
            baseUrl,
            Required(configuration, "FREECLIMB_SIGNING_SECRET"),
            Required(configuration, "FREECLIMB_NUMBER"),
            Required(configuration, "FREECLIMB_ACCOUNT_ID"),
            Required(configuration, "FREECLIMB_API_KEY")
        );
    }

    private static string Required(IConfiguration configuration, string name)
    {
        string? value = configuration[name];
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException($"{name} is required");
        }
        return value;
    }
}

public static class WebhookHandlers
{
    private static readonly HashSet<string> StopWords = new HashSet<string>(
        new[] { "STOP", "UNSUBSCRIBE", "CANCEL", "END", "QUIT" },
        StringComparer.OrdinalIgnoreCase
    );

    public static async Task<IResult> Voice(HttpRequest request, StarterSettings settings)
    {
        string body = await ReadBody(request);
        if (
            !Verified(
                body,
                request.Headers["freeclimb-signature"].ToString(),
                settings.SigningSecret
            )
        )
        {
            return Results.Unauthorized();
        }
        PerclScript script = new PerclScript(
            new List<PerclCommand>
            {
                new GetDigits(
                    actionUrl: $"{settings.BaseUrl}/menu",
                    maxDigits: 1,
                    prompts: new List<PerclCommand> { new Say("Press one to continue.") }
                )
            }
        );
        return Results.Text(script.ToJson(), "application/json");
    }

    public static async Task<IResult> Menu(HttpRequest request, StarterSettings settings)
    {
        string body = await ReadBody(request);
        if (
            !Verified(
                body,
                request.Headers["freeclimb-signature"].ToString(),
                settings.SigningSecret
            )
        )
        {
            return Results.Unauthorized();
        }
        PerclScript script = new PerclScript(
            new List<PerclCommand> { new Say("Thanks. Your selection was received.") }
        );
        return Results.Text(script.ToJson(), "application/json");
    }

    public static async Task<IResult> Sms(HttpRequest request, StarterSettings settings)
    {
        string body = await ReadBody(request);
        if (
            !Verified(
                body,
                request.Headers["freeclimb-signature"].ToString(),
                settings.SigningSecret
            )
        )
        {
            return Results.Unauthorized();
        }
        using JsonDocument payload = JsonDocument.Parse(body);
        if (
            !payload.RootElement.TryGetProperty("from", out JsonElement fromElement)
            || string.IsNullOrWhiteSpace(fromElement.GetString())
        )
        {
            return Results.BadRequest();
        }
        string from = fromElement.GetString()!;
        string text =
            payload.RootElement.TryGetProperty("text", out JsonElement textElement)
                ? textElement.GetString() ?? string.Empty
                : string.Empty;
        string reply;
        if (StopWords.Contains(text.Trim()))
        {
            reply =
                "You are unsubscribed and will receive no more messages. Reply HELP for help.";
        }
        else if (
            text.Trim().Equals("HELP", StringComparison.OrdinalIgnoreCase)
            || text.Trim().Equals("INFO", StringComparison.OrdinalIgnoreCase)
        )
        {
            reply = "FreeClimb starter help. Reply STOP to unsubscribe.";
        }
        else
        {
            reply =
                "FreeClimb starter: Thanks for your message. Reply HELP for help or STOP to unsubscribe.";
        }
        PerclScript script = new PerclScript(
            new List<PerclCommand>
            {
                new Sms(from, settings.FreeClimbNumber, reply)
            }
        );
        return Results.Text(script.ToJson(), "application/json");
    }

    private static async Task<string> ReadBody(HttpRequest request)
    {
        using StreamReader reader = new StreamReader(request.Body);
        return await reader.ReadToEndAsync();
    }

    private static bool Verified(string body, string signature, string signingSecret)
    {
        return WebhookSignatureVerifier.Verify(body, signature, signingSecret);
    }
}
