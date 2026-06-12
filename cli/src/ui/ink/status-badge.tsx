import type { ReactElement } from "react"
import { Text } from "ink"
import { BrandColors, supportsColor } from "../theme.js"

export interface StatusBadgeProps {
    status: string
}

const STATUS_COLORS: Record<string, string> = {
    active: "#3fb950",
    completed: "#3fb950",
    answered: "#3fb950",
    delivered: "#3fb950",
    sent: "#3fb950",
    queued: BrandColors.orange,
    pending: BrandColors.orange,
    ringing: BrandColors.orange,
    "in-progress": BrandColors.orange,
    inprogress: BrandColors.orange,
    failed: "#ff0000",
    busy: "#ff0000",
    "no-answer": "#ff0000",
    noanswer: "#ff0000",
    canceled: "#ff0000",
    cancelled: "#ff0000",
}

const STATUS_ICONS: Record<string, string> = {
    active: "\u25CF",
    completed: "\u2714",
    answered: "\u2714",
    delivered: "\u2714",
    sent: "\u2714",
    queued: "\u231B",
    pending: "\u231B",
    ringing: "\u231B",
    "in-progress": "\u231B",
    inprogress: "\u231B",
    failed: "\u2718",
    busy: "\u2718",
    "no-answer": "\u2718",
    noanswer: "\u2718",
    canceled: "\u2718",
    cancelled: "\u2718",
}

export function StatusBadge({ status }: StatusBadgeProps): ReactElement {
    const normalized = status.toLowerCase().replace(/[_\s]/g, "-")
    const color = STATUS_COLORS[normalized]
    const icon = STATUS_ICONS[normalized] || ""

    if (!supportsColor() || !color) {
        return <Text>{icon ? `${icon} ${status}` : status}</Text>
    }

    return (
        <Text color={color}>
            {icon ? `${icon} ${status}` : status}
        </Text>
    )
}
