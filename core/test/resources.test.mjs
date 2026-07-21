import assert from "node:assert/strict"
import { describe, it, afterEach } from "node:test"
import http from "node:http"
import {
    getAccount,
    listCalls,
    getCall,
    listMessages,
    getMessage,
    listIncomingNumbers,
    getIncomingNumber,
    searchAvailableNumbers,
    listApplications,
    getApplication,
    listLogs,
    filterLogs,
    listRecordings,
    listConferences,
    listQueues,
    readResources,
    ValidationError,
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
                const url = new URL(req.url, "http://localhost")
                const record = {
                    method: req.method,
                    url: req.url,
                    path: url.pathname,
                    query: Object.fromEntries(url.searchParams),
                    body: body ? JSON.parse(body) : undefined,
                }
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

async function setUpServer(handler) {
    envSnapshot = snapshotEnv()
    server = await startServer(handler)
    process.env.FREECLIMB_CLI_BASE_URL = server.baseUrl
    process.env.FREECLIMB_MAX_RETRIES = "0"
    process.env.FREECLIMB_ACCOUNT_ID = "AC_RESOURCES_TEST_ACCOUNT_ID"
    return server
}

describe("resources", () => {
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

    it("getAccount reads the account root", async () => {
        await setUpServer((_req, res) => jsonReply(res, 200, { accountId: "AC1", status: "active" }))

        const data = await getAccount()

        assert.equal(server.requests[0].path, `/Accounts/AC_RESOURCES_TEST_ACCOUNT_ID`)
        assert.deepEqual(data, { accountId: "AC1", status: "active" })
    })

    it("listCalls builds /Calls with status/to/from params", async () => {
        await setUpServer((_req, res) => jsonReply(res, 200, { calls: [] }))

        await listCalls({ status: "completed", to: "+15551234567", from: "+15557654321" })

        const req = server.requests[0]
        assert.equal(req.path, "/Accounts/AC_RESOURCES_TEST_ACCOUNT_ID/Calls")
        assert.deepEqual(req.query, {
            status: "completed",
            to: "+15551234567",
            from: "+15557654321",
        })
    })

    it("listCalls rejects malformed phone numbers", async () => {
        await assert.rejects(
            () => listCalls({ to: "not-a-number" }),
            (error) => {
                assert.ok(error instanceof ValidationError)
                return true
            },
        )
    })

    it("getCall builds /Calls/{callId} and validates the id", async () => {
        await setUpServer((_req, res) => jsonReply(res, 200, { callId: "CA1" }))

        await getCall("CA1")
        assert.equal(server.requests[0].path, "/Accounts/AC_RESOURCES_TEST_ACCOUNT_ID/Calls/CA1")

        await assert.rejects(
            () => getCall("../etc/passwd"),
            (error) => {
                assert.ok(error instanceof ValidationError)
                return true
            },
        )
    })

    it("listMessages builds /Messages with to/from params", async () => {
        await setUpServer((_req, res) => jsonReply(res, 200, { messages: [] }))

        await listMessages({ to: "+15551234567" })

        const req = server.requests[0]
        assert.equal(req.path, "/Accounts/AC_RESOURCES_TEST_ACCOUNT_ID/Messages")
        assert.equal(req.query.to, "+15551234567")
    })

    it("getMessage builds /Messages/{messageId} and validates the id", async () => {
        await setUpServer((_req, res) => jsonReply(res, 200, { messageId: "SM1" }))

        await getMessage("SM1")
        assert.equal(
            server.requests[0].path,
            "/Accounts/AC_RESOURCES_TEST_ACCOUNT_ID/Messages/SM1",
        )

        await assert.rejects(() => getMessage(""), ValidationError)
    })

    it("listIncomingNumbers builds /IncomingPhoneNumbers", async () => {
        await setUpServer((_req, res) => jsonReply(res, 200, { incomingPhoneNumbers: [] }))

        await listIncomingNumbers()

        assert.equal(
            server.requests[0].path,
            "/Accounts/AC_RESOURCES_TEST_ACCOUNT_ID/IncomingPhoneNumbers",
        )
    })

    it("getIncomingNumber builds /IncomingPhoneNumbers/{id} and validates the id", async () => {
        await setUpServer((_req, res) => jsonReply(res, 200, { phoneNumberId: "PN1" }))

        await getIncomingNumber("PN1")
        assert.equal(
            server.requests[0].path,
            "/Accounts/AC_RESOURCES_TEST_ACCOUNT_ID/IncomingPhoneNumbers/PN1",
        )

        await assert.rejects(() => getIncomingNumber("PN1?evil=1"), ValidationError)
    })

    it("searchAvailableNumbers hits the API root and defaults country to US", async () => {
        await setUpServer((_req, res) => jsonReply(res, 200, { availablePhoneNumbers: [] }))

        await searchAvailableNumbers({ areaCode: "415", smsEnabled: true })

        const req = server.requests[0]
        assert.equal(req.path, "/AvailablePhoneNumbers")
        assert.equal(req.query.areaCode, "415")
        assert.equal(req.query.country, "US")
        assert.equal(req.query.smsEnabled, "true")
    })

    it("searchAvailableNumbers honors an explicit country", async () => {
        await setUpServer((_req, res) => jsonReply(res, 200, { availablePhoneNumbers: [] }))

        await searchAvailableNumbers({ country: "CA" })

        assert.equal(server.requests[0].query.country, "CA")
    })

    it("listApplications builds /Applications", async () => {
        await setUpServer((_req, res) => jsonReply(res, 200, { applications: [] }))

        await listApplications()

        assert.equal(
            server.requests[0].path,
            "/Accounts/AC_RESOURCES_TEST_ACCOUNT_ID/Applications",
        )
    })

    it("getApplication builds /Applications/{id} and validates the id", async () => {
        await setUpServer((_req, res) => jsonReply(res, 200, { applicationId: "AP1" }))

        await getApplication("AP1")
        assert.equal(
            server.requests[0].path,
            "/Accounts/AC_RESOURCES_TEST_ACCOUNT_ID/Applications/AP1",
        )

        await assert.rejects(() => getApplication("AP#1"), ValidationError)
    })

    it("listLogs defaults maxItems to 100 and GETs /Logs", async () => {
        await setUpServer((_req, res) => jsonReply(res, 200, { logs: [] }))

        await listLogs()

        const req = server.requests[0]
        assert.equal(req.method, "GET")
        assert.equal(req.path, "/Accounts/AC_RESOURCES_TEST_ACCOUNT_ID/Logs")
        assert.equal(req.query.maxItems, "100")
    })

    it("listLogs honors an explicit maxItems", async () => {
        await setUpServer((_req, res) => jsonReply(res, 200, { logs: [] }))

        await listLogs({ maxItems: 5 })

        assert.equal(server.requests[0].query.maxItems, "5")
    })

    it("filterLogs POSTs only pql, limits results locally, and rejects control characters", async () => {
        await setUpServer((_req, res) =>
            jsonReply(res, 200, {
                logs: [{ requestId: "RQ1" }, { requestId: "RQ2" }],
                total: 2,
            }),
        )

        const result = await filterLogs('level = "ERROR"', { maxItems: 1 })

        const req = server.requests[0]
        assert.equal(req.method, "POST")
        assert.equal(req.path, "/Accounts/AC_RESOURCES_TEST_ACCOUNT_ID/Logs")
        assert.deepEqual(req.body, { pql: 'level = "ERROR"' })
        assert.deepEqual(result.logs, [{ requestId: "RQ1" }])
        assert.equal(result.total, 2)

        await assert.rejects(() => filterLogs("level = \x01ERROR\x01"), ValidationError)
    })

    it("listRecordings only validates callId when provided", async () => {
        await setUpServer((_req, res) => jsonReply(res, 200, { recordings: [] }))

        await listRecordings()
        assert.equal(
            server.requests[0].path,
            "/Accounts/AC_RESOURCES_TEST_ACCOUNT_ID/Recordings",
        )

        await assert.rejects(() => listRecordings({ callId: "../CA1" }), ValidationError)
    })

    it("listRecordings passes callId through as a query param", async () => {
        await setUpServer((_req, res) => jsonReply(res, 200, { recordings: [] }))

        await listRecordings({ callId: "CA1" })

        assert.equal(server.requests[0].query.callId, "CA1")
    })

    it("listConferences builds /Conferences with an optional status filter", async () => {
        await setUpServer((_req, res) => jsonReply(res, 200, { conferences: [] }))

        await listConferences({ status: "inProgress" })

        const req = server.requests[0]
        assert.equal(req.path, "/Accounts/AC_RESOURCES_TEST_ACCOUNT_ID/Conferences")
        assert.equal(req.query.status, "inProgress")
    })

    it("listQueues builds /Queues", async () => {
        await setUpServer((_req, res) => jsonReply(res, 200, { queues: [] }))

        await listQueues()

        assert.equal(server.requests[0].path, "/Accounts/AC_RESOURCES_TEST_ACCOUNT_ID/Queues")
    })

    it("exposes exactly the dashboard's expected read-only source names", () => {
        assert.deepEqual(
            new Set(Object.keys(readResources)),
            new Set([
                "calls",
                "sms",
                "queues",
                "conferences",
                "account",
                "logs",
                "numbers",
                "applications",
                "recordings",
            ]),
        )
    })

    it("registry's calls source dispatches to the same path as listCalls", async () => {
        await setUpServer((_req, res) => jsonReply(res, 200, { calls: [] }))

        await readResources.calls({ status: "busy" })

        assert.equal(server.requests[0].path, "/Accounts/AC_RESOURCES_TEST_ACCOUNT_ID/Calls")
        assert.equal(server.requests[0].query.status, "busy")
    })

    it("registry's account source dispatches to the same path as getAccount", async () => {
        await setUpServer((_req, res) => jsonReply(res, 200, {}))

        await readResources.account()

        assert.equal(server.requests[0].path, "/Accounts/AC_RESOURCES_TEST_ACCOUNT_ID")
    })

    it("registry's recordings source dispatches to the same path as listRecordings", async () => {
        await setUpServer((_req, res) => jsonReply(res, 200, { recordings: [] }))

        await readResources.recordings({ callId: "CA9" })

        assert.equal(server.requests[0].path, "/Accounts/AC_RESOURCES_TEST_ACCOUNT_ID/Recordings")
        assert.equal(server.requests[0].query.callId, "CA9")
    })

    it("registry's logs source GETs by default", async () => {
        await setUpServer((_req, res) => jsonReply(res, 200, { logs: [] }))

        await readResources.logs({ maxItems: 10 })

        assert.equal(server.requests[0].method, "GET")
        assert.equal(server.requests[0].query.maxItems, "10")
    })

    it("registry's logs source POSTs when pql is present", async () => {
        await setUpServer((_req, res) => jsonReply(res, 200, { logs: [] }))

        await readResources.logs({ pql: 'level = "ERROR"', maxItems: 10 })

        assert.equal(server.requests[0].method, "POST")
        assert.deepEqual(server.requests[0].body, { pql: 'level = "ERROR"' })
    })
})
