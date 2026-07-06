import { expect } from "chai"
import nock from "nock"
import * as os from "node:os"
import * as path from "node:path"
import { runCommand } from "@oclif/test"
import { cred } from "../src/credentials.js"
import { Environment } from "../src/environment.js"

describe("executor pipeline", function () {
    afterEach(() => {
        nock.cleanAll()
    })

    describe("quiet mode", () => {
        it("extracts only the resource id", async () => {
            const accountId = await cred.accountId
            nock("https://www.freeclimb.com")
                .get(`/apiserver/Accounts/${accountId}/Calls/CA_QUIET`)
                .query({})
                .reply(200, { callId: "CA_QUIET", status: "completed" })
            const { stdout } = await runCommand(["calls:get", "CA_QUIET", "--quiet"])
            expect(stdout.trim()).to.equal("CA_QUIET")
        })
    })

    describe("fields filtering", () => {
        it("limits json output to the requested fields", async () => {
            const accountId = await cred.accountId
            nock("https://www.freeclimb.com")
                .get(`/apiserver/Accounts/${accountId}/Calls/CA_FIELDS`)
                .query({})
                .reply(200, { callId: "CA_FIELDS", status: "completed", from: "+1111", to: "+2222" })
            const { stdout } = await runCommand([
                "calls:get",
                "CA_FIELDS",
                "--fields",
                "callId,status",
                "--json",
            ])
            const parsed = JSON.parse(stdout)
            expect(parsed.data).to.deep.equal({ callId: "CA_FIELDS", status: "completed" })
        })
    })

    describe("json envelope", () => {
        it("wraps successful responses with success/data/metadata", async () => {
            const accountId = await cred.accountId
            nock("https://www.freeclimb.com")
                .get(`/apiserver/Accounts/${accountId}/Calls/CA_ENVELOPE`)
                .query({})
                .reply(200, { callId: "CA_ENVELOPE" })
            const { stdout } = await runCommand(["calls:get", "CA_ENVELOPE", "--json"])
            const parsed = JSON.parse(stdout)
            expect(parsed.success).to.equal(true)
            expect(parsed.data).to.deep.equal({ callId: "CA_ENVELOPE" })
            expect(parsed.metadata.timestamp).to.be.a("string")
        })
    })

    describe("204 handling", () => {
        it("renders a human success message", async () => {
            const accountId = await cred.accountId
            nock("https://www.freeclimb.com")
                .get(`/apiserver/Accounts/${accountId}/Calls/CA_204`)
                .query({})
                .reply(204, "")
            const { stdout } = await runCommand(["calls:get", "CA_204"])
            expect(stdout).to.contain(
                "Received a success code from FreeClimb. There is no further output.",
            )
        })

        it("wraps 204 responses in a null-data json envelope", async () => {
            const accountId = await cred.accountId
            nock("https://www.freeclimb.com")
                .get(`/apiserver/Accounts/${accountId}/Calls/CA_204_JSON`)
                .query({})
                .reply(204, "")
            const { stdout } = await runCommand(["calls:get", "CA_204_JSON", "--json"])
            const parsed = JSON.parse(stdout)
            expect(parsed.success).to.equal(true)
            expect(parsed.data).to.equal(null)
            expect(parsed.metadata.request).to.deep.equal({
                method: "GET",
                endpoint: "Calls/CA_204_JSON",
            })
        })
    })

    describe("dry run", () => {
        it("previews the request without calling the API", async () => {
            nock.disableNetConnect()
            try {
                const { stdout } = await runCommand([
                    "sms:send",
                    "+1111",
                    "+2222",
                    "Hello",
                    "--dry-run",
                    "--json",
                ])
                const parsed = JSON.parse(stdout)
                expect(parsed.dryRun).to.equal(true)
                expect(parsed.method).to.equal("POST")
                expect(parsed.endpoint).to.equal("Messages")
                expect(parsed.body).to.deep.equal({ from: "+1111", to: "+2222", text: "Hello" })
            } finally {
                nock.enableNetConnect()
            }
        })
    })

    describe("pagination", () => {
        afterEach(() => {
            delete process.env.FREECLIMB_CALLS_LIST_NEXT
            const dataDir = path.join(os.homedir(), ".local", "share", "freeclimb-cli")
            new Environment(dataDir).clearString("FREECLIMB_CALLS_LIST_NEXT")
        })

        it("errors with NoNextPage when no cursor is available", async () => {
            process.env.FREECLIMB_CALLS_LIST_NEXT = "freeclimbUnnamedTest"
            const { error } = await runCommand(["calls:list", "--next"])
            expect(error?.oclif?.exit).to.equal(3)
        })

        it("prints the last-page banner when nextPageUri is null", async () => {
            const accountId = await cred.accountId
            nock("https://www.freeclimb.com")
                .get(`/apiserver/Accounts/${accountId}/Calls`)
                .query({ cursor: "executorTestCursor" })
                .reply(200, {
                    total: 1,
                    start: 0,
                    end: 0,
                    page: 1,
                    numPages: 1,
                    pageSize: 100,
                    nextPageUri: null,
                })
            process.env.FREECLIMB_CALLS_LIST_NEXT = "executorTestCursor"
            const { stdout } = await runCommand(["calls:list", "--next", "--json"])
            expect(stdout).to.contain("== You are on the last page of output. ==")
        })

        it("fetches the next page when a cursor is available", async () => {
            const accountId = await cred.accountId
            nock("https://www.freeclimb.com")
                .get(`/apiserver/Accounts/${accountId}/Calls`)
                .query({ cursor: "executorTestCursor" })
                .reply(200, {
                    total: 2,
                    start: 0,
                    end: 0,
                    page: 1,
                    numPages: 2,
                    pageSize: 100,
                    nextPageUri: `https://www.freeclimb.com/apiserver/Accounts/${accountId}/Calls?cursor=executorTestCursor2`,
                })
            process.env.FREECLIMB_CALLS_LIST_NEXT = "executorTestCursor"
            const { stdout } = await runCommand(["calls:list", "--next", "--json"])
            expect(stdout).to.contain('"page": 1')
        })
    })

    describe("validation rejection", () => {
        it("rejects invalid resource ids before calling the API", async () => {
            nock.disableNetConnect()
            try {
                const { error } = await runCommand(["calls:get", "CA#123"])
                expect(error?.message).to.contain("invalid character '#'")
            } finally {
                nock.enableNetConnect()
            }
        })
    })

    describe("api error mapping", () => {
        it("maps HTTP error responses to FreeClimbAPIError exit codes", async () => {
            const accountId = await cred.accountId
            nock("https://www.freeclimb.com")
                .get(`/apiserver/Accounts/${accountId}/Calls/CA_API_ERROR`)
                .query({})
                .reply(500, { code: 2, message: "Method Not Allowed" })
            const { error } = await runCommand(["calls:get", "CA_API_ERROR"])
            expect(error?.oclif?.exit).to.equal(3)
        })

        it("maps network errors to DefaultFatalError exit code 4", async () => {
            const accountId = await cred.accountId
            nock("https://www.freeclimb.com")
                .get(`/apiserver/Accounts/${accountId}/Calls/CA_NETWORK_ERROR`)
                .query({})
                .replyWithError("simulated network failure")
            const { error } = await runCommand(["calls:get", "CA_NETWORK_ERROR"])
            expect(error?.oclif?.exit).to.equal(4)
        })
    })
})
