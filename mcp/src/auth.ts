import { createServer } from "node:http"
import type { IncomingMessage, ServerResponse } from "node:http"
import { randomBytes, timingSafeEqual } from "node:crypto"
import { spawn } from "node:child_process"
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { cred, getBaseUrl, rejectControlChars } from "@freeclimb/core"

const LOOPBACK_HOST = "127.0.0.1"
const AUTH_TTL_MS = 5 * 60 * 1000
const DASHBOARD_CREDENTIALS_URL = "https://freeclimb.com/dashboard/login/"
const LOGIN_BACKGROUND = readFileSync(new URL("../assets/FC_login_background.webp", import.meta.url))
const LOGIN_LOGO = readFileSync(new URL("../assets/FreeClimb_Logo.svg", import.meta.url))
const SETUP_MARKER = join(homedir(), ".cursor", ".freeclimb-setup-complete")
const CREDENTIAL_ENVIRONMENT_VARIABLES = [
    "FREECLIMB_ACCOUNT_ID",
    "FREECLIMB_API_KEY",
    "ACCOUNT_ID",
    "API_KEY",
]

function writeSetupMarker(): void {
    try {
        const dir = join(homedir(), ".cursor")
        mkdirSync(dir, { recursive: true })
        writeFileSync(SETUP_MARKER, "")
    } catch {
    }
}

function removeSetupMarker(markerPath = SETUP_MARKER): void {
    try {
        rmSync(markerPath, { force: true })
    } catch {
    }
}

export function configuredCredentialEnvironmentVariables(
    environment: NodeJS.ProcessEnv = process.env,
): string[] {
    return CREDENTIAL_ENVIRONMENT_VARIABLES.filter((name) => Boolean(environment[name]))
}

export async function verifyCredentials(
    accountId: string,
    apiKey: string,
    request: typeof fetch = fetch,
): Promise<string | undefined> {
    try {
        const response = await request(`${getBaseUrl()}/Accounts/${encodeURIComponent(accountId)}`, {
            method: "GET",
            headers: {
                Accept: "application/json",
                Authorization: `Basic ${Buffer.from(`${accountId}:${apiKey}`).toString("base64")}`,
            },
        })
        if (response.ok) return undefined
        if (response.status === 401 || response.status === 403) {
            return "Those credentials are not authorized for the configured FreeClimb environment. Confirm that the Account ID and API Key are a matching pair."
        }
        return `FreeClimb credential verification returned HTTP ${response.status}. Your saved account was not changed.`
    } catch {
        return "FreeClimb credential verification could not reach the configured API environment. Your saved account was not changed."
    }
}

export async function connectCredentials(
    accountId: string,
    apiKey: string,
    credentials: Pick<typeof cred, "setCredentials"> = cred,
    request: typeof fetch = fetch,
    markSetup: () => void = writeSetupMarker,
): Promise<string | undefined> {
    const verificationError = await verifyCredentials(accountId, apiKey, request)
    if (verificationError) return verificationError
    await credentials.setCredentials(accountId, apiKey)
    markSetup()
    return undefined
}

export async function runLogout(
    credentials: Pick<typeof cred, "removeCredentials"> = cred,
    markerPath = SETUP_MARKER,
    environment: NodeJS.ProcessEnv = process.env,
): Promise<string[]> {
    await credentials.removeCredentials()
    removeSetupMarker(markerPath)
    return configuredCredentialEnvironmentVariables(environment)
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
  :root { --card:#00333f; --lime:#c2ff18; --white:#fff; --muted:rgba(255,255,255,.8); --border:#a1d0d3; }
  * { box-sizing:border-box; }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; font-family:"Open Sans",Arial,sans-serif; color:var(--white); background-color:#00333f; background-image:linear-gradient(to bottom right,#00333f90 30%,#89bb61 120%),url("/assets/login-background"); background-position:center; background-size:cover; background-repeat:no-repeat; }
  .card { width:452px; max-width:100%; padding:48px 40px; border-radius:8px; background:var(--card); }
  .brand { display:flex; align-items:center; justify-content:center; gap:10px; margin:0 0 32px; color:var(--white); font-size:32px; font-weight:600; line-height:32px; }
  .brand-logo { display:block; width:174px; height:25px; }
  h1 { margin:0 0 16px; text-align:center; font-size:24px; line-height:32px; font-weight:400; }
  .intro { margin:0 0 32px; color:var(--muted); text-align:center; font-size:14px; line-height:1.55; }
  .intro a { color:var(--lime); font-weight:600; text-decoration:none; }
  .intro a:hover { text-decoration:underline; }
  label { display:block; margin:0 0 2px; color:var(--muted); font-size:14px; font-weight:500; }
  input { width:100%; height:44px; margin:0 0 24px; padding:12px; border:1px solid var(--border); outline:0; background:var(--card); color:var(--muted); font:14px/24px "Open Sans",Arial,sans-serif; }
  input::placeholder { color:#a3a3a3; }
  input:focus { border-color:var(--lime); }
  button { width:100%; margin-top:8px; padding:16px; border:0; border-radius:48px; background:var(--lime); color:#004e63; font-size:15px; font-weight:600; cursor:pointer; }
  button:hover { background:#d0ff4d; }
  .error { margin:0 0 20px; padding:10px 12px; border:1px solid #ff9b81; border-radius:4px; background:rgba(250,102,10,.15); color:#ffd6cc; font-size:13px; line-height:1.45; }
  .hint { margin:20px 0 0; color:var(--muted); text-align:center; font-size:11px; line-height:1.5; }
  @media (max-width:520px) { body { padding:16px; } .card { padding:40px 24px; } }
</style>
</head>
<body>
  <form class="card" method="POST" action="/callback">
    <div class="brand"><img class="brand-logo" src="/assets/login-logo" alt="FreeClimb" /><span>Plugin</span></div>
    <h1>Connect your account</h1>
    <p class="intro">Enter the Account ID and API Key from your <a href="${DASHBOARD_CREDENTIALS_URL}" target="_blank" rel="noreferrer noopener">FreeClimb Dashboard</a>.</p>
    ${errorBlock}
    <input type="hidden" name="state" value="${state}" />
    <label for="accountId">Account ID</label>
    <input id="accountId" name="accountId" autocomplete="off" spellcheck="false" placeholder="AC..." required />
    <label for="apiKey">API Key</label>
    <input id="apiKey" name="apiKey" type="password" autocomplete="off" spellcheck="false" placeholder="Your API key" required />
    <button type="submit">Connect</button>
    <p class="hint">This page runs only on your device. Your credentials are saved to your system keychain and never sent to chat.</p>
  </form>
</body>
</html>`
}

function successPage(): string {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>Connected</title>
<style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:"Open Sans",Arial,sans-serif;background-color:#00333f;background-image:linear-gradient(to bottom right,#00333f90 30%,#89bb61 120%),url("/assets/login-background");background-position:center;background-size:cover;background-repeat:no-repeat;color:#fff}.c{width:452px;max-width:100%;padding:48px 40px;border-radius:8px;background:#00333f;text-align:center}.l{color:#c2ff18;font-size:40px}p{color:rgba(255,255,255,.8)}</style>
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
                if (req.method === "GET" && url.pathname === "/assets/login-background") {
                    res.writeHead(200, {
                        "Content-Type": "image/webp",
                        "Cache-Control": "public, max-age=300",
                    })
                    res.end(LOGIN_BACKGROUND)
                    return
                }
                if (req.method === "GET" && url.pathname === "/assets/login-logo") {
                    res.writeHead(200, {
                        "Content-Type": "image/svg+xml",
                        "Cache-Control": "public, max-age=300",
                    })
                    res.end(LOGIN_LOGO)
                    return
                }
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
                    const verificationError = await connectCredentials(accountId, apiKey)
                    if (verificationError) {
                        res.writeHead(401, { "Content-Type": "text/html; charset=utf-8" })
                        res.end(renderPage(state, verificationError))
                        return
                    }
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
            console.error("FreeClimb login: opening your browser to connect your account.")
            console.error(`If it does not open, visit: ${localUrl}`)
            openBrowser(localUrl)
        })
    })
}
