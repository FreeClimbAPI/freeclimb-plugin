import http from "node:http"

const port = Number(process.env.PORT || 3000)
const baseUrl = process.env.BASE_URL || `http://localhost:${port}`

function percl(res, commands) {
  res.writeHead(200, { "content-type": "application/json" })
  res.end(JSON.stringify(commands))
}

function json(res, body) {
  res.writeHead(200, { "content-type": "application/json" })
  res.end(JSON.stringify(body))
}

function parseBody(req) {
  return new Promise((resolve) => {
    let raw = ""
    req.on("data", (chunk) => {
      raw += chunk
    })
    req.on("end", () => {
      const contentType = req.headers["content-type"] || ""
      if (contentType.includes("application/json")) {
        try {
          resolve(raw ? JSON.parse(raw) : {})
        } catch {
          resolve({})
        }
        return
      }
      const params = new URLSearchParams(raw)
      resolve(Object.fromEntries(params.entries()))
    })
  })
}

async function handle(req, res) {
  const url = new URL(req.url || "/", baseUrl)

  if (req.method === "GET" && url.pathname === "/health") {
    json(res, { ok: true, service: "freeclimb-ivr-support-line-demo" })
    return
  }

  if (req.method !== "POST") {
    res.writeHead(404, { "content-type": "application/json" })
    res.end(JSON.stringify({ error: "Not found" }))
    return
  }

  const body = await parseBody(req)

  if (url.pathname === "/voice") {
    percl(res, [
      {
        GetDigits: {
          actionUrl: `${baseUrl}/menu`,
          prompts: [
            {
              Say: {
                text: "Thanks for calling FreeClimb demo support. Press 1 for sales, 2 for support, or any other key to leave a voicemail."
              }
            }
          ],
          maxDigits: 1,
          minDigits: 1,
          initialTimeoutMs: 8000,
          digitTimeoutMs: 5000,
          flushBuffer: true
        }
      }
    ])
    return
  }

  if (url.pathname === "/menu") {
    if (body.digits === "1") {
      percl(res, [{ Redirect: { actionUrl: `${baseUrl}/sales` } }])
      return
    }
    if (body.digits === "2") {
      percl(res, [{ Redirect: { actionUrl: `${baseUrl}/support` } }])
      return
    }
    percl(res, [{ Redirect: { actionUrl: `${baseUrl}/voicemail` } }])
    return
  }

  if (url.pathname === "/sales") {
    percl(res, [
      { Say: { text: "Sales is unavailable right now, but we received your request. Thanks for calling." } },
      { Hangup: {} }
    ])
    return
  }

  if (url.pathname === "/support") {
    percl(res, [
      { Say: { text: "Support is unavailable right now, but your call has been logged. Thanks for calling." } },
      { Hangup: {} }
    ])
    return
  }

  if (url.pathname === "/voicemail") {
    percl(res, [
      { Say: { text: "Please leave a short message after the beep. Press pound when finished." } },
      {
        RecordUtterance: {
          actionUrl: `${baseUrl}/voicemail-saved`,
          silenceTimeoutMs: 5000,
          maxLengthSec: 120,
          finishOnKey: "#",
          playBeep: true
        }
      }
    ])
    return
  }

  if (url.pathname === "/voicemail-saved") {
    percl(res, [
      { Say: { text: "Thanks. Your message has been recorded. Goodbye." } },
      { Hangup: {} }
    ])
    return
  }

  res.writeHead(404, { "content-type": "application/json" })
  res.end(JSON.stringify({ error: "Not found" }))
}

http.createServer((req, res) => {
  handle(req, res).catch(() => {
    res.writeHead(500, { "content-type": "application/json" })
    res.end(JSON.stringify({ error: "Internal server error" }))
  })
}).listen(port, () => {
  console.log(`FreeClimb IVR support line demo running on http://localhost:${port}`)
})
