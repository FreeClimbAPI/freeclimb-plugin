import type { Command } from "@oclif/core"
import type { Method } from "axios"
import chalk from "chalk"
import { apiRequest, publicRequest, FreeClimbHttpError } from "@freeclimb/core"
import { Output } from "./output.js"
import * as Errors from "./errors.js"
import { wrapJsonOutput } from "./ui/format.js"
import { getOutputFormat } from "./agent-config.js"
import { isTTY } from "./ui/theme.js"
import { prompts } from "./prompts.js"
import { extractQuietIds, filterFieldsDeep, rejectControlChars, validateResourceId } from "./validation.js"
import { sleep, calculateSinceTimestamp } from "./tail.js"

export type CommandArgs = Record<string, any>
export type CommandFlags = Record<string, any>

export type ValidationRule = "controlChars" | "resourceId"

export interface ValidationSpec {
    key: string
    rule: ValidationRule
    source: "args" | "flags"
}

export interface ConfirmationSpec {
    message: (args: CommandArgs, flags: CommandFlags) => string
}

export interface TailSpec {
    beforeTail?: (command: Command, args: CommandArgs, flags: CommandFlags) => void
    buildPql: (args: CommandArgs, flags: CommandFlags, lastTime: number) => string
}

export interface CommandSpec {
    afterParse?: (command: Command, args: CommandArgs, flags: CommandFlags) => void
    authenticate?: boolean
    buildData?: (args: CommandArgs, flags: CommandFlags) => Record<string, unknown>
    buildParams?: (args: CommandArgs, flags: CommandFlags) => Record<string, unknown>
    commandName: string
    confirmation?: ConfirmationSpec
    dryRun?: boolean
    endpoint: string | ((args: CommandArgs, flags: CommandFlags) => string)
    method: Method
    quietIdKey: string
    skipRequest?: (args: CommandArgs, flags: CommandFlags) => boolean
    supportsNext?: boolean
    tail?: TailSpec
    topic: string
    transformResponse?: (data: unknown, args: CommandArgs, flags: CommandFlags) => unknown
    validations?: ValidationSpec[]
}

export function truncateLogs(
    data: unknown,
    _args: CommandArgs,
    flags: CommandFlags,
): unknown {
    if (!flags.maxItem || !data || typeof data !== "object") return data
    const page = data as { logs?: unknown[] }
    if (!Array.isArray(page.logs)) return data
    return { ...page, logs: page.logs.slice(0, flags.maxItem as number) }
}

function resolveEndpoint(spec: CommandSpec, args: CommandArgs, flags: CommandFlags): string {
    return typeof spec.endpoint === "function" ? spec.endpoint(args, flags) : spec.endpoint
}

function runValidations(spec: CommandSpec, args: CommandArgs, flags: CommandFlags): void {
    for (const validation of spec.validations ?? []) {
        const bag = validation.source === "args" ? args : flags
        const value = bag[validation.key]
        if (validation.source === "flags" && !value) continue
        if (validation.rule === "resourceId") {
            validateResourceId(value, validation.key)
        } else {
            rejectControlChars(value, validation.key)
        }
    }
}

interface ExecutionContext {
    args: CommandArgs
    flags: CommandFlags
    out: Output
    outputFormat: string
    spec: CommandSpec
}

function emitDryRun(context: ExecutionContext): void {
    const { spec, args, flags, out, outputFormat } = context
    const dryRunOutput: Record<string, unknown> = {
        dryRun: true,
        method: spec.method,
        endpoint: resolveEndpoint(spec, args, flags),
    }
    if (spec.buildData) {
        dryRunOutput.body = spec.buildData(args, flags)
    }
    if (spec.buildParams) {
        dryRunOutput.params = spec.buildParams(args, flags)
    }
    if (outputFormat === "json" || !isTTY()) {
        out.out(JSON.stringify(dryRunOutput, null, 2))
    } else {
        out.out(chalk.yellow("DRY RUN - No API call will be made"))
        out.out(JSON.stringify(dryRunOutput, null, 2))
    }
}

export function handleCommandError(command: Command, error: unknown): never {
    let err: Errors.FreeClimbError
    if (error instanceof FreeClimbHttpError && error.response) {
        err = new Errors.FreeClimbAPIError(error.response.data)
    } else if (error instanceof Errors.FreeClimbError) {
        err = error
    } else {
        err = new Errors.DefaultFatalError(error)
    }
    command.error(err.message, { exit: err.code })
}

async function runTailLoop(command: Command, context: ExecutionContext): Promise<void> {
    const { spec, args, flags, out } = context
    const tailSpec = spec.tail!

    tailSpec.beforeTail?.(command, args, flags)

    let lastTime = 0
    if (flags.since) {
        try {
            lastTime = Date.now() * 1000 - calculateSinceTimestamp(flags.since)
        } catch (error) {
            const err = new Errors.SinceFormatError(error)
            command.error(err.message, { exit: err.code })
        }
    }

    let tailMax = flags.maxItem ? flags.maxItem : 100

    const tailEndpoint = resolveEndpoint(spec, args, flags)
    const tailPath = tailEndpoint.length > 0 ? `/${tailEndpoint}` : ""

    while (flags.tail) {
        try {
            const response = await apiRequest({
                method: "POST",
                path: tailPath,
                data: { pql: tailSpec.buildPql(args, flags, lastTime) },
            })
            const data = response.data as { end?: number; logs?: Array<{ timestamp: number }> }
            if (data.end !== 0 && data.logs && data.logs.length > 0) {
                lastTime = data.logs[0].timestamp
                out.out(JSON.stringify(data.logs.slice(0, tailMax).reverse(), null, 2))
            }
        } catch (error) {
            handleCommandError(command, error)
        }
        await sleep(flags.sleep ?? 1000)
        tailMax = 100
    }
}

export async function runResourceCommand(command: Command, spec: CommandSpec): Promise<void> {
    const out = new Output(command)
    const { args, flags } = await (command as any).parse()
    const outputFormat = getOutputFormat(flags.json)

    spec.afterParse?.(command, args, flags)

    runValidations(spec, args, flags)

    if (spec.dryRun && flags["dry-run"]) {
        emitDryRun({ spec, args, flags, out, outputFormat })
        return
    }

    if (spec.confirmation && !flags.yes && isTTY()) {
        const confirmed = await prompts.confirm(spec.confirmation.message(args, flags), false)
        if (!confirmed) {
            command.log("Aborted. No changes were made.")
            return
        }
    }

    if (flags.next && !spec.supportsNext) {
        const error = new Errors.NoNextPage()
        command.error(error.message, { exit: error.code })
        return
    }

    if (spec.skipRequest?.(args, flags)) {
        return
    }

    const executionContext: ExecutionContext = { spec, args, flags, out, outputFormat }

    if (flags.tail && spec.tail) {
        await runTailLoop(command, executionContext)
        return
    }

    const applyTransform = (data: unknown): unknown =>
        spec.transformResponse ? spec.transformResponse(data, args, flags) : data

    const formatOutput = (data: unknown): string | null => {
        const outputData = flags.fields
            ? filterFieldsDeep(data, flags.fields.split(",").map((f: string) => f.trim()))
            : data
        if (outputFormat === "json") {
            return JSON.stringify(wrapJsonOutput(outputData), null, 2)
        }
        out.render(outputData, { topic: spec.topic, command: spec.commandName })
        return null
    }

    const renderResponse = (data: unknown): void => {
        const transformed = applyTransform(data)
        if (flags.quiet) {
            const ids = extractQuietIds(transformed, spec.quietIdKey)
            if (ids) out.out(ids)
            return
        }
        const result = formatOutput(transformed)
        if (result !== null) out.out(result)
    }

    const renderNoContent = (): void => {
        if (flags.quiet) return
        if (outputFormat === "json") {
            const request: { body?: unknown; endpoint: string; method: string } = {
                method: spec.method,
                endpoint: resolveEndpoint(spec, args, flags),
            }
            if (spec.buildData) {
                request.body = spec.buildData(args, flags)
            }
            out.out(
                JSON.stringify(
                    wrapJsonOutput(null, { command: `${spec.topic}:${spec.commandName}`, request }),
                    null,
                    2,
                ),
            )
        } else {
            out.render(null, { topic: spec.topic, command: spec.commandName })
        }
    }

    const performRequest = async (method: Method, overrideParams?: Record<string, unknown>) => {
        const path = resolveEndpoint(spec, args, flags)
        const fullPath = path.length > 0 ? `/${path}` : ""
        const params = overrideParams ?? (spec.buildParams ? spec.buildParams(args, flags) : undefined)
        const data = overrideParams ? undefined : spec.buildData ? spec.buildData(args, flags) : undefined
        return spec.authenticate === false
            ? publicRequest({ method, path: fullPath, params, data, auth: true })
            : apiRequest({ method, path: fullPath, params, data })
    }

    if (spec.supportsNext && flags.next) {
        if (out.next === undefined || out.next === "freeclimbUnnamedTest") {
            const error = new Errors.NoNextPage()
            command.error(error.message, { exit: error.code })
            return
        }
        try {
            const response = await performRequest("GET", { cursor: out.next })
            if (response.data) {
                renderResponse(response.data)
            } else {
                throw new Errors.UndefinedResponseError()
            }
            if (out.next === null && !flags.quiet) {
                out.out("== You are on the last page of output. ==")
            }
        } catch (error) {
            handleCommandError(command, error)
        }
        return
    }

    try {
        const response = await performRequest(spec.method)
        if (response.status === 204) {
            renderNoContent()
        } else if (response.data) {
            renderResponse(response.data)
        } else {
            throw new Errors.UndefinedResponseError()
        }
    } catch (error) {
        handleCommandError(command, error)
    }
}
