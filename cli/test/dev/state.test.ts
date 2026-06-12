import { expect } from "chai"
import { mkdtempSync, existsSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"
import { readDevState, writeDevState, removeDevState, type DevState } from "../../src/dev/state.js"

describe("Dev State", () => {
    let tempDir: string

    beforeEach(() => {
        tempDir = mkdtempSync(join(tmpdir(), "fc-cli-test-"))
    })

    const sampleState: DevState = {
        pid: 12345,
        tunnelUrl: "https://abc-xyz.loca.lt",
        applicationId: "AP_test123",
        isTemporary: true,
        previousAppUrls: null,
        numberAssignments: [
            { phoneNumberId: "PN_test456", previousApplicationId: "AP_old789" },
        ],
        createdAt: "2024-01-15T12:00:00Z",
    }

    it("should return null when no state file exists", () => {
        const state = readDevState(tempDir)
        expect(state).to.be.null
    })

    it("should write and read state", () => {
        writeDevState(tempDir, sampleState)
        const state = readDevState(tempDir)
        expect(state).to.deep.equal(sampleState)
    })

    it("should remove state file", () => {
        writeDevState(tempDir, sampleState)
        expect(existsSync(join(tempDir, "dev-state.json"))).to.be.true
        removeDevState(tempDir)
        expect(existsSync(join(tempDir, "dev-state.json"))).to.be.false
    })

    it("should handle removing non-existent state file", () => {
        expect(() => removeDevState(tempDir)).to.not.throw()
    })
})
