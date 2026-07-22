<?php

declare(strict_types=1);

namespace FreeClimbStarter;

use FreeClimb\Api\Api\DefaultApi;
use FreeClimb\Api\Configuration;
use FreeClimb\Api\Model\GetDigits;
use FreeClimb\Api\Model\PerclScript;
use FreeClimb\Api\Model\Say;
use FreeClimb\Api\Model\Sms;
use InvalidArgumentException;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use RuntimeException;
use Slim\App;
use Slim\Factory\AppFactory as SlimAppFactory;
use Slim\Psr7\Response;
use Throwable;

final class AppFactory
{
    public static function create(): App
    {
        $baseUrl = rtrim(self::environment("BASE_URL"), "/");
        $parts = parse_url($baseUrl);
        if ($parts === false || ($parts["scheme"] ?? null) !== "https" || empty($parts["host"])) {
            throw new InvalidArgumentException("BASE_URL must be an absolute HTTPS URL");
        }

        self::createApi();

        $app = SlimAppFactory::create();

        $app->get("/health", function (ServerRequestInterface $request, ResponseInterface $response) use ($baseUrl): ResponseInterface {
            return self::json($response, ["status" => "ok", "baseUrl" => $baseUrl]);
        });

        $voice = $app->post("/voice", function (ServerRequestInterface $request, ResponseInterface $response) use ($baseUrl): ResponseInterface {
            $getDigits = new GetDigits([
                "action_url" => $baseUrl . "/menu",
                "prompts" => [new Say(["text" => "Press one to continue."])],
                "max_digits" => 1,
            ]);
            $script = new PerclScript(["commands" => [$getDigits]]);
            return self::percl($response, $script);
        });
        $voice->add(self::signatureMiddleware());

        $menu = $app->post("/menu", function (ServerRequestInterface $request, ResponseInterface $response): ResponseInterface {
            $say = new Say(["text" => "Thanks for calling FreeClimb."]);
            $script = new PerclScript(["commands" => [$say]]);
            return self::percl($response, $script);
        });
        $menu->add(self::signatureMiddleware());

        $sms = $app->post("/sms-inbound", function (ServerRequestInterface $request, ResponseInterface $response): ResponseInterface {
            $payload = json_decode((string) $request->getBody(), true, 512, JSON_THROW_ON_ERROR);
            $text = strtoupper(trim($payload["text"] ?? ""));
            $reply = $text === "STOP"
                ? "You are unsubscribed and will receive no more messages. Reply HELP for help."
                : "Thanks for your message.";
            $command = new Sms([
                "to" => $payload["from"],
                "from" => self::environment("FREECLIMB_NUMBER"),
                "text" => $reply,
            ]);
            $script = new PerclScript(["commands" => [$command]]);
            return self::percl($response, $script);
        });
        $sms->add(self::signatureMiddleware());

        return $app;
    }

    public static function createApi(): DefaultApi
    {
        $configuration = new Configuration();
        $configuration
            ->setUsername(self::environment("FREECLIMB_ACCOUNT_ID"))
            ->setPassword(self::environment("FREECLIMB_API_KEY"));
        return new DefaultApi(null, $configuration);
    }

    private static function signatureMiddleware(): callable
    {
        return function (ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface {
            $body = self::rawBody($request);
            $header = $request->getHeaderLine("FreeClimb-Signature");

            try {
                self::verifySignature($body, $header);
            } catch (Throwable) {
                return self::json(new Response(401), ["error" => "invalid signature"]);
            }

            return $handler->handle($request);
        };
    }

    private static function verifySignature(string $body, string $header): void
    {
        if ($body === "" || $header === "") {
            throw new RuntimeException("Missing signed request data");
        }

        $timestamps = [];
        $signatures = [];
        foreach (explode(",", $header) as $part) {
            [$key, $value] = array_pad(explode("=", trim($part), 2), 2, null);
            if ($key === "t") {
                $timestamps[] = $value;
            }
            if ($key === "v1") {
                $signatures[] = $value;
            }
        }

        if (count($timestamps) !== 1 || count($signatures) === 0 || !is_string($timestamps[0])) {
            throw new RuntimeException("Invalid signature header");
        }
        if (preg_match('/^\d+$/D', $timestamps[0]) !== 1) {
            throw new RuntimeException("Invalid timestamp");
        }

        $timestamp = (int) $timestamps[0];
        if (abs(time() - $timestamp) > 300) {
            throw new RuntimeException("Invalid timestamp");
        }

        $expected = hash_hmac(
            "sha256",
            $timestamp . "." . $body,
            self::environment("FREECLIMB_SIGNING_SECRET")
        );
        $valid = false;
        foreach ($signatures as $signature) {
            $valid = is_string($signature) && hash_equals($expected, $signature) || $valid;
        }
        if (!$valid) {
            throw new RuntimeException("Invalid signature");
        }
    }

    private static function rawBody(ServerRequestInterface $request): string
    {
        $stream = $request->getBody();
        if ($stream->isSeekable()) {
            $stream->rewind();
        }
        $body = $stream->getContents();
        if ($stream->isSeekable()) {
            $stream->rewind();
        }
        return $body;
    }

    private static function environment(string $name): string
    {
        $value = $_ENV[$name] ?? $_SERVER[$name] ?? getenv($name);
        if ($value === false || $value === "") {
            throw new RuntimeException($name . " is required");
        }
        return $value;
    }

    private static function percl(ResponseInterface $response, PerclScript $script): ResponseInterface
    {
        $response->getBody()->write($script->toJSON());
        return $response->withHeader("Content-Type", "application/json");
    }

    private static function json(ResponseInterface $response, array $value): ResponseInterface
    {
        $response->getBody()->write(json_encode($value, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES));
        return $response->withHeader("Content-Type", "application/json");
    }
}
