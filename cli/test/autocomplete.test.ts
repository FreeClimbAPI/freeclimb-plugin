import { expect } from "chai"
import { runCommand } from "@oclif/test"

const describeType = process.env.RUNNER_OS === "Windows" ? describe.skip : describe

describeType("Autocomplete", () => {
    it("displays the custom autocomplete message", async () => {
        const { stdout } = await runCommand(["autocomplete"])
        expect(stdout).to.contain(
            "Copy the following line and run it in your terminal. It will set the FreeClimb CLI autocomplete to load on shell startup."
        )
    })
})
