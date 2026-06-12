import { expect } from "chai"
import { runCommand } from "@oclif/test"

describe("Test for Logout command", function () {
    it("Test the logout command produces the expected response", async () => {
        const { stdout } = await runCommand(["logout"])
        expect(stdout).to.contain(
            "Successfully removed the saved Account ID and API Key from this computer"
        )
    })
})
