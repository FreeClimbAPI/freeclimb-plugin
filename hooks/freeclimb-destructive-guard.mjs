const GUARDED = {
    make_call: "place an outbound call (billable)",
    send_sms: "send an SMS message (billable)",
    update_call: "change or hang up a live call",
    buy_number: "purchase a phone number (billable and not reversible)",
    release_number: "release a phone number (not reversible)",
    delete_application: "delete an application (not reversible)",
}

function readStdin() {
    return new Promise((resolve) => {
        let data = ""
        process.stdin.setEncoding("utf8")
        process.stdin.on("data", (c) => (data += c))
        process.stdin.on("end", () => resolve(data))
        process.stdin.on("error", () => resolve(data))
    })
}

function extractToolName(payload) {
    const candidates = [
        payload?.tool_name,
        payload?.toolName,
        payload?.name,
        payload?.tool?.name,
        payload?.params?.name,
        payload?.params?.tool_name,
        payload?.request?.params?.name,
    ]
    return candidates.find((c) => typeof c === "string")
}

function allow() {
    process.stdout.write(JSON.stringify({ permission: "allow" }))
}

function extractArgs(payload) {
    return payload?.tool_input ?? payload?.arguments ?? payload?.params?.arguments ?? payload?.input ?? {}
}

function allowedDestinations() {
    const raw = process.env.FREECLIMB_ALLOWED_DESTINATIONS
    if (!raw) return null
    return new Set(
        raw
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
    )
}

const raw = await readStdin()
let payload
try {
    payload = JSON.parse(raw)
} catch {
    allow()
    process.exit(0)
}

const serverName = payload?.server_name ?? payload?.serverName ?? payload?.params?.server_name
if (typeof serverName === "string" && serverName.toLowerCase().indexOf("freeclimb") === -1) {
    allow()
    process.exit(0)
}

const tool = extractToolName(payload)
if (!tool || !(tool in GUARDED)) {
    allow()
    process.exit(0)
}

const action = GUARDED[tool]
const args = extractArgs(payload)
const allowlist = allowedDestinations()
const destination = typeof args?.to === "string" ? args.to : undefined

if (allowlist && (tool === "make_call" || tool === "send_sms")) {
    if (!destination || !allowlist.has(destination)) {
        process.stdout.write(
            JSON.stringify({
                permission: "deny",
                user_message: `Blocked: ${tool} target ${destination ?? "(none)"} is not in FREECLIMB_ALLOWED_DESTINATIONS.`,
                agent_message: `The ${tool} destination ${destination ?? "(none)"} is not on the configured allowlist (FREECLIMB_ALLOWED_DESTINATIONS). Do not retry; ask the user to add the number to the allowlist or perform the action manually.`,
            }),
        )
        process.exit(0)
    }
}

process.stdout.write(
    JSON.stringify({
        permission: "ask",
        user_message: `FreeClimb is about to ${action}${destination ? ` to ${destination}` : ""} via the ${tool} tool. Confirm to proceed.`,
        agent_message: `The ${tool} tool performs a billable or irreversible FreeClimb action (${action})${destination ? ` targeting ${destination}` : ""}. Confirm the destination/number and intent with the user before approving. On trial accounts, outbound calls/SMS only reach verified numbers.`,
    }),
)
process.exit(0)
