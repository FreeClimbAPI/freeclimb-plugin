import type { ReactElement } from "react"
import { Box, Text } from "ink"

interface LogEntry {
    level: string
    message: string
    timestamp: string
}

interface LogStreamProps {
    entries: LogEntry[]
    maxLines?: number | null
}

const LEVEL_COLORS: Record<string, string> = {
    error: "#ff0000",
    warning: "#e3b341",
    warn: "#e3b341",
    info: "#58a6ff",
    debug: "#8b949e",
    success: "#3fb950",
}

function formatTimestamp(ts: string): string {
    try {
        const d = new Date(ts)
        return d.toLocaleTimeString("en-US", { hour12: false })
    } catch {
        return ts
    }
}

export function LogStream({ entries, maxLines }: LogStreamProps): ReactElement {
    const visible = maxLines ? entries.slice(-maxLines) : entries

    return (
        <Box flexDirection="column">
            {visible.map((entry, i) => {
                const levelColor = LEVEL_COLORS[entry.level.toLowerCase()] || "#8b949e"
                return (
                    <Box gap={1} key={`${entry.timestamp}-${i}`}>
                        <Text dimColor>{formatTimestamp(entry.timestamp)}</Text>
                        <Text bold color={levelColor}>
                            {entry.level.toUpperCase().padEnd(5)}
                        </Text>
                        <Text>{entry.message}</Text>
                    </Box>
                )
            })}
            {visible.length === 0 && <Text dimColor>No log entries</Text>}
        </Box>
    )
}
