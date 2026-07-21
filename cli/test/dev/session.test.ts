import { expect } from "chai"
import { EventEmitter } from "events"
import { mkdtempSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"
import type { Tunnel } from "../../src/tunnel/index.js"
import type { WebhookProxyServer } from "../../src/proxy/server.js"
import {
    WebhookDevSession,
    buildReadyEventPayload,
    type SessionLogger,
} from "../../src/dev/session.js"

function createMockLogger(): SessionLogger & { logs: string[] } {
    const logs: string[] = []
    return {
        logs,
        log(msg: string) {
            logs.push(msg)
        },
        error(msg: string): never {
            throw new Error(msg)
        },
    }
}

function createMockTunnel(url = "https://tunnel.test"): Tunnel & {
    stopCalls: number
} {
    const tunnel = new EventEmitter() as Tunnel & { stopCalls: number }
    tunnel.url = url
    tunnel.stopCalls = 0
    tunnel.start = async () => url
    tunnel.stop = async () => {
        tunnel.stopCalls++
    }
    return tunnel
}

function createMockProxy(port = 4000): WebhookProxyServer & {
    stopCalls: number
} {
    const proxy = new EventEmitter() as WebhookProxyServer & { stopCalls: number }
    proxy.stopCalls = 0
    proxy.start = async () => port
    proxy.stop = async () => {
        proxy.stopCalls++
    }
    return proxy
}

async function waitForReady(logger: { logs: string[] }, timeoutMs = 3000): Promise<void> {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
        if (logger.logs.some((line) => line.includes('"event":"ready"'))) {
            return
        }
        await new Promise((resolve) => setTimeout(resolve, 10))
    }
    throw new Error("Session did not reach ready state")
}

describe("buildReadyEventPayload", () => {
    it("should include proxyPort for listen mode", () => {
        const payload = buildReadyEventPayload({
            tunnelUrl: "https://tunnel.ngrok.io",
            proxyPort: 4000,
            targetPort: 3000,
        })

        expect(payload).to.deep.equal({
            event: "ready",
            tunnelUrl: "https://tunnel.ngrok.io",
            targetPort: 3000,
            proxyPort: 4000,
        })
    })

    it("should include application fields for dev mode", () => {
        const payload = buildReadyEventPayload({
            tunnelUrl: "https://tunnel.ngrok.io",
            proxyPort: 4000,
            targetPort: 8080,
            applicationId: "AP_abc",
            isTemporary: true,
            phoneNumber: "+15551234567",
        })

        expect(payload).to.deep.equal({
            event: "ready",
            tunnelUrl: "https://tunnel.ngrok.io",
            targetPort: 8080,
            applicationId: "AP_abc",
            isTemporary: true,
            phoneNumber: "+15551234567",
        })
    })

    it("should emit null phoneNumber when dev mode has no assigned number", () => {
        const payload = buildReadyEventPayload({
            tunnelUrl: "https://tunnel.ngrok.io",
            proxyPort: 4000,
            targetPort: 3000,
            applicationId: "AP_abc",
            isTemporary: false,
        })

        expect(payload.phoneNumber).to.be.null
    })
})

describe("WebhookDevSession lifecycle", () => {
    let dataDir: string

    beforeEach(() => {
        dataDir = mkdtempSync(join(tmpdir(), "fc-cli-session-"))
    })

    afterEach(() => {
        process.removeAllListeners("SIGINT")
        process.removeAllListeners("SIGTERM")
    })

    it("stops tunnel and proxy when dev-mode application setup fails", async () => {
        const tunnel = createMockTunnel()
        const proxy = createMockProxy()
        const logger = createMockLogger()

        const session = new WebhookDevSession(
            {
                mode: "dev",
                dataDir,
                application: {},
                jsonMode: true,
                logger,
                summaryTitle: "Dev environment ready!",
                targetPort: 3000,
                tunnelCloseHint: "restart",
                tunnelProvider: "ngrok",
            },
            {
                createTunnel: () => tunnel,
                createProxy: () => proxy,
                createTempApp: async () => {
                    throw new Error("app setup failed")
                },
            },
        )

        let errorMessage = ""
        try {
            await session.run()
        } catch (error: unknown) {
            errorMessage = (error as Error).message
        }

        expect(errorMessage).to.equal("app setup failed")
        expect(tunnel.stopCalls).to.equal(1)
        expect(proxy.stopCalls).to.equal(1)
    })

    it("stops tunnel and proxy when tunnel establishment fails", async () => {
        const tunnel = createMockTunnel()
        tunnel.start = async () => {
            throw new Error("tunnel failed")
        }
        const proxy = createMockProxy()
        const logger = createMockLogger()

        const session = new WebhookDevSession(
            {
                mode: "listen",
                jsonMode: true,
                logger,
                summaryTitle: "FreeClimb Listen",
                targetPort: 3000,
                tunnelCloseHint: "restart",
                tunnelProvider: "ngrok",
            },
            {
                createTunnel: () => tunnel,
                createProxy: () => proxy,
            },
        )

        let errorMessage = ""
        try {
            await session.run()
        } catch (error: unknown) {
            errorMessage = (error as Error).message
        }

        expect(errorMessage).to.equal("tunnel failed")
        expect(tunnel.stopCalls).to.equal(1)
        expect(proxy.stopCalls).to.equal(1)
    })

    it("runs cleanup once in order on dev-mode shutdown", async () => {
        const tunnel = createMockTunnel()
        const proxy = createMockProxy()
        const logger = createMockLogger()
        const order: string[] = []
        let cleanupCalls = 0

        tunnel.stop = async () => {
            tunnel.stopCalls++
            order.push("tunnel.stop")
        }
        proxy.stop = async () => {
            proxy.stopCalls++
            order.push("proxy.stop")
        }

        const session = new WebhookDevSession(
            {
                mode: "dev",
                dataDir,
                application: {},
                jsonMode: true,
                logger,
                summaryTitle: "Dev environment ready!",
                targetPort: 3000,
                tunnelCloseHint: "restart",
                tunnelProvider: "ngrok",
            },
            {
                createTunnel: () => tunnel,
                createProxy: () => proxy,
                createTempApp: async () => ({
                    applicationId: "AP_temp",
                    alias: "dev-temp",
                }),
                performCleanup: async () => {
                    cleanupCalls++
                    order.push("restoreNumber", "deleteTempApp")
                },
                writeDevState: () => {},
            },
        )

        session.run()
        await waitForReady(logger)

        await session.shutdown()
        await session.shutdown()

        expect(cleanupCalls).to.equal(1)
        expect(order).to.deep.equal([
            "restoreNumber",
            "deleteTempApp",
            "tunnel.stop",
            "proxy.stop",
        ])
        expect(tunnel.stopCalls).to.equal(1)
        expect(proxy.stopCalls).to.equal(1)
    })

    it("does not touch app managers or state file in listen mode", async () => {
        const tunnel = createMockTunnel()
        const proxy = createMockProxy()
        const logger = createMockLogger()
        let createTempAppCalls = 0
        let updateAppUrlsCalls = 0
        let getAppUrlsCalls = 0
        let assignNumberCalls = 0
        let getNumberCalls = 0
        let writeDevStateCalls = 0

        const session = new WebhookDevSession(
            {
                mode: "listen",
                jsonMode: true,
                logger,
                summaryTitle: "FreeClimb Listen",
                targetPort: 3000,
                tunnelCloseHint: "restart",
                tunnelProvider: "ngrok",
            },
            {
                createTunnel: () => tunnel,
                createProxy: () => proxy,
                createTempApp: async () => {
                    createTempAppCalls++
                    return { applicationId: "AP_temp", alias: "dev-temp" }
                },
                updateAppUrls: async () => {
                    updateAppUrlsCalls++
                },
                getAppUrls: async () => {
                    getAppUrlsCalls++
                    return null
                },
                assignNumber: async () => {
                    assignNumberCalls++
                    return null
                },
                getNumber: async () => {
                    getNumberCalls++
                    return { phoneNumber: "+15551234567" }
                },
                writeDevState: () => {
                    writeDevStateCalls++
                },
            },
        )

        session.run()
        await waitForReady(logger)

        expect(createTempAppCalls).to.equal(0)
        expect(updateAppUrlsCalls).to.equal(0)
        expect(getAppUrlsCalls).to.equal(0)
        expect(assignNumberCalls).to.equal(0)
        expect(getNumberCalls).to.equal(0)
        expect(writeDevStateCalls).to.equal(0)
        expect(session.getState()).to.be.null

        await session.shutdown()
        expect(tunnel.stopCalls).to.equal(1)
        expect(proxy.stopCalls).to.equal(1)
    })
})
