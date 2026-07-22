import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { createCredentialStore } from "../lib/credentials.js"

function createMemoryKeyring() {
    const values = new Map()
    const entryFactory = (service, key) => ({
        deletePassword() {
            values.delete(`${service}:${key}`)
        },
        getPassword() {
            return values.get(`${service}:${key}`)
        },
        setPassword(value) {
            values.set(`${service}:${key}`, value)
        },
    })
    return { entryFactory, values }
}

describe("credentials", () => {
    it("reads Keychain changes immediately", async () => {
        const { entryFactory, values } = createMemoryKeyring()
        const store = createCredentialStore(entryFactory, {
            accountId: "environment-account",
            apiKey: "environment-key",
        })

        await store.setCredentials("first-account", "first-key")
        assert.equal(await store.accountId, "first-account")

        values.set("FreeClimbCoreTest:accountId", "second-account")
        values.set("FreeClimbCoreTest:apiKey", "second-key")

        assert.equal(await store.accountId, "second-account")
        assert.equal(await store.apiKey, "second-key")
    })

    it("uses environment credentials only when Keychain entries are absent", async () => {
        const { entryFactory } = createMemoryKeyring()
        const store = createCredentialStore(entryFactory, {
            accountId: "environment-account",
            apiKey: "environment-key",
        })

        assert.equal(await store.accountId, "environment-account")
        assert.equal(await store.apiKey, "environment-key")

        await store.setCredentials("keychain-account", "keychain-key")
        assert.equal(await store.accountId, "keychain-account")
        assert.equal(await store.apiKey, "keychain-key")

        await store.removeCredentials()
        assert.equal(await store.accountId, "environment-account")
        assert.equal(await store.apiKey, "environment-key")
    })
})
