const assert = require("node:assert/strict")
const crypto = require("node:crypto")
const test = require("node:test")
const request = require("supertest")

const fixtures = require("../contract-fixtures.json")
const { createApp, loadConfig } = require("./server")

const signingSecret = "test-signing-secret"
const config = {
    baseUrl: fixtures.baseUrl,
    accountId: "test-account",
    apiKey: "test-api-key",
    signingSecret,
    freeclimbNumber: fixtures.sms.request.to,
}

function signature(body, timestamp = Math.floor(Date.now() / 1000)) {
    const digest = crypto.createHmac("sha256", signingSecret).update(`${timestamp}.${body}`).digest("hex")
    return `t=${timestamp},v1=${"0".repeat(64)},v1=${digest}`
}

function signedRequest(app, contract) {
    const method = contract.method.toLowerCase()
    const payload = contract.request
    const body = JSON.stringify(payload)
    return request(app)[method](contract.path)
        .set("Content-Type", "application/json")
        .set("FreeClimb-Signature", signature(body))
        .send(body)
}

test("health route does not require a signature", async () => {
    const method = fixtures.health.method.toLowerCase()
    const response = await request(createApp(config))[method](fixtures.health.path)
    assert.equal(response.status, 200)
    assert.deepEqual(response.body, { status: fixtures.health.status })
})

test("voice route returns SDK-built PerCL with an absolute HTTPS action URL", async () => {
    const response = await signedRequest(createApp(config), fixtures.voice)
    assert.equal(response.status, 200)
    const command = response.body[0][fixtures.voice.requiredCommand]
    assert.equal(command.actionUrl, fixtures.voice.actionUrl)
    assert.equal(command.maxDigits, fixtures.voice.maxDigits)
})

test("menu route returns SDK-built PerCL", async () => {
    const contract = {
        method: fixtures.voice.method,
        path: new URL(fixtures.voice.actionUrl).pathname,
        request: { digits: "1" },
    }
    const response = await signedRequest(createApp(config), contract)
    assert.equal(response.status, 200)
    assert.equal(response.body[0].Say.text, "Sales will contact you shortly. Goodbye.")
})

test("SMS route returns SDK-built PerCL without making a network request", async () => {
    const response = await signedRequest(createApp(config), fixtures.sms)
    assert.equal(response.status, 200)
    const command = response.body[0][fixtures.sms.requiredCommand]
    assert.equal(command.to, fixtures.sms.request.from)
    assert.equal(command.from, fixtures.sms.request.to)
    assert.equal(command.text, fixtures.sms.replyText)
})

test("webhook routes reject invalid signatures", async () => {
    const body = JSON.stringify(fixtures.voice.request)
    const timestamp = Math.floor(Date.now() / 1000)
    const response = await request(createApp(config))
        [fixtures.voice.method.toLowerCase()](fixtures.voice.path)
        .set("Content-Type", "application/json")
        .set("FreeClimb-Signature", `t=${timestamp},v1=${"0".repeat(64)}`)
        .send(body)
    assert.equal(response.status, 401)
})

test("webhook routes reject future timestamps beyond tolerance", async () => {
    const body = JSON.stringify(fixtures.voice.request)
    const timestamp = Math.floor(Date.now() / 1000) + 301
    const response = await request(createApp(config))
        [fixtures.voice.method.toLowerCase()](fixtures.voice.path)
        .set("Content-Type", "application/json")
        .set("FreeClimb-Signature", signature(body, timestamp))
        .send(body)
    assert.equal(response.status, 401)
})

test("configuration rejects non-HTTPS BASE_URL values", () => {
    assert.throws(() => loadConfig({ ...config, baseUrl: "http://localhost:3000" }), /absolute HTTPS/)
})
