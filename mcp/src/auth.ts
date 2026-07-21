import { createServer } from "node:http"
import type { IncomingMessage, ServerResponse } from "node:http"
import { randomBytes, timingSafeEqual } from "node:crypto"
import { spawn } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { cred, rejectControlChars } from "@freeclimb/core"

const LOOPBACK_HOST = "127.0.0.1"
const AUTH_TTL_MS = 5 * 60 * 1000
const DASHBOARD_CREDENTIALS_URL = "https://www.freeclimb.com/dashboard/portal/account/credentials"

function writeSetupMarker(): void {
    try {
        const dir = join(homedir(), ".cursor")
        mkdirSync(dir, { recursive: true })
        writeFileSync(join(dir, ".freeclimb-setup-complete"), "")
    } catch {
        // Non-fatal: the marker is only a hint for the setup-nudge hook.
    }
}

function constantTimeEquals(a: string, b: string): boolean {
    const bufA = Buffer.from(a)
    const bufB = Buffer.from(b)
    if (bufA.length !== bufB.length) return false
    return timingSafeEqual(bufA, bufB)
}

function openBrowser(url: string): void {
    try {
        const platform = process.platform
        if (platform === "darwin") {
            spawn("open", [url], { detached: true, stdio: "ignore" }).unref()
        } else if (platform === "win32") {
            spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref()
        } else {
            spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref()
        }
    } catch {
        // Non-fatal: the user can open the printed URL manually.
    }
}

function renderPage(state: string, error?: string): string {
    const errorBlock = error
        ? `<p class="error">${error.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string)}</p>`
        : ""
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Connect FreeClimb</title>
<style>
  :root { --blue:#004e63; --blue2:#26697a; --lime:#c2ff18; --bg:#00333f; --bg2:#11242d; --white:rgba(255,255,255,.92); --muted:rgba(255,255,255,.62); --faint:rgba(255,255,255,.14); }
  * { box-sizing:border-box; }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; font-family:Helvetica,system-ui,sans-serif; color:var(--white); background:linear-gradient(135deg,var(--bg),var(--bg2)); padding:24px; }
  .card { width:100%; max-width:480px; background:rgba(0,55,68,.6); border:1px solid var(--faint); border-radius:16px; padding:28px; box-shadow:0 20px 60px rgba(0,0,0,.35); }
  .eyebrow { color:var(--lime); font-size:11px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; margin:0 0 6px; }
  h1 { font-size:22px; margin:0 0 8px; }
  p { color:var(--muted); font-size:14px; line-height:1.5; }
  a.dash { display:inline-block; margin:6px 0 18px; color:var(--lime); font-weight:700; text-decoration:none; }
  label { display:block; font-size:12px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; color:var(--muted); margin:14px 0 6px; }
  input { width:100%; padding:11px 12px; border-radius:10px; border:1px solid var(--faint); background:rgba(0,0,0,.25); color:var(--white); font-size:14px; font-family:ui-monospace,monospace; }
  button { margin-top:20px; width:100%; padding:12px; border:0; border-radius:999px; background:var(--lime); color:#06231a; font-weight:700; font-size:14px; cursor:pointer; }
  .error { color:#ffb4a1; background:rgba(250,102,10,.16); border:1px solid rgba(250,102,10,.4); padding:10px 12px; border-radius:10px; font-size:13px; }
  .hint { font-size:12px; color:var(--muted); margin-top:14px; }
</style>
</head>
<body>
  <form class="card" method="POST" action="/callback">
    <p class="eyebrow">FreeClimb · Connect</p>
    <h1>Connect your FreeClimb account</h1>
    <p>Open your FreeClimb Dashboard, copy your <strong>Account ID</strong> and <strong>API Key</strong>, and paste them below. They are stored only in your operating system's secure keychain on this machine.</p>
    <a class="dash" href="${DASHBOARD_CREDENTIALS_URL}" target="_blank" rel="noreferrer noopener">Open FreeClimb Dashboard → API Credentials ↗</a>
    ${errorBlock}
    <input type="hidden" name="state" value="${state}" />
    <label for="accountId">Account ID</label>
    <input id="accountId" name="accountId" autocomplete="off" spellcheck="false" placeholder="AC..." required />
    <label for="apiKey">API Key</label>
    <input id="apiKey" name="apiKey" type="password" autocomplete="off" spellcheck="false" placeholder="Your API key" required />
    <button type="submit">Connect</button>
    <p class="hint">This page is served locally on ${LOOPBACK_HOST} and shuts down as soon as you connect. Nothing is sent to the chat.</p>
  </form>
</body>
</html>`
}

function successPage(): string {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>Connected</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:Helvetica,system-ui,sans-serif;background:linear-gradient(135deg,#00333f,#11242d);color:rgba(255,255,255,.92)}.c{text-align:center;padding:32px}.l{color:#c2ff18;font-size:40px}</style>
</head><body><div class="c"><div class="l">✓</div><h1>FreeClimb connected</h1><p>You can close this tab and return to your editor.</p></div></body></html>`
}

function readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        let data = ""
        let tooLarge = false
        req.on("data", (chunk) => {
            data += chunk
            if (data.length > 16_384) {
                tooLarge = true
                req.destroy()
            }
        })
        req.on("end", () => (tooLarge ? reject(new Error("Request too large")) : resolve(data)))
        req.on("error", reject)
    })
}

function parseForm(body: string): Record<string, string> {
    const params = new URLSearchParams(body)
    const out: Record<string, string> = {}
    for (const [k, v] of params.entries()) out[k] = v
    return out
}

/**
 * Run the self-initiated local browser auth flow. Binds a one-shot loopback
 * server to 127.0.0.1, opens the browser, captures Account ID + API Key from a
 * local page, writes them to the OS keyring, then shuts down. Never logs the key.
 */
export function runLoginFlow(): Promise<void> {
    const state = randomBytes(32).toString("hex")

    return new Promise<void>((resolve, reject) => {
        let settled = false
        const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
            try {
                const url = new URL(req.url || "/", `http://${LOOPBACK_HOST}`)
                if (req.method === "GET" && url.pathname === "/") {
                    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
                    res.end(renderPage(state))
                    return
                }
                if (req.method === "POST" && url.pathname === "/callback") {
                    const form = parseForm(await readBody(req))
                    if (!form.state || !constantTimeEquals(form.state, state)) {
                        res.writeHead(403, { "Content-Type": "text/html; charset=utf-8" })
                        res.end(renderPage(state, "Security token mismatch. Please retry."))
                        return
                    }
                    const accountId = (form.accountId || "").trim()
                    const apiKey = (form.apiKey || "").trim()
                    try {
                        rejectControlChars(accountId, "accountId")
                        rejectControlChars(apiKey, "apiKey")
                    } catch {
                        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" })
                        res.end(renderPage(state, "Invalid characters in credentials."))
                        return
                    }
                    if (!accountId || !apiKey) {
                        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" })
                        res.end(renderPage(state, "Both Account ID and API Key are required."))
                        return
                    }
                    await cred.removeCredentials()
                    await cred.setCredentials(accountId, apiKey)
                    writeSetupMarker()
                    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
                    res.once("finish", () => finish(resolve))
                    res.end(successPage())
                    return
                }
                res.writeHead(404, { "Content-Type": "text/plain" })
                res.end("Not found")
            } catch (err) {
                res.writeHead(500, { "Content-Type": "text/plain" })
                res.end("Internal error")
                finish(() => reject(err instanceof Error ? err : new Error(String(err))))
            }
        })

        const timeout = setTimeout(() => {
            finish(() => reject(new Error("Login timed out. Please run the login command again.")))
        }, AUTH_TTL_MS)
        timeout.unref()

        function finish(action: () => void): void {
            if (settled) return
            settled = true
            clearTimeout(timeout)
            server.close()
            server.closeAllConnections()
            setTimeout(action, 50)
        }

        server.on("error", (err) => finish(() => reject(err)))
        server.listen(0, LOOPBACK_HOST, () => {
            const address = server.address()
            const port = typeof address === "object" && address ? address.port : 0
            const localUrl = `http://${LOOPBACK_HOST}:${port}/`
            // Safe to print here: this runs in the standalone `login` process, not
            // the stdio JSON-RPC server. The API key is never printed.
            console.error("FreeClimb login: opening your browser to connect your account.")
            console.error(`If it does not open, visit: ${localUrl}`)
            openBrowser(localUrl)
        })
    })
}
