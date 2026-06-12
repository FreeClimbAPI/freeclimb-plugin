import type { ReactElement } from "react"
import { Box, Text } from "ink"
import { BrandColors, supportsColor } from "../theme.js"

export interface SuccessMessageProps {
    command?: string
    message?: string
}

export function SuccessMessage({
    message,
    command,
}: SuccessMessageProps): ReactElement {
    const useColor = supportsColor()
    const displayMessage = message || "Received a success code from FreeClimb. There is no further output."

    return (
        <Box paddingX={1}>
            <Text color={useColor ? "#3fb950" : undefined}>
                {"\u2714"} {displayMessage}
            </Text>
            {command && (
                <Text dimColor> ({command})</Text>
            )}
        </Box>
    )
}
