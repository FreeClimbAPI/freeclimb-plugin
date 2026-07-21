import assert from "node:assert/strict"
import { describe, it, afterEach } from "node:test"
import http from "node:http"
import {
    apiRequest,
    publicRequest,
    createApiAxios,
    FreeClimbHttpError,
    cred,
} from "../lib/index.js"

const TRACKED_ENV_KEYS = [
    "FREECLIMB_CLI_BASE_URL",
    "FREECLIMB_MAX_RETRIES",
    "FREECLIMB_TIMEOUT",
    "ACCOUNT_ID",
    "API_KEY",
    "FREECLIMB_ACCOUNT_ID",
    "FREECLIMB_API_KEY",
]

function snapshotEnv() {
    const snapshot = {}
    for (const key of TRACKED_ENV_KEYS) snapshot[key] = process.env[key]
    return snapshot
}

function restoreEnv(snapshot) {
    for (const key of TRACKED_ENV_KEYS) {
        if (snapshot[key] === undefined) delete process.env[key]
        else process.env[key] = snapshot[key]
    }
}

function startServer(handler) {
    return new Promise((resolve) => {
        const requests = []
        const server = http.createServer((req, res) => {
            const chunks = []
            req.on("data", (chunk) => chunks.push(chunk))
            req.on("end", () => {
                const body = Buffer.concat(chunks).toString("utf-8")
                const record = { method: req.method, url: req.url, headers: req.headers, body }
                requests.push(record)
                handler(record, res)
            })
        })
        server.listen(0, "127.0.0.1", () => {
            const { port } = server.address()
            resolve({
                baseUrl: `http://127.0.0.1:${port}`,
                requests,
                close: () => new Promise((resolveClose) => server.close(() => resolveClose())),
            })
        })
    })
}

function jsonReply(res, status, body) {
    res.writeHead(status, { "Content-Type": "application/json" })
    res.end(JSON.stringify(body))
}

let server
let envSnapshot

describe("http", () => {
    afterEach(async () => {
        if (server) {
            await server.close()
            server = undefined
        }
        if (envSnapshot) {
            restoreEnv(envSnapshot)
            envSnapshot = undefined
        }
    })

    it("injects a unique X-Request-Id header and returns it on the response", async () => {
        envSnapshot = snapshotEnv()
        server = await startServer((_req, res) => jsonReply(res, 200, { ok: true }))
        process.env.FREECLIMB_CLI_BASE_URL = server.baseUrl
        process.env.FREECLIMB_MAX_RETRIES = "0"

        const response = await apiRequest({ method: "GET", path: "/ping" })

        assert.equal(response.status, 200)
        assert.ok(response.requestId)
        assert.equal(server.requests.length, 1)
        assert.equal(server.requests[0].headers["x-request-id"], response.requestId)
    })

    it("retries once on a 503 and succeeds on the next attempt", async () => {
        envSnapshot = snapshotEnv()
        let calls = 0
        server = await startServer((_req, res) => {
            calls += 1
            if (calls === 1) {
                jsonReply(res, 503, { message: "temporarily unavailable" })
            } else {
                jsonReply(res, 200, { ok: true })
            }
        })
        process.env.FREECLIMB_CLI_BASE_URL = server.baseUrl
        process.env.FREECLIMB_MAX_RETRIES = "1"

        const response = await apiRequest({ method: "GET", path: "/flaky" })

        assert.equal(response.status, 200)
        assert.deepEqual(response.data, { ok: true })
        assert.equal(calls, 2)
    })

    it("exhausts retries and surfaces a normalized error on persistent 503s", async () => {
        envSnapshot = snapshotEnv()
        let calls = 0
        server = await startServer((_req, res) => {
            calls += 1
            jsonReply(res, 503, { message: "down" })
        })
        process.env.FREECLIMB_CLI_BASE_URL = server.baseUrl
        process.env.FREECLIMB_MAX_RETRIES = "1"

        await assert.rejects(
            () => apiRequest({ method: "GET", path: "/always-down" }),
            (error) => {
                assert.ok(error instanceof FreeClimbHttpError)
                assert.equal(error.status, 503)
                assert.deepEqual(error.data, { message: "down" })
                assert.equal(error.response?.status, 503)
                return true
            },
        )
        assert.equal(calls, 2)
    })

    it("does not retry a non-retryable 4xx and passes the error through immediately", async () => {
        envSnapshot = snapshotEnv()
        let calls = 0
        server = await startServer((_req, res) => {
            calls += 1
            jsonReply(res, 404, { message: "not found" })
        })
        process.env.FREECLIMB_CLI_BASE_URL = server.baseUrl
        process.env.FREECLIMB_MAX_RETRIES = "3"

        await assert.rejects(
            () => apiRequest({ method: "GET", path: "/missing" }),
            (error) => {
                assert.ok(error instanceof FreeClimbHttpError)
                assert.equal(error.status, 404)
                assert.deepEqual(error.response?.data, { message: "not found" })
                return true
            },
        )
        assert.equal(calls, 1)
    })

    it("refreshes credentials and retries exactly once on a 401", async () => {
        envSnapshot = snapshotEnv()
        let calls = 0
        server = await startServer((_req, res) => {
            calls += 1
            if (calls === 1) {
                jsonReply(res, 401, { message: "unauthorized" })
            } else {
                jsonReply(res, 200, { ok: true })
            }
        })
        process.env.FREECLIMB_CLI_BASE_URL = server.baseUrl
        process.env.FREECLIMB_MAX_RETRIES = "0"

        const response = await apiRequest({ method: "GET", path: "/rotated" })

        assert.equal(response.status, 200)
        assert.equal(calls, 2)
    })

    it("surfaces a persistent 401 after a single refresh attempt", async () => {
        envSnapshot = snapshotEnv()
        let calls = 0
        server = await startServer((_req, res) => {
            calls += 1
            jsonReply(res, 401, { message: "unauthorized" })
        })
        process.env.FREECLIMB_CLI_BASE_URL = server.baseUrl
        process.env.FREECLIMB_MAX_RETRIES = "0"

        await assert.rejects(
            () => apiRequest({ method: "GET", path: "/still-unauthorized" }),
            (error) => {
                assert.ok(error instanceof FreeClimbHttpError)
                assert.equal(error.status, 401)
                return true
            },
        )
        assert.equal(calls, 2)
    })

    it("normalizes connection failures as network errors without a response", async () => {
        envSnapshot = snapshotEnv()
        const temp = await startServer((_req, res) => jsonReply(res, 200, {}))
        const unreachableUrl = temp.baseUrl
        await temp.close()

        process.env.FREECLIMB_CLI_BASE_URL = unreachableUrl
        process.env.FREECLIMB_MAX_RETRIES = "0"

        await assert.rejects(
            () => apiRequest({ method: "GET", path: "/unreachable" }),
            (error) => {
                assert.ok(error instanceof FreeClimbHttpError)
                assert.equal(error.isNetworkError, true)
                assert.equal(error.response, undefined)
                return true
            },
        )
    })

    it("scopes apiRequest under /Accounts/{accountId} and honors FREECLIMB_CLI_BASE_URL", async () => {
        envSnapshot = snapshotEnv()
        server = await startServer((_req, res) => jsonReply(res, 200, { ok: true }))
        process.env.FREECLIMB_CLI_BASE_URL = server.baseUrl
        process.env.FREECLIMB_MAX_RETRIES = "0"
        process.env.FREECLIMB_ACCOUNT_ID = "AC_HTTP_TEST_ACCOUNT_ID"

        await apiRequest({ method: "GET", path: "/Calls" })

        const accountId = await cred.accountId
        assert.equal(server.requests[0].url, `/Accounts/${accountId}/Calls`)
    })

    it("publicRequest hits the API root without the account prefix and skips auth by default", async () => {
        envSnapshot = snapshotEnv()
        server = await startServer((_req, res) => jsonReply(res, 200, { ok: true }))
        process.env.FREECLIMB_CLI_BASE_URL = server.baseUrl
        process.env.FREECLIMB_MAX_RETRIES = "0"

        await publicRequest({ method: "GET", path: "/health" })

        assert.equal(server.requests[0].url, "/health")
        assert.equal(server.requests[0].headers.authorization, undefined)
    })

    it("publicRequest attaches basic auth credentials when auth is requested", async () => {
        envSnapshot = snapshotEnv()
        server = await startServer((_req, res) => jsonReply(res, 200, { ok: true }))
        process.env.FREECLIMB_CLI_BASE_URL = server.baseUrl
        process.env.FREECLIMB_MAX_RETRIES = "0"

        await publicRequest({ method: "GET", path: "/AvailablePhoneNumbers", auth: true })

        assert.ok(server.requests[0].headers.authorization?.startsWith("Basic "))
    })

    it("createApiAxios defaults to the public FreeClimb API and honors FREECLIMB_CLI_BASE_URL", async () => {
        envSnapshot = snapshotEnv()
        delete process.env.FREECLIMB_CLI_BASE_URL

        const accountId = await cred.accountId
        const defaultClient = await createApiAxios()
        assert.equal(
            defaultClient.defaults.baseURL,
            `https://www.freeclimb.com/apiserver/Accounts/${accountId}`,
        )

        process.env.FREECLIMB_CLI_BASE_URL = "https://example.test/apiserver"
        const overriddenClient = await createApiAxios()
        assert.equal(
            overriddenClient.defaults.baseURL,
            `https://example.test/apiserver/Accounts/${accountId}`,
        )
    })
})
