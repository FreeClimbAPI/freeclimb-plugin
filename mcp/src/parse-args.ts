import { ValidationError } from "@freeclimb/core"

export interface JsonSchemaProperty {
    description?: string
    enum?: readonly unknown[]
    items?: JsonSchemaProperty
    type?: string
}

export interface ToolInputSchema {
    properties?: Record<string, JsonSchemaProperty>
    required?: readonly string[]
    type: "object"
}

function parseProperty(value: unknown, prop: JsonSchemaProperty): unknown {
    if (value === undefined || value === null) return undefined
    const type = prop.type
    if (!type) return value
    if (type === "string") {
        return typeof value === "string" ? value : undefined
    }
    if (type === "number") {
        return typeof value === "number" ? value : undefined
    }
    if (type === "boolean") {
        return typeof value === "boolean" ? value : undefined
    }
    if (type === "object") {
        return typeof value === "object" && value !== null && !Array.isArray(value)
            ? value
            : undefined
    }
    if (type === "array") {
        return Array.isArray(value) ? value : undefined
    }
    return value
}

function parseRequiredProperty(
    key: string,
    raw: Record<string, unknown>,
    prop: JsonSchemaProperty | undefined,
): unknown {
    if (!prop) {
        throw new ValidationError(`Missing schema property definition for required argument: ${key}`)
    }
    if (!(key in raw) || raw[key] === undefined || raw[key] === null) {
        throw new ValidationError(`Missing required argument: ${key}`)
    }
    const value = parseProperty(raw[key], prop)
    if (value === undefined) {
        throw new ValidationError(`Invalid type for required argument: ${key}`)
    }
    if (prop.enum && !prop.enum.includes(value)) {
        throw new ValidationError(
            `Invalid value for required argument ${key}. Allowed: ${prop.enum.join(", ")}`,
        )
    }
    return value
}

function parseOptionalProperty(
    key: string,
    raw: Record<string, unknown>,
    prop: JsonSchemaProperty,
): unknown | undefined {
    if (!(key in raw)) return undefined
    const value = parseProperty(raw[key], prop)
    if (value === undefined) return undefined
    if (prop.enum && !prop.enum.includes(value)) {
        throw new ValidationError(
            `Invalid value for argument ${key}. Allowed: ${prop.enum.join(", ")}`,
        )
    }
    return value
}

export function parseToolArgs(
    schema: ToolInputSchema,
    raw: Record<string, unknown>,
): Record<string, unknown> {
    const properties = schema.properties ?? {}
    const required = new Set(schema.required ?? [])
    const parsed: Record<string, unknown> = {}

    for (const key of required) {
        parsed[key] = parseRequiredProperty(key, raw, properties[key])
    }

    for (const [key, prop] of Object.entries(properties)) {
        if (required.has(key)) continue
        const value = parseOptionalProperty(key, raw, prop)
        if (value !== undefined) {
            parsed[key] = value
        }
    }

    return parsed
}

export function requiredString(args: Record<string, unknown>, key: string): string {
    const value = args[key]
    if (typeof value !== "string") {
        throw new ValidationError(`Missing required argument: ${key}`)
    }
    return value
}

export function requiredObject(
    args: Record<string, unknown>,
    key: string,
): Record<string, unknown> {
    const value = args[key]
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new ValidationError(`Missing required argument: ${key}`)
    }
    return value as Record<string, unknown>
}

export function requiredArray(args: Record<string, unknown>, key: string): unknown[] {
    const value = args[key]
    if (!Array.isArray(value)) {
        throw new ValidationError(`Missing required argument: ${key}`)
    }
    return value
}

export function optionalString(
    args: Record<string, unknown>,
    key: string,
): string | undefined {
    const value = args[key]
    return typeof value === "string" ? value : undefined
}

export function optionalNumber(
    args: Record<string, unknown>,
    key: string,
): number | undefined {
    const value = args[key]
    return typeof value === "number" ? value : undefined
}

export function optionalBoolean(
    args: Record<string, unknown>,
    key: string,
): boolean | undefined {
    const value = args[key]
    return typeof value === "boolean" ? value : undefined
}

export function optionalObject(
    args: Record<string, unknown>,
    key: string,
): Record<string, unknown> | undefined {
    const value = args[key]
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        return value as Record<string, unknown>
    }
    return undefined
}

export function optionalArray(
    args: Record<string, unknown>,
    key: string,
): unknown[] | undefined {
    const value = args[key]
    return Array.isArray(value) ? value : undefined
}
