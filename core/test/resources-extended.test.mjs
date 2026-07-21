import assert from "node:assert/strict"
import { describe, it, afterEach } from "node:test"
import http from "node:http"
import {
    getRecording,
    listCallLogs,
    getConference,
    listConferenceParticipants,
    getQueue,
    listQueueMembers,
    listBrands,
    getBrand,
    listCampaigns,
    getCampaign,
    listPartnerCampaigns,
    getPartnerCampaign,
    listExports,
    getExport,
    ValidationError,
} from "../lib/index.js"

const TRACKED_ENV_KEYS = [
    "FREECLIMB_CLI_BASE_URL",
    "FREECLIMB_MAX_RETRIES",
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

const PREFIX = "/Accounts/AC_EXTENDED_TEST_ACCOUNT_ID"

async function setUpServer(handler) {
    envSnapshot = snapshotEnv()
    server = await startServer(handler)
    process.env.FREECLIMB_CLI_BASE_URL = server.baseUrl
    process.env.FREECLIMB_MAX_RETRIES = "0"
    process.env.FREECLIMB_ACCOUNT_ID = "AC_EXTENDED_TEST_ACCOUNT_ID"
    return server
}

describe("extended read resources", () => {
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

    it("getRecording builds /Recordings/{id} and validates the id", async () => {
        await setUpServer((_req, res) => jsonReply(res, 200, { recordingId: "RE1" }))

        await getRecording("RE1")
        assert.equal(server.requests[0].path, `${PREFIX}/Recordings/RE1`)

        await assert.rejects(
            () => getRecording("../etc"),
            (error) => error instanceof ValidationError,
        )
    })

    it("listCallLogs builds /Calls/{id}/Logs", async () => {
        await setUpServer((_req, res) => jsonReply(res, 200, { logs: [] }))

        await listCallLogs("CA1")
        assert.equal(server.requests[0].path, `${PREFIX}/Calls/CA1/Logs`)
    })

    it("getConference and listConferenceParticipants build conference paths", async () => {
        await setUpServer((_req, res) => jsonReply(res, 200, {}))

        await getConference("CF1")
        await listConferenceParticipants("CF1")
        assert.equal(server.requests[0].path, `${PREFIX}/Conferences/CF1`)
        assert.equal(server.requests[1].path, `${PREFIX}/Conferences/CF1/Participants`)
    })

    it("getQueue and listQueueMembers build queue paths", async () => {
        await setUpServer((_req, res) => jsonReply(res, 200, {}))

        await getQueue("QU1")
        await listQueueMembers("QU1")
        assert.equal(server.requests[0].path, `${PREFIX}/Queues/QU1`)
        assert.equal(server.requests[1].path, `${PREFIX}/Queues/QU1/Members`)
    })

    it("10DLC reads build Messages/10DLC paths", async () => {
        await setUpServer((_req, res) => jsonReply(res, 200, {}))

        await listBrands()
        await getBrand("B1")
        await listCampaigns()
        await getCampaign("C1")
        await listPartnerCampaigns()
        await getPartnerCampaign("C2")

        const paths = server.requests.map((r) => r.path)
        assert.deepEqual(paths, [
            `${PREFIX}/Messages/10DLC/Brands`,
            `${PREFIX}/Messages/10DLC/Brands/B1`,
            `${PREFIX}/Messages/10DLC/Campaigns`,
            `${PREFIX}/Messages/10DLC/Campaigns/C1`,
            `${PREFIX}/Messages/10DLC/PartnerCampaigns`,
            `${PREFIX}/Messages/10DLC/PartnerCampaigns/C2`,
        ])
    })

    it("export reads build /Exports paths", async () => {
        await setUpServer((_req, res) => jsonReply(res, 200, {}))

        await listExports()
        await getExport("EX1")
        assert.equal(server.requests[0].path, `${PREFIX}/Exports`)
        assert.equal(server.requests[1].path, `${PREFIX}/Exports/EX1`)
    })

})
