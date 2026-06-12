import { expect } from "chai"
import { runCommand } from "@oclif/test"

describe("help --examples", function () {
    it("shows examples for calls:list", async () => {
        const { stdout } = await runCommand(["calls:list", "--help"])
        expect(stdout).to.contain("EXAMPLES")
        expect(stdout).to.contain("calls:list")
        expect(stdout).to.contain("--quiet")
    })

    it("shows examples for sms:send", async () => {
        const { stdout } = await runCommand(["sms:send", "--help"])
        expect(stdout).to.contain("EXAMPLES")
        expect(stdout).to.contain("sms:send")
    })

    it("shows examples for applications:list", async () => {
        const { stdout } = await runCommand(["applications:list", "--help"])
        expect(stdout).to.contain("EXAMPLES")
        expect(stdout).to.contain("applications:list")
    })

    it("shows examples for login", async () => {
        const { stdout } = await runCommand(["login", "--help"])
        expect(stdout).to.contain("EXAMPLES")
        expect(stdout).to.contain("--accountId")
        expect(stdout).to.contain("--yes")
    })
})
