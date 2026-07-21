import { expect } from "chai"
import { getFormatterForTopic } from "../../src/ui/format.js"

process.env.NO_COLOR = "1"

describe("format view descriptors", function () {
    const originalColumns = process.stdout.columns

    beforeEach(function () {
        process.stdout.columns = 200
    })

    afterEach(function () {
        process.stdout.columns = originalColumns
    })
    it("returns a formatter for every CLI topic with a list view", function () {
        const topics = [
            "calls",
            "sms",
            "applications",
            "incoming-numbers",
            "available-numbers",
            "call-queues",
            "queue-members",
            "conferences",
            "conference-participants",
            "recordings",
            "logs",
            "brands",
            "campaigns",
            "exports",
            "blobs",
        ]

        for (const topic of topics) {
            expect(getFormatterForTopic(topic, "list")).to.be.a("function")
        }
    })

    it("returns a formatter for logs:filter", function () {
        expect(getFormatterForTopic("logs", "filter")).to.be.a("function")
    })

    it("returns null for unknown topics", function () {
        expect(getFormatterForTopic("unknown-topic", "list")).to.equal(null)
    })

    it("formats calls with wide column headers and row values", function () {
        const formatter = getFormatterForTopic("calls", "list")!
        const output = formatter({
            calls: [
                {
                    callId: "CA1234567890123456789012",
                    from: "+15551111111",
                    to: "+15552222222",
                    status: "completed",
                    direction: "inbound",
                    dateCreated: "2024-01-15T10:30:00Z",
                },
            ],
        })

        expect(output).to.contain("Call ID")
        expect(output).to.contain("From")
        expect(output).to.contain("To")
        expect(output).to.contain("Status")
        expect(output).to.contain("Direction")
        expect(output).to.contain("Created")
        expect(output).to.contain("CA1234567890123456789012")
        expect(output).to.contain("+15551111111")
        expect(output).to.contain("+15552222222")
        expect(output).to.contain("completed")
        expect(output).to.contain("inbound")
        expect(output).to.contain("2024-01-15T10:30:00Z")
    })

    it("formats logs with wide column headers and row values", function () {
        const formatter = getFormatterForTopic("logs", "list")!
        const output = formatter({
            logs: [
                {
                    timestamp: "2024-01-15T10:30:00Z",
                    level: "ERROR",
                    requestId: "RQ1234567890123456789012",
                    message: "Call failed to connect",
                },
            ],
        })

        expect(output).to.contain("Timestamp")
        expect(output).to.contain("Level")
        expect(output).to.contain("Request ID")
        expect(output).to.contain("Message")
        expect(output).to.contain("2024-01-15T10:30:00Z")
        expect(output).to.contain("ERROR")
        expect(output).to.contain("RQ1234567890123456789012")
        expect(output).to.contain("Call failed to connect")
    })

    it("formats blobs with wide column headers and row values", function () {
        const formatter = getFormatterForTopic("blobs", "list")!
        const output = formatter({
            blobs: [
                {
                    blobId: "BL1234567890123456789012",
                    alias: "session-state",
                    dateCreated: "2024-01-01T00:00:00Z",
                    dateUpdated: "2024-01-02T00:00:00Z",
                },
            ],
        })

        expect(output).to.contain("Blob ID")
        expect(output).to.contain("Alias")
        expect(output).to.contain("Created")
        expect(output).to.contain("Updated")
        expect(output).to.contain("BL1234567890123456789012")
        expect(output).to.contain("session-state")
        expect(output).to.contain("2024-01-01T00:00:00Z")
        expect(output).to.contain("2024-01-02T00:00:00Z")
    })

    it("formats queue-members with wide column headers and row values", function () {
        const formatter = getFormatterForTopic("queue-members", "list")!
        const output = formatter({
            queueMembers: [
                {
                    callId: "CA1234567890123456789012",
                    position: 1,
                    waitTime: 30,
                    dateEnqueued: "2024-01-01T00:00:00Z",
                },
            ],
        })

        expect(output).to.contain("Call ID")
        expect(output).to.contain("Position")
        expect(output).to.contain("Wait Time")
        expect(output).to.contain("Enqueued")
        expect(output).to.contain("CA1234567890123456789012")
        expect(output).to.contain("2024-01-01T00:00:00Z")
    })

    it("formats conference-participants with wide column headers and row values", function () {
        const formatter = getFormatterForTopic("conference-participants", "list")!
        const output = formatter({
            participants: [
                {
                    callId: "CA1234567890123456789012",
                    talk: true,
                    listen: true,
                    startConfOnEnter: false,
                },
            ],
        })

        expect(output).to.contain("Call ID")
        expect(output).to.contain("Talk")
        expect(output).to.contain("Listen")
        expect(output).to.contain("Starts Conf")
        expect(output).to.contain("CA1234567890123456789012")
        expect(output).to.contain("true")
        expect(output).to.not.contain("false")
    })

    it("shows an empty message when a list has no rows", function () {
        expect(getFormatterForTopic("calls", "list")!({ calls: [] })).to.equal("No calls found")
        expect(getFormatterForTopic("logs", "list")!({ logs: [] })).to.equal("No logs found")
        expect(getFormatterForTopic("blobs", "list")!({ blobs: [] })).to.equal("No blobs found")
    })

    it("falls back to JSON when the response lacks the list key", function () {
        const formatter = getFormatterForTopic("calls", "list")!
        const data = { unexpected: [] }
        expect(formatter(data)).to.equal(JSON.stringify(data, null, 2))
    })
})
