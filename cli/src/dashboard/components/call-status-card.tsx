import type { ReactElement } from "react"
import { Box, Text } from "ink"
import { BrandColors } from "../../ui/theme.js"

interface CallStatusCardProps {
    callId: string
    direction?: string | null
    duration?: number | null
    from: string
    status: string
    to: string
}

const STATUS_COLORS: Record<string, string> = {
    completed: "#3fb950",
    answered: "#3fb950",
    active: "#3fb950",
    queued: BrandColors.orange,
    ringing: BrandColors.orange,
    inprogress: BrandColors.orange,
    "in-progress": BrandColors.orange,
    failed: "#ff0000",
    busy: "#ff0000",
    "no-answer": "#ff0000",
    noanswer: "#ff0000",
    canceled: "#ff0000",
}

const STATUS_ICONS: Record<string, string> = {
    completed: "\u2714",
    answered: "\u2714",
    active: "\u25CF",
    queued: "\u231B",
    ringing: "\u231B",
    inprogress: "\u231B",
    "in-progress": "\u231B",
    failed: "\u2718",
    busy: "\u2718",
    "no-answer": "\u2718",
    noanswer: "\u2718",
    canceled: "\u2718",
}

function formatDuration(seconds: number): string {
    if (seconds < 0) return "0s"
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return m > 0 ? `${m}m ${s}s` : `${s}s`
}

export function CallStatusCard({
    callId,
    from,
    to,
    status,
    direction,
    duration,
}: CallStatusCardProps): ReactElement {
    const normalized = status.toLowerCase().replace(/[_\s]/g, "-")
    const color = STATUS_COLORS[normalized] || BrandColors.lightTeal
    const icon = STATUS_ICONS[normalized] || "\u25CB"

    return (
        <Box borderColor={color} borderStyle="round" flexDirection="column" paddingX={1}>
            <Box justifyContent="space-between">
                <Text dimColor>{callId}</Text>
                <Text color={color}>
                    {icon} {status}
                </Text>
            </Box>
            <Box gap={2}>
                <Text>
                    <Text bold>From:</Text> {from}
                </Text>
                <Text>
                    <Text bold>To:</Text> {to}
                </Text>
            </Box>
            {(direction !== null || (duration !== null && duration !== undefined)) && (
                <Box gap={2}>
                    {direction !== null && (
                        <Text dimColor>
                            {direction === "inbound" ? "\u2190" : "\u2192"} {direction}
                        </Text>
                    )}
                    {duration !== null && duration !== undefined && (
                        <Text dimColor>{formatDuration(duration)}</Text>
                    )}
                </Box>
            )}
        </Box>
    )
}
