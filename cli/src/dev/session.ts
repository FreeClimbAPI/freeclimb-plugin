import chalk from "chalk"
import { createTunnel, type Tunnel, type TunnelProvider } from "../tunnel/index.js"
import { WebhookProxyServer, type ProxyServerOptions } from "../proxy/server.js"
import { isForwardError, type ForwardResponse } from "../proxy/forwarder.js"
import {
    formatIncoming,
    formatResponse,
    formatError,
    formatJsonEvent,
    type WebhookEvent,
} from "../proxy/event-display.js"
import { createSpinner } from "../ui/spinner.js"
import { borderedBox } from "../ui/components.js"
import { BrandColors, supportsColor } from "../ui/theme.js"
import {
    createTempApp,
    updateAppUrls,
    getAppUrls,
    deleteTempApp,
} from "./app-manager.js"
import { assignNumber, getNumber } from "./number-manager.js"
import { writeDevState, type DevState } from "./state.js"
import { performCleanup } from "./cleanup.js"

export interface SessionLogger {
    error(msg: string, options?: { exit?: number }): never
    log(msg: string): void
}

export interface DevApplicationConfig {
    existingAppId?: string
    numberId?: string
}

type SharedWebhookDevSessionConfig = {
    jsonMode: boolean
    logger: SessionLogger
    proxyPort?: number
    summaryTitle: string
    targetPort: number
    tunnelCloseHint: string
    tunnelProvider: TunnelProvider
}

type WebhookDevSessionModeConfig =
    | { application: DevApplicationConfig; dataDir: string; mode: "dev" }
    | { mode: "listen" }

export type WebhookDevSessionConfig = SharedWebhookDevSessionConfig & WebhookDevSessionModeConfig

export interface SessionReadyInfo {
    applicationId?: string
    isTemporary?: boolean
    phoneNumber?: string
    proxyPort: number
    targetPort: number
    tunnelUrl: string
}

export interface WebhookDevSessionDeps {
    assignNumber?: typeof assignNumber
    createProxy?: (options: ProxyServerOptions) => WebhookProxyServer
    createTempApp?: typeof createTempApp
    createTunnel?: typeof createTunnel
    deleteTempApp?: typeof deleteTempApp
    getAppUrls?: typeof getAppUrls
    getNumber?: typeof getNumber
    performCleanup?: typeof performCleanup
    updateAppUrls?: typeof updateAppUrls
    writeDevState?: typeof writeDevState
}

export function buildReadyEventPayload(readyInfo: SessionReadyInfo): Record<string, unknown> {
    const payload: Record<string, unknown> = {
        event: "ready",
        tunnelUrl: readyInfo.tunnelUrl,
        targetPort: readyInfo.targetPort,
    }
    if (readyInfo.applicationId === undefined) {
        payload.proxyPort = readyInfo.proxyPort
    } else {
        payload.applicationId = readyInfo.applicationId
        payload.isTemporary = readyInfo.isTemporary
        payload.phoneNumber = readyInfo.phoneNumber || null
    }
    return payload
}

export class WebhookDevSession {
    private devState: DevState | null = null

    private proxy: WebhookProxyServer | null = null

    private readonly config: SharedWebhookDevSessionConfig & { proxyPort: number } &
        WebhookDevSessionModeConfig

    private readonly deps: Required<
        Pick<
            WebhookDevSessionDeps,
            | "assignNumber"
            | "createProxy"
            | "createTempApp"
            | "createTunnel"
            | "deleteTempApp"
            | "getAppUrls"
            | "getNumber"
            | "performCleanup"
            | "updateAppUrls"
            | "writeDevState"
        >
    >

    private shuttingDown = false

    private tunnel: Tunnel | null = null

    constructor(config: WebhookDevSessionConfig, deps: WebhookDevSessionDeps = {}) {
        this.config = {
            ...config,
            proxyPort: config.proxyPort ?? 4000,
        }
        this.deps = {
            assignNumber: deps.assignNumber ?? assignNumber,
            createProxy: deps.createProxy ?? ((options) => new WebhookProxyServer(options)),
            createTempApp: deps.createTempApp ?? createTempApp,
            createTunnel: deps.createTunnel ?? createTunnel,
            deleteTempApp: deps.deleteTempApp ?? deleteTempApp,
            getAppUrls: deps.getAppUrls ?? getAppUrls,
            getNumber: deps.getNumber ?? getNumber,
            performCleanup: deps.performCleanup ?? performCleanup,
            updateAppUrls: deps.updateAppUrls ?? updateAppUrls,
            writeDevState: deps.writeDevState ?? writeDevState,
        }
    }

    getState(): DevState | null {
        return this.devState
    }

    async shutdown(): Promise<void> {
        if (this.shuttingDown) return
        this.shuttingDown = true

        const { config, deps, devState } = this

        switch (config.mode) {
            case "dev": {
                const state = devState
                if (state) {
                    if (!config.jsonMode) config.logger.log(chalk.dim("\nCleaning up..."))
                    await deps.performCleanup(
                        state,
                        config.dataDir,
                        config.logger,
                        config.jsonMode,
                    )
                }
                break
            }
            case "listen": {
                if (!config.jsonMode) config.logger.log(chalk.dim("\nShutting down..."))
                break
            }
            default: {
                const exhaustive: never = config
                throw new Error(`Unhandled session mode: ${(exhaustive as { mode: string }).mode}`)
            }
        }

        await this.stopInfrastructure()
    }

    async run(): Promise<never> {
        const {
            jsonMode,
            logger,
            proxyPort,
            summaryTitle,
            targetPort,
            tunnelCloseHint,
            tunnelProvider,
        } = this.config

        const signalHandler = async () => {
            await this.shutdown()
            // eslint-disable-next-line unicorn/no-process-exit
            process.exit(0)
        }

        process.on("SIGINT", signalHandler)
        process.on("SIGTERM", signalHandler)

        const proxySpinner = jsonMode ? null : createSpinner({ text: "Starting proxy server..." })
        proxySpinner?.start()

        this.proxy = this.deps.createProxy({
            proxyPort,
            targetPort,
        })

        let boundProxyPort = 0
        try {
            boundProxyPort = await this.proxy.start()
            proxySpinner?.succeed(`Proxy server listening on port ${boundProxyPort}`)
        } catch (error: unknown) {
            const typedError = error as Error
            proxySpinner?.fail(`Failed to start proxy: ${typedError.message}`)
            return logger.error(typedError.message, { exit: 1 })
        }

        const tunnelSpinner = jsonMode ? null : createSpinner({ text: "Establishing tunnel..." })
        tunnelSpinner?.start()

        const tunnel = this.deps.createTunnel(tunnelProvider)
        this.tunnel = tunnel
        let tunnelUrl = ""
        try {
            tunnelUrl = await tunnel.start(boundProxyPort)
            tunnelSpinner?.succeed(`Tunnel established: ${chalk.bold(tunnelUrl)}`)
        } catch (error: unknown) {
            const typedError = error as Error
            tunnelSpinner?.fail(`Failed to establish tunnel: ${typedError.message}`)
            await this.stopInfrastructure()
            return logger.error(typedError.message, { exit: 1 })
        }

        tunnel.on("error", (err: Error) => {
            if (jsonMode) {
                logger.log(JSON.stringify({ event: "tunnel_error", error: err.message }))
            } else {
                logger.log(chalk.red(`\nTunnel error: ${err.message}`))
            }
        })
        tunnel.on("close", () => {
            if (jsonMode) {
                logger.log(JSON.stringify({ event: "tunnel_closed" }))
            } else {
                logger.log(chalk.red("\nTunnel closed unexpectedly. Webhook URLs are now dead."))
                logger.log(chalk.dim(tunnelCloseHint))
            }
        })

        const readyInfo: SessionReadyInfo = {
            tunnelUrl,
            proxyPort: boundProxyPort,
            targetPort,
        }

        await this.setupModeResources(readyInfo, tunnelUrl)

        this.renderReadySummary(readyInfo, jsonMode, logger, summaryTitle)
        this.wireWebhookEvents(jsonMode, logger, targetPort)

        return new Promise<never>(() => {})
    }

    private async setupModeResources(readyInfo: SessionReadyInfo, tunnelUrl: string): Promise<void> {
        const { config } = this

        switch (config.mode) {
            case "dev": {
                const appResult = await this.setupApplication(
                    config.application,
                    tunnelUrl,
                    config.dataDir,
                    config.jsonMode,
                    config.logger,
                )
                readyInfo.applicationId = appResult.applicationId
                readyInfo.isTemporary = appResult.isTemporary

                if (config.application.numberId) {
                    readyInfo.phoneNumber = await this.assignPhoneNumber(
                        config.application.numberId,
                        appResult.applicationId,
                        appResult.isTemporary,
                        config.dataDir,
                        config.jsonMode,
                        config.logger,
                    )
                }
                break
            }
            case "listen": {
                break
            }
            default: {
                const exhaustive: never = config
                throw new Error(`Unhandled session mode: ${(exhaustive as { mode: string }).mode}`)
            }
        }
    }

    private async setupApplication(
        application: DevApplicationConfig,
        tunnelUrl: string,
        dataDir: string,
        jsonMode: boolean,
        logger: SessionLogger,
    ): Promise<{ applicationId: string; isTemporary: boolean }> {
        const appSpinner = jsonMode ? null : createSpinner({ text: "Setting up application..." })
        appSpinner?.start()

        let applicationId: string
        let isTemporary: boolean
        let previousAppUrls: DevState["previousAppUrls"] = null

        try {
            if (application.existingAppId) {
                applicationId = application.existingAppId
                isTemporary = false
                previousAppUrls = await this.deps.getAppUrls(applicationId)
                await this.deps.updateAppUrls(applicationId, tunnelUrl)
                appSpinner?.succeed(`Updated application: ${chalk.bold(applicationId)}`)
            } else {
                const app = await this.deps.createTempApp(tunnelUrl)
                ;({ applicationId } = app)
                isTemporary = true
                appSpinner?.succeed(
                    `Created application: ${chalk.bold(applicationId)} (${chalk.dim(app.alias)})`,
                )
            }
        } catch (error: unknown) {
            const typedError = error as Error
            appSpinner?.fail(`Failed to set up application: ${typedError.message}`)
            await this.stopInfrastructure()
            return logger.error(typedError.message, { exit: 1 })
        }

        this.devState = {
            pid: process.pid,
            tunnelUrl,
            applicationId,
            isTemporary,
            previousAppUrls,
            numberAssignments: [],
            createdAt: new Date().toISOString(),
        }
        this.deps.writeDevState(dataDir, this.devState)

        return { applicationId, isTemporary }
    }

    private async assignPhoneNumber(
        numberId: string,
        applicationId: string,
        isTemporary: boolean,
        dataDir: string,
        jsonMode: boolean,
        logger: SessionLogger,
    ): Promise<string> {
        const numSpinner = jsonMode ? null : createSpinner({ text: "Assigning phone number..." })
        numSpinner?.start()

        try {
            const numberInfo = await this.deps.getNumber(numberId)
            const previousAppId = await this.deps.assignNumber(numberId, applicationId)

            this.devState!.numberAssignments.push({
                phoneNumberId: numberId,
                previousApplicationId: previousAppId,
            })
            this.deps.writeDevState(dataDir, this.devState!)

            const prevLabel = previousAppId
                ? chalk.dim(`(was: ${previousAppId})`)
                : chalk.dim("(was: unassigned)")
            numSpinner?.succeed(
                `Assigned ${chalk.bold(numberInfo.phoneNumber)} → ${applicationId} ${prevLabel}`,
            )
            return numberInfo.phoneNumber
        } catch (error: unknown) {
            const typedError = error as Error
            numSpinner?.fail(`Failed to assign number: ${typedError.message}`)
            if (isTemporary) await this.deps.deleteTempApp(applicationId).catch(() => {})
            await this.stopInfrastructure()
            return logger.error(typedError.message, { exit: 1 })
        }
    }

    private renderReadySummary(
        readyInfo: SessionReadyInfo,
        jsonMode: boolean,
        logger: SessionLogger,
        summaryTitle: string,
    ): void {
        if (jsonMode) {
            logger.log(JSON.stringify(buildReadyEventPayload(readyInfo)))
            return
        }

        if (readyInfo.applicationId !== undefined) {
            const summaryLines = [
                ` Tunnel:  ${supportsColor() ? chalk.hex(BrandColors.lightTeal).bold(readyInfo.tunnelUrl) : readyInfo.tunnelUrl}`,
                ` App:     ${chalk.bold(readyInfo.applicationId)}${readyInfo.isTemporary ? chalk.dim(" (temporary)") : ""}`,
            ]
            if (readyInfo.phoneNumber) {
                summaryLines.push(` Number:  ${chalk.bold(readyInfo.phoneNumber)}`)
            }
            summaryLines.push(` Target:  http://localhost:${readyInfo.targetPort}`, "")
            if (readyInfo.phoneNumber) {
                summaryLines.push(` Call ${chalk.bold(readyInfo.phoneNumber)} to test your app`)
            }
            summaryLines.push(` Press ${chalk.bold("Ctrl+C")} to stop and clean up`)

            logger.log("")
            logger.log(borderedBox(summaryLines, "Dev environment ready!"))
            logger.log("")
            logger.log(chalk.dim("Waiting for events...\n"))
            return
        }

        logger.log("")
        logger.log(
            borderedBox(
                [
                    ` Forwarding webhooks ${chalk.dim("→")} http://localhost:${readyInfo.targetPort}`,
                    ` Tunnel URL: ${supportsColor() ? chalk.hex(BrandColors.lightTeal).bold(readyInfo.tunnelUrl) : readyInfo.tunnelUrl}`,
                    "",
                    ` Set this as your application's voiceUrl/smsUrl`,
                    ` Press ${chalk.bold("Ctrl+C")} to stop`,
                ],
                summaryTitle,
            ),
        )
        logger.log("")
        logger.log(chalk.dim("Waiting for events...\n"))
    }

    private wireWebhookEvents(jsonMode: boolean, logger: SessionLogger, targetPort: number): void {
        this.proxy!.on("webhook", (event: WebhookEvent, response: ForwardResponse) => {
            if (jsonMode) {
                logger.log(formatJsonEvent(event, response))
            } else {
                logger.log(formatIncoming(event))
                if (isForwardError(response)) {
                    logger.log(formatError(event, response, targetPort))
                } else {
                    logger.log(formatResponse(event, response))
                }
            }
        })

        this.proxy!.on("error", (err: Error) => {
            if (jsonMode) {
                logger.log(JSON.stringify({ event: "error", error: err.message }))
            } else {
                logger.log(chalk.red(`Proxy error: ${err.message}`))
            }
        })
    }

    private async stopInfrastructure(): Promise<void> {
        await this.tunnel?.stop().catch(() => {})
        await this.proxy?.stop().catch(() => {})
    }
}
