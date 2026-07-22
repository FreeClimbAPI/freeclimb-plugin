<?php

declare(strict_types=1);

namespace FreeClimbStarter\Tests;

use FreeClimb\Api\Api\DefaultApi;
use FreeClimbStarter\AppFactory;
use PHPUnit\Framework\TestCase;
use Psr\Http\Message\ServerRequestInterface;
use Slim\Psr7\Factory\ServerRequestFactory;
use Slim\Psr7\Factory\StreamFactory;

final class AppTest extends TestCase
{
    private array $contract;

    protected function setUp(): void
    {
        $contents = file_get_contents(dirname(__DIR__, 2) . "/contract-fixtures.json");
        $this->contract = json_decode($contents, true, 512, JSON_THROW_ON_ERROR);
        putenv("BASE_URL=" . $this->contract["baseUrl"]);
        putenv("FREECLIMB_ACCOUNT_ID=AC_TEST");
        putenv("FREECLIMB_API_KEY=test-api-key");
        putenv("FREECLIMB_NUMBER=" . $this->contract["sms"]["request"]["to"]);
        putenv("FREECLIMB_SIGNING_SECRET=test-signing-secret");
    }

    public function testConstructsSdkClientFromEnvironment(): void
    {
        $api = AppFactory::createApi();

        self::assertInstanceOf(DefaultApi::class, $api);
        self::assertSame("AC_TEST", $api->getConfig()->getUsername());
        self::assertSame("test-api-key", $api->getConfig()->getPassword());
    }

    public function testHealthRoute(): void
    {
        $request = (new ServerRequestFactory())->createServerRequest(
            $this->contract["health"]["method"],
            $this->contract["health"]["path"]
        );
        $response = AppFactory::create()->handle($request);

        self::assertSame(200, $response->getStatusCode());
        self::assertSame(
            [
                "status" => $this->contract["health"]["status"],
                "baseUrl" => $this->contract["baseUrl"],
            ],
            json_decode((string) $response->getBody(), true, 512, JSON_THROW_ON_ERROR)
        );
    }

    public function testVoiceRouteReturnsSdkPercl(): void
    {
        $voice = $this->contract["voice"];
        $response = AppFactory::create()->handle($this->signedRequest($voice["path"], $voice["request"]));

        self::assertSame(200, $response->getStatusCode());
        $body = json_decode((string) $response->getBody(), true, 512, JSON_THROW_ON_ERROR);
        $command = $body[0][$voice["requiredCommand"]];
        self::assertSame($voice["actionUrl"], $command["actionUrl"]);
        self::assertSame($voice["maxDigits"], $command["maxDigits"]);
    }

    public function testSmsRouteReturnsSdkPercl(): void
    {
        $sms = $this->contract["sms"];
        $response = AppFactory::create()->handle($this->signedRequest($sms["path"], $sms["request"]));

        self::assertSame(200, $response->getStatusCode());
        $body = json_decode((string) $response->getBody(), true, 512, JSON_THROW_ON_ERROR);
        $command = $body[0][$sms["requiredCommand"]];
        self::assertSame($sms["request"]["from"], $command["to"]);
        self::assertSame($sms["request"]["to"], $command["from"]);
        self::assertSame($sms["replyText"], $command["text"]);
    }

    public function testInvalidSignatureIsRejected(): void
    {
        $voice = $this->contract["voice"];
        $body = json_encode($voice["request"], JSON_THROW_ON_ERROR);
        $request = (new ServerRequestFactory())
            ->createServerRequest($voice["method"], $voice["path"])
            ->withHeader("Content-Type", "application/json")
            ->withHeader("FreeClimb-Signature", "t=" . time() . ",v1=invalid")
            ->withBody((new StreamFactory())->createStream($body));

        $response = AppFactory::create()->handle($request);

        self::assertSame(401, $response->getStatusCode());
    }

    public function testFutureTimestampIsRejected(): void
    {
        $voice = $this->contract["voice"];
        $request = $this->signedRequest($voice["path"], $voice["request"], time() + 301);

        $response = AppFactory::create()->handle($request);

        self::assertSame(401, $response->getStatusCode());
    }

    private function signedRequest(string $path, array $payload, ?int $timestamp = null): ServerRequestInterface
    {
        $body = json_encode($payload, JSON_THROW_ON_ERROR);
        $timestamp ??= time();
        $signature = hash_hmac(
            "sha256",
            $timestamp . "." . $body,
            "test-signing-secret"
        );

        return (new ServerRequestFactory())
            ->createServerRequest("POST", $path)
            ->withHeader("Content-Type", "application/json")
            ->withHeader("FreeClimb-Signature", "t=" . $timestamp . ",v1=invalid,v1=" . $signature)
            ->withBody((new StreamFactory())->createStream($body));
    }
}
