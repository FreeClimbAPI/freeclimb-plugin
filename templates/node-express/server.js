require("dotenv").config()

const express = require("express")
const {
    createConfiguration,
    DefaultApi,
    PerclScript,
    Say,
    GetDigits,
    Redirect,
    Hangup,
    RecordUtterance,
    Sms,
} = require("@freeclimb/sdk")

const PORT = Number(process.env.PORT || 3000)
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`
const FREECLIMB_NUMBER = process.env.FREECLIMB_NUMBER

const api = new DefaultApi(
    createConfiguration({
        accountId: process.env.FREECLIMB_ACCOUNT_ID,
        apiKey: process.env.FREECLIMB_API_KEY,
    }),
)

const STOP_WORDS = new Set(["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"])

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const url = (path) => `${BASE_URL}${path}`
const percl = (commands, res) => res.status(200).json(new PerclScript({ commands }).build())

app.post("/voice", (req, res) => {
    percl(
        [
            new GetDigits({
                actionUrl: url("/menu"),
                prompts: [new Say({ text: "Thanks for calling. Press 1 for sales, or 2 for support." })],
                maxDigits: 1,
                minDigits: 1,
                flushBuffer: true,
                initialTimeoutMs: 8000,
            }),
        ],
        res,
    )
})

app.post("/menu", (req, res) => {
    const digits = req.body.digits
    if (digits === "1") return percl([new Redirect({ actionUrl: url("/sales") })], res)
    if (digits === "2") return percl([new Redirect({ actionUrl: url("/support") })], res)
    return percl([new Redirect({ actionUrl: url("/voicemail") })], res)
})

app.post("/sales", (req, res) => {
    percl([new Say({ text: "Our sales team will follow up shortly. Goodbye." }), new Hangup({})], res)
})

app.post("/support", (req, res) => {
    percl([new Say({ text: "Our support team will follow up shortly. Goodbye." }), new Hangup({})], res)
})

app.post("/voicemail", (req, res) => {
    percl(
        [
            new Say({ text: "Please leave a message after the beep. Press pound when finished." }),
            new RecordUtterance({
                actionUrl: url("/voicemail-saved"),
                silenceTimeoutMs: 5000,
                maxLengthSec: 120,
                finishOnKey: "#",
                playBeep: true,
            }),
        ],
        res,
    )
})

app.post("/voicemail-saved", (req, res) => {
    percl([new Say({ text: "Thanks. Your message has been recorded. Goodbye." }), new Hangup({})], res)
})

app.post("/sms-inbound", (req, res) => {
    const from = req.body.from
    const text = String(req.body.text || "").trim().toUpperCase()
    let reply = "Thanks for your message. Reply HELP for options or STOP to unsubscribe."
    if (STOP_WORDS.has(text)) {
        reply = "You are unsubscribed and will receive no more messages. Reply HELP for help."
    } else if (text === "HELP" || text === "INFO") {
        reply = "This is the demo line. Reply STOP to unsubscribe. Message and data rates may apply."
    }
    percl([new Sms({ to: from, from: FREECLIMB_NUMBER, text: reply })], res)
})

app.post("/send-sms", async (req, res) => {
    try {
        const { to, text } = req.body
        const result = await api.sendAnSmsMessage({ _from: FREECLIMB_NUMBER, to, text })
        res.json({ ok: true, messageId: result.messageId })
    } catch (err) {
        res.status(500).json({ ok: false, error: err && err.message ? err.message : String(err) })
    }
})

app.post("/status", (req, res) => res.sendStatus(200))

app.get("/health", (req, res) => res.json({ status: "ok", baseUrl: BASE_URL }))

app.listen(PORT, () => {
    console.log(`FreeClimb starter listening on ${BASE_URL} (port ${PORT})`)
})
