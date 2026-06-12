import { expect } from "chai"
import { Environment } from "../../src/environment.js"

describe("Second process - Environment Test", () => {
    let environment: Environment

    beforeEach(() => {
        delete process.env.TEST_PERSISTENT_ENVIRONMENT_VARIABLE
        environment = new Environment()
    })
    it("can access the persistent value in a new process", () => {
        expect(process.env.TEST_PERSISTENT_ENVIRONMENT_VARIABLE).to.equal("Test Value (persistent)")
    })
    it("can access the persistent value through the environment class", () => {
        expect(Environment.getString("TEST_PERSISTENT_ENVIRONMENT_VARIABLE")).to.equal(
            "Test Value (persistent)"
        )
    })
    it("can clear the environment variable", () => {
        environment.clearString("TEST_PERSISTENT_ENVIRONMENT_VARIABLE")
    })
    it("has cleared the environment variable", () => {
        expect(process.env.TEST_PERSISTENT_ENVIRONMENT_VARIABLE).to.be.undefined
    })
})
