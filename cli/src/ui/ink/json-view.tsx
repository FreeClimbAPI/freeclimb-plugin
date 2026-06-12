import type { ReactElement } from "react"
import { Box, Text } from "ink"
import { supportsColor } from "../theme.js"
import { useTerminalWidth } from "./terminal-context.js"

export interface JsonViewProps {
    data: unknown
}

function renderValue(value: unknown, indent: number): ReactElement {
    if (value === null) {
        return <Text color={supportsColor() ? "magenta" : undefined}>null</Text>
    }

    if (typeof value === "boolean") {
        return (
            <Text color={supportsColor() ? "magenta" : undefined}>
                {String(value)}
            </Text>
        )
    }

    if (typeof value === "number") {
        return (
            <Text color={supportsColor() ? "yellow" : undefined}>
                {String(value)}
            </Text>
        )
    }

    if (typeof value === "string") {
        return (
            <Text color={supportsColor() ? "green" : undefined}>
                &quot;{value}&quot;
            </Text>
        )
    }

    if (Array.isArray(value)) {
        if (value.length === 0) {
            return <Text>{"[]"}</Text>
        }

        return (
            <Box flexDirection="column">
                <Text>{"["}</Text>
                {value.map((item, i) => (
                    <Box key={i} paddingLeft={2}>
                        {renderValue(item, indent + 2)}
                        {i < value.length - 1 && <Text>,</Text>}
                    </Box>
                ))}
                <Text>{"]"}</Text>
            </Box>
        )
    }

    if (typeof value === "object") {
        const entries = Object.entries(value as Record<string, unknown>)
        if (entries.length === 0) {
            return <Text>{"{}"}</Text>
        }

        return (
            <Box flexDirection="column">
                <Text>{"{"}</Text>
                {entries.map(([key, val], i) => (
                    <Box key={key} paddingLeft={2}>
                        <Text color={supportsColor() ? "cyan" : undefined}>
                            &quot;{key}&quot;
                        </Text>
                        <Text>: </Text>
                        {renderValue(val, indent + 2)}
                        {i < entries.length - 1 && <Text>,</Text>}
                    </Box>
                ))}
                <Text>{"}"}</Text>
            </Box>
        )
    }

    return <Text>{String(value)}</Text>
}

export function JsonView({ data }: JsonViewProps): ReactElement {
    const termWidth = useTerminalWidth()
    return <Box flexDirection="column" width={termWidth}>{renderValue(data, 0)}</Box>
}
