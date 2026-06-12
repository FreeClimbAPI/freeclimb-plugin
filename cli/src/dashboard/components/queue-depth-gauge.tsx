import type { ReactElement } from "react"
import { Box, Text } from "ink"
import { BrandColors } from "../../ui/theme.js"

interface QueueDepthGaugeProps {
    alias: string
    averageWaitTime?: number | null
    currentSize: number
    maxSize: number
}

function getGaugeColor(ratio: number): string {
    if (ratio >= 0.8) return "#ff0000"
    if (ratio >= 0.5) return BrandColors.orange
    return "#3fb950"
}

function renderBar(current: number, max: number, width: number): string {
    const ratio = max > 0 ? Math.min(current / max, 1) : 0
    const filled = Math.round(ratio * width)
    const empty = width - filled
    return "\u2588".repeat(filled) + "\u2591".repeat(empty)
}

function formatWaitTime(seconds: number): string {
    if (seconds < 60) return `${Math.round(seconds)}s`
    const m = Math.floor(seconds / 60)
    const s = Math.round(seconds % 60)
    return `${m}m ${s}s`
}

export function QueueDepthGauge({
    alias,
    currentSize,
    maxSize,
    averageWaitTime,
}: QueueDepthGaugeProps): ReactElement {
    const ratio = maxSize > 0 ? currentSize / maxSize : 0
    const color = getGaugeColor(ratio)
    const barWidth = 20

    return (
        <Box flexDirection="column" paddingX={1}>
            <Box justifyContent="space-between">
                <Text bold>{alias}</Text>
                <Text color={color}>
                    {currentSize}/{maxSize}
                </Text>
            </Box>
            <Text color={color}>{renderBar(currentSize, maxSize, barWidth)}</Text>
            {averageWaitTime !== null && averageWaitTime !== undefined && (
                <Text dimColor>avg wait: {formatWaitTime(averageWaitTime)}</Text>
            )}
        </Box>
    )
}
