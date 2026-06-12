import { expect } from "chai"
import { Environment } from "../../src/environment.js"

describe("First process - Environment Test", () => {
    it("can access the temp value in the current process", () => {
        Environment.setString("TEST_TEMPORARY_ENVIRONMENT_VARIABLE", "Test Value (temporary)")
        expect(process.env.TEST_TEMPORARY_ENVIRONMENT_VARIABLE).to.equal("Test Value (temporary)")
    })
    it("can access the temp value through the environment class", () => {
        expect(Environment.getString("TEST_TEMPORARY_ENVIRONMENT_VARIABLE")).to.equal(
            "Test Value (temporary)"
        )
    })
    it("sets and verifies the persistent environment variable", () => {
        const env = new Environment()
        env.setStringPersist("TEST_PERSISTENT_ENVIRONMENT_VARIABLE", "Test Value (persistent)")
    })
})
