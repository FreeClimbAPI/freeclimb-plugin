require("dotenv").config()

const crypto = require("node:crypto")
const express = require("express")
const { createConfiguration, DefaultApi, GetDigits, PerclScript, Say, Sms } = require("@freeclimb/sdk")

const STOP_WORDS = new Set(["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"])
const SIGNATURE_TOLERANCE_SECONDS = 300

function verifyRequestSignature(rawBody, header, signingSecret, now = Math.floor(Date.now() / 1000)) {
    if (typeof rawBody !== "string" || typeof header !== "string" || !signingSecret) {
        return false
    }
    const timestamps = []
    const signatures = []
    for (const item of header.split(",")) {
        const separator = item.indexOf("=")
        if (separator < 1) {
            continue
        }
        const key = item.slice(0, separator).trim()
        const value = item.slice(separator + 1).trim()
        if (key === "t") {
            timestamps.push(value)
        } else if (key === "v1") {
            signatures.push(value)
        }
    }
    if (timestamps.length !== 1 || signatures.length === 0 || !/^\d+$/.test(timestamps[0])) {
        return false
    }
    const timestamp = Number(timestamps[0])
    if (!Number.isSafeInteger(timestamp) || Math.abs(now - timestamp) > SIGNATURE_TOLERANCE_SECONDS) {
        return false
    }
    const expected = crypto
        .createHmac("sha256", signingSecret)
        .update(`${timestamps[0]}.${rawBody}`)
        .digest()
    let verified = false
    for (const signature of signatures) {
        if (!/^[\da-f]{64}$/i.test(signature)) {
            continue
        }
        const candidate = Buffer.from(signature, "hex")
        const matches = crypto.timingSafeEqual(expected, candidate)
        verified = matches || verified
    }
    return verified
}

function loadConfig(overrides = {}) {
    const config = {
        port: Number(process.env.PORT || 3000),
        baseUrl: process.env.BASE_URL,
        accountId: process.env.FREECLIMB_ACCOUNT_ID,
        apiKey: process.env.FREECLIMB_API_KEY,
        signingSecret: process.env.FREECLIMB_SIGNING_SECRET,
        freeclimbNumber: process.env.FREECLIMB_NUMBER,
        ...overrides,
    }
    const required = ["baseUrl", "accountId", "apiKey", "signingSecret", "freeclimbNumber"]
    for (const key of required) {
        if (!config[key]) {
            throw new Error(`${key} is required`)
        }
    }
    const baseUrl = new URL(config.baseUrl)
    if (baseUrl.protocol !== "https:" || !baseUrl.hostname) {
        throw new Error("BASE_URL must be an absolute HTTPS URL")
    }
    config.baseUrl = baseUrl.toString().replace(/\/$/, "")
    return config
}

function createApp(overrides = {}) {
    const config = loadConfig(overrides)
    const app = express()
    const captureRawBody = (req, res, buffer) => {
        req.rawBody = buffer.toString("utf8")
    }
    app.use(express.json({ verify: captureRawBody }))
    app.use(express.urlencoded({ extended: true, verify: captureRawBody }))
    app.locals.freeclimbApi = new DefaultApi(
        createConfiguration({
            accountId: config.accountId,
            apiKey: config.apiKey,
        }),
    )

    const verifySignature = (req, res, next) => {
        if (verifyRequestSignature(req.rawBody, req.get("FreeClimb-Signature"), config.signingSecret)) {
            next()
        } else {
            res.status(401).json({ error: "Invalid signature" })
        }
    }
    const percl = (commands, res) => res.status(200).json(new PerclScript({ commands }).build())

    app.get("/health", (req, res) => res.json({ status: "ok" }))

    app.post("/voice", verifySignature, (req, res) => {
        percl(
            [
                new GetDigits({
                    actionUrl: `${config.baseUrl}/menu`,
                    prompts: [new Say({ text: "Thanks for calling. Press 1 for sales or 2 for support." })],
                    maxDigits: 1,
                    minDigits: 1,
                }),
            ],
            res,
        )
    })

    app.post("/menu", verifySignature, (req, res) => {
        const text =
            req.body.digits === "1"
                ? "Sales will contact you shortly. Goodbye."
                : req.body.digits === "2"
                  ? "Support will contact you shortly. Goodbye."
                  : "That selection was not recognized. Goodbye."
        percl([new Say({ text })], res)
    })

    app.post("/sms-inbound", verifySignature, (req, res) => {
        const inboundText = String(req.body.text || "").trim().toUpperCase()
        let reply = "Thanks for your message. Reply HELP for help or STOP to unsubscribe."
        if (STOP_WORDS.has(inboundText)) {
            reply = "You are unsubscribed and will receive no more messages. Reply HELP for help."
        } else if (inboundText === "HELP" || inboundText === "INFO") {
            reply = "FreeClimb demo: webhook replies. Reply STOP to unsubscribe."
        }
        percl([new Sms({ to: req.body.from, from: config.freeclimbNumber, text: reply })], res)
    })

    return app
}

if (require.main === module) {
    const config = loadConfig()
    createApp(config).listen(config.port)
}

module.exports = { createApp, loadConfig, verifyRequestSignature }
