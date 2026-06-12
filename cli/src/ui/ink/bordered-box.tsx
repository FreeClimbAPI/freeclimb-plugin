import type { ReactElement, ReactNode } from "react"
import { Box, Text } from "ink"
import { BrandColors, supportsColor } from "../theme.js"
import { useTerminalWidth } from "./terminal-context.js"

export interface BorderedBoxProps {
    borderColor?: string
    children: ReactNode
    title?: string
    width?: number
}

export function BorderedBox({
    children,
    title,
    borderColor,
    width,
}: BorderedBoxProps): ReactElement {
    const termWidth = useTerminalWidth()
    const color = borderColor || (supportsColor() ? BrandColors.lightTeal : undefined)
    const effectiveWidth = width || termWidth

    return (
        <Box
            borderColor={color}
            borderStyle="round"
            flexDirection="column"
            paddingX={1}
            width={effectiveWidth}
        >
            {title && (
                <Box marginBottom={1}>
                    <Text bold color={supportsColor() ? BrandColors.lightTeal : undefined}>
                        {title}
                    </Text>
                </Box>
            )}
            {children}
        </Box>
    )
}
