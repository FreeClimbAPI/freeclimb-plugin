import type { ReactElement, ReactNode } from "react"
import { Box, Text } from "ink"
import { standardComponents } from "@json-render/ink"
import { BrandColors } from "../../ui/theme.js"

const LIME = BrandColors.lime
const TEAL = BrandColors.lightTeal

interface ElementProps {
    children?: ReactNode
    element: { props: Record<string, unknown>; type: string }
}

interface HeadingProps {
    color?: string | null
    level?: string | null
    text?: string
}

interface MetricProps {
    detail?: number | string | null
    label?: number | string
    value?: number | string
}

interface CardProps {
    title?: string | null
}

export function BrandHeading({ element }: ElementProps): ReactElement {
    const props = element.props as HeadingProps
    const level = props.level ?? "h2"
    const text = props.text ?? ""
    if (level === "h1") {
        return (
            <Text bold color={props.color ?? LIME} underline>
                {text}
            </Text>
        )
    }
    if (level === "h3") {
        return (
            <Text bold color={props.color ?? TEAL} dimColor>
                {text}
            </Text>
        )
    }
    if (level === "h4") {
        return (
            <Text color={props.color ?? TEAL} dimColor>
                {text}
            </Text>
        )
    }
    return (
        <Text bold color={props.color ?? TEAL}>
            {text}
        </Text>
    )
}

export function BrandMetric({ element }: ElementProps): ReactElement {
    const props = element.props as MetricProps
    const value = props.value === null || props.value === undefined ? "—" : String(props.value)
    return (
        <Box flexDirection="column">
            <Text color={TEAL}>{String(props.label ?? "")}</Text>
            <Text bold color={LIME}>
                {value}
            </Text>
            {props.detail ? <Text dimColor>{String(props.detail)}</Text> : null}
        </Box>
    )
}

export function BrandCard({ children, element }: ElementProps): ReactElement {
    const props = element.props as CardProps
    return (
        <Box
            alignSelf="flex-start"
            borderColor={TEAL}
            borderStyle="round"
            flexDirection="column"
            paddingX={1}
        >
            {props.title ? (
                <Box marginBottom={1}>
                    <Text bold color={LIME}>
                        {props.title}
                    </Text>
                </Box>
            ) : null}
            {children}
        </Box>
    )
}

const TableBase = standardComponents.Table as unknown as (props: {
    element: unknown
}) => ReactElement

export function BrandTable(props: ElementProps): ReactElement {
    const element = {
        ...props.element,
        props: {
            borderStyle: "round",
            headerColor: LIME,
            ...props.element.props,
        },
    }
    const forwarded = props as unknown as Record<string, unknown>
    return <TableBase {...forwarded} element={element} />
}
