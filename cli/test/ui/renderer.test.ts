import { expect } from "chai"
import { renderData } from "../../src/ui/ink/renderer.js"

const ANSI_PATTERN = new RegExp(`${String.fromCodePoint(27)}\\[[0-9;]*m`, "g")

function stripAnsi(text: string): string {
    return text.replaceAll(ANSI_PATTERN, "")
}

function captureStdout(fn: () => void): string {
    const chunks: string[] = []
    const originalWrite = process.stdout.write.bind(process.stdout)

    process.stdout.write = ((chunk: string | Uint8Array, ...args: unknown[]) => {
        chunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"))
        if (typeof args[0] === "function") {
            ;(args[0] as () => void)()
        }
        return true
    }) as typeof process.stdout.write

    try {
        fn()
    } finally {
        process.stdout.write = originalWrite
    }

    return chunks.join("")
}

describe("renderData", function () {
    const originalColumns = process.stdout.columns

    beforeEach(function () {
        process.stdout.columns = 200
    })

    afterEach(function () {
        process.stdout.columns = originalColumns
    })

    it("renders a calls list with literal column headers and cell values", function () {
        const output = stripAnsi(
            captureStdout(() => {
                renderData(
                    {
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
                    },
                    { topic: "calls", command: "list" },
                )
            }),
        )

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
})
