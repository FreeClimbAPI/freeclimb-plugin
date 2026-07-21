import { formatDate, toText } from "./ui-format.js"

export interface CardField {
    kind?: "good" | "warn" | "neutral" | "mono"
    label: string
    value: string
}

export interface CardPayload {
    eyebrow: string
    fields: CardField[]
    title: string
}

function callStatusKind(status: string): CardField["kind"] {
    const s = status.toLowerCase()
    if (["completed", "inprogress"].includes(s)) return "good"
    if (["failed", "busy", "noanswer", "canceled"].includes(s)) return "warn"
    return "neutral"
}

export function buildAccountPayload(data: unknown): CardPayload {
    const a = (data ?? {}) as Record<string, unknown>
    const type = toText(a.type)
    const status = toText(a.status)
    const fields: CardField[] = [
        { label: "Account ID", value: toText(a.accountId), kind: "mono" },
        { label: "Type", value: type, kind: type.toLowerCase() === "trial" ? "warn" : "good" },
        {
            label: "Status",
            value: status,
            kind: status.toLowerCase() === "active" ? "good" : "warn",
        },
        { label: "Created", value: formatDate(a.dateCreatedISO ?? a.dateCreated) },
    ]
    return {
        eyebrow: "FreeClimb · Account",
        title: toText(a.alias) || "FreeClimb Account",
        fields: fields.filter((f) => f.value),
    }
}

export function buildCallPayload(data: unknown): CardPayload {
    const c = (data ?? {}) as Record<string, unknown>
    const status = toText(c.status)
    const fields: CardField[] = [
        { label: "Call ID", value: toText(c.callId), kind: "mono" },
        { label: "From", value: toText(c.from), kind: "mono" },
        { label: "To", value: toText(c.to), kind: "mono" },
        { label: "Status", value: status, kind: callStatusKind(status) },
        { label: "Direction", value: toText(c.direction) },
        { label: "Duration", value: c.duration != null ? `${toText(c.duration)}s` : "" },
        { label: "Started", value: formatDate(c.startTime ?? c.dateCreated) },
    ]
    return {
        eyebrow: "FreeClimb · Call",
        title: "Call Detail",
        fields: fields.filter((f) => f.value),
    }
}

export function buildApplicationCardPayload(data: unknown): CardPayload {
    const a = (data ?? {}) as Record<string, unknown>
    const fields: CardField[] = [
        { label: "Alias", value: toText(a.alias) },
        { label: "Application ID", value: toText(a.applicationId), kind: "mono" },
        { label: "Voice URL", value: toText(a.voiceUrl), kind: "mono" },
        { label: "SMS URL", value: toText(a.smsUrl), kind: "mono" },
        { label: "Status Callback", value: toText(a.statusCallbackUrl), kind: "mono" },
    ]
    return {
        eyebrow: "FreeClimb · Application",
        title: toText(a.alias) || "Application Detail",
        fields: fields.filter((f) => f.value),
    }
}
