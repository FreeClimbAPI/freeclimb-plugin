import { expect } from "chai"
import nock from "nock"
import { DashboardDataManager, validateSourceBindings } from "../../src/dashboard/data.js"
import { cred } from "../../src/credentials.js"

describe("Dashboard Data", function () {
    describe("validateSourceBindings", function () {
        it("accepts spec with valid sources", function () {
            expect(() =>
                validateSourceBindings({
                    root: "main",
                    elements: {},
                    state: {
                        calls: { $source: "calls" },
                        logs: { $source: "logs", params: { maxItems: 10 } },
                    },
                }),
            ).to.not.throw()
        })

        it("accepts spec with no state", function () {
            expect(() =>
                validateSourceBindings({
                    root: "main",
                    elements: {},
                }),
            ).to.not.throw()
        })

        it("throws on unknown $source", function () {
            expect(() =>
                validateSourceBindings({
                    root: "main",
                    elements: {},
                    state: {
                        data: { $source: "unknown_source" },
                    },
                }),
            ).to.throw('Unknown data source "unknown_source"')
        })

        it("validates nested source bindings", function () {
            expect(() =>
                validateSourceBindings({
                    root: "main",
                    elements: {},
                    state: {
                        section: {
                            nested: { $source: "invalid" },
                        },
                    },
                }),
            ).to.throw('Unknown data source "invalid"')
        })

        it("handles deeply nested objects without stack overflow", function () {
            // Build an object 15 levels deep — extractSourceBindings caps at 10
            let obj: Record<string, unknown> = { $source: "calls" }
            for (let i = 0; i < 15; i++) {
                obj = { level: obj }
            }
            // Should not throw for depth — the binding is beyond maxDepth so it won't be found
            expect(() =>
                validateSourceBindings({
                    root: "main",
                    elements: {},
                    state: obj,
                }),
            ).to.not.throw()
        })
    })

    describe("DashboardDataManager", function () {
        afterEach(function () {
            nock.cleanAll()
        })

        it("fetches data and calls onUpdate", async function () {
            const accountId = await cred.accountId
            nock("https://www.freeclimb.com")
                .get(`/apiserver/Accounts/${accountId}/Calls`)
                .reply(200, { calls: [{ callId: "CA123" }] })

            const updates: Array<{ path: string; value: unknown }> = []
            const manager = new DashboardDataManager((u) => updates.push(...u))

            await manager.start(
                {
                    root: "main",
                    elements: {},
                    state: { calls: { $source: "calls" } },
                },
                60000,
            )

            manager.stop()
            expect(updates).to.have.length(1)
            expect(updates[0].path).to.equal("/calls")
        })

        it("calls onError when fetch fails", async function () {
            const accountId = await cred.accountId
            nock("https://www.freeclimb.com")
                .get(`/apiserver/Accounts/${accountId}/Calls`)
                .reply(500, { error: "Server Error" })

            const errors: Array<{ error: Error; source: string }> = []
            const manager = new DashboardDataManager(
                () => {},
                (source, error) => errors.push({ source, error }),
            )

            await manager.start(
                {
                    root: "main",
                    elements: {},
                    state: { calls: { $source: "calls" } },
                },
                60000,
            )

            manager.stop()
            expect(errors).to.have.length(1)
            expect(errors[0].source).to.equal("fetch")
        })

        it("stops polling on stop()", async function () {
            const manager = new DashboardDataManager(() => {})

            await manager.start(
                {
                    root: "main",
                    elements: {},
                },
                60000,
            )

            manager.stop()
            // Calling stop again should be safe
            manager.stop()
        })

        it("does nothing for spec with no state", async function () {
            const updates: unknown[] = []
            const manager = new DashboardDataManager((u) => updates.push(...u))

            await manager.start({ root: "main", elements: {} }, 60000)

            manager.stop()
            expect(updates).to.have.length(0)
        })
    })
})
