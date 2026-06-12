import type { ReactElement } from "react"
import { Box, Text } from "ink"
import { supportsColor } from "../theme.js"
import { useTerminalWidth } from "./terminal-context.js"

export interface ErrorBoxProps {
    code: number
    message: string
    suggestion?: string
    tryCommands?: string[]
    url?: string
}

export function ErrorBox({
    code,
    message,
    suggestion,
    tryCommands,
    url,
}: ErrorBoxProps): ReactElement {
    const useColor = supportsColor()
    const termWidth = useTerminalWidth()

    return (
        <Box
            borderColor={useColor ? "red" : undefined}
            borderStyle="round"
            flexDirection="column"
            paddingX={1}
            paddingY={0}
            width={termWidth}
        >
            <Text bold color={useColor ? "red" : undefined}>
                Error: {message}
            </Text>
            <Text> </Text>
            <Box>
                <Text bold>Code: </Text>
                <Text>{String(code)}</Text>
            </Box>
            {suggestion && (
                <Box>
                    <Text bold>Suggestion: </Text>
                    <Text>{suggestion}</Text>
                </Box>
            )}
            {tryCommands && tryCommands.length > 0 && (
                <Box flexDirection="column" marginTop={1}>
                    <Text color={useColor ? "yellow" : undefined}>Try:</Text>
                    {tryCommands.map((cmd, i) => (
                        <Box key={i} paddingLeft={2}>
                            <Text>
                                {i + 1}.{" "}
                            </Text>
                            <Text color={cmd.startsWith("freeclimb") && useColor ? "cyan" : undefined}>
                                {cmd}
                            </Text>
                        </Box>
                    ))}
                </Box>
            )}
            {url && (
                <Box marginTop={1}>
                    <Text dimColor>Need help? {url}</Text>
                </Box>
            )}
        </Box>
    )
}
