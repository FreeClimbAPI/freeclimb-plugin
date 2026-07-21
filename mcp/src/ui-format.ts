export function toText(value: unknown): string {
    if (value === null || value === undefined) return ""
    if (typeof value === "string") return value
    if (typeof value === "number" || typeof value === "boolean") return String(value)
    return JSON.stringify(value)
}

export function formatDate(value: unknown): string {
    const raw = toText(value)
    if (!raw) return ""
    const parsed = new Date(raw)
    if (Number.isNaN(parsed.getTime())) return raw
    return parsed.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    })
}
