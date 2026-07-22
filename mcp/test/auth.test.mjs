import assert from "node:assert/strict"
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, it } from "node:test"
import {
    configuredCredentialEnvironmentVariables,
    connectCredentials,
    runLogout,
    verifyCredentials,
} from "../lib/auth.js"

describe("MCP authentication", () => {
    it("preserves saved credentials when verification is rejected", async () => {
        const writes = []
        let marked = false
        const error = await connectCredentials(
            "account",
            "key",
            {
                async setCredentials(accountId, apiKey) {
                    writes.push([accountId, apiKey])
                },
            },
            async () => new Response("", { status: 401 }),
            () => {
                marked = true
            },
        )

        assert.match(error, /not authorized/)
        assert.deepEqual(writes, [])
        assert.equal(marked, false)
    })

    it("stores verified credentials and marks setup complete", async () => {
        const writes = []
        let marked = false
        const error = await connectCredentials(
            "account",
            "key",
            {
                async setCredentials(accountId, apiKey) {
                    writes.push([accountId, apiKey])
                },
            },
            async () => new Response("", { status: 200 }),
            () => {
                marked = true
            },
        )

        assert.equal(error, undefined)
        assert.deepEqual(writes, [["account", "key"]])
        assert.equal(marked, true)
    })

    it("reports unreachable and unexpected verification responses", async () => {
        const unavailable = await verifyCredentials(
            "account",
            "key",
            async () => new Response("", { status: 503 }),
        )
        const unreachable = await verifyCredentials("account", "key", async () => {
            throw new Error("offline")
        })

        assert.match(unavailable, /HTTP 503/)
        assert.match(unreachable, /could not reach/)
    })

    it("removes credentials and the setup marker while reporting environment fallbacks", async () => {
        const directory = mkdtempSync(join(tmpdir(), "freeclimb-auth-"))
        const marker = join(directory, "setup-complete")
        writeFileSync(marker, "")
        let removed = false

        try {
            const variables = await runLogout(
                {
                    async removeCredentials() {
                        removed = true
                    },
                },
                marker,
                {
                    FREECLIMB_ACCOUNT_ID: "configured",
                    API_KEY: "configured",
                },
            )

            assert.equal(removed, true)
            assert.equal(existsSync(marker), false)
            assert.deepEqual(variables, ["FREECLIMB_ACCOUNT_ID", "API_KEY"])
        } finally {
            rmSync(directory, { recursive: true, force: true })
        }
    })

    it("does not report empty credential environment variables", () => {
        assert.deepEqual(
            configuredCredentialEnvironmentVariables({
                FREECLIMB_ACCOUNT_ID: "",
                FREECLIMB_API_KEY: "",
            }),
            [],
        )
    })
})
