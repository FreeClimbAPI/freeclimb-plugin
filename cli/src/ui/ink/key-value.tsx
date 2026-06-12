import type { ReactElement } from "react"
import { Box, Text } from "ink"
import { BrandColors, supportsColor } from "../theme.js"
import { useTerminalWidth } from "./terminal-context.js"

export interface KeyValueProps {
    data: Record<string, unknown>
    labelColor?: string
}

export function KeyValue({ data, labelColor }: KeyValueProps): ReactElement {
    const termWidth = useTerminalWidth()
    const entries = Object.entries(data)
    const maxKeyLen = Math.max(...entries.map(([key]) => key.length))
    const color = labelColor || (supportsColor() ? BrandColors.lightTeal : undefined)

    return (
        <Box flexDirection="column" width={termWidth}>
            {entries.map(([key, value]) => {
                const displayValue =
                    typeof value === "object" && value !== null
                        ? JSON.stringify(value, null, 2)
                        : String(value ?? "")

                return (
                    <Box key={key}>
                        <Box width={maxKeyLen + 2}>
                            <Text bold color={color}>
                                {key.padEnd(maxKeyLen)}
                            </Text>
                        </Box>
                        <Text wrap="wrap">  {displayValue}</Text>
                    </Box>
                )
            })}
        </Box>
    )
}
