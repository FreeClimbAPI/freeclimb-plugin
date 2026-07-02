import { Entry } from "@napi-rs/keyring"
import { expect } from "chai"

function keychainAvailable(): boolean {
    try {
        const probe = new Entry("freeclimbCLIAutomatedTest", "availabilityProbe")
        probe.setPassword("probe")
        probe.deletePassword()
        return true
    } catch {
        return false
    }
}

describe("Test @napi-rs/keyring", () => {
    it("Sets/retrieves/deletes passwords from keychain", function () {
        if (!keychainAvailable()) {
            this.skip()
        }

        const entry = new Entry("freeclimbCLIAutomatedTest", "automatedTestAccount")
        entry.setPassword("automatedTestPassword")
        expect(entry.getPassword()).to.equal("automatedTestPassword")
        entry.deletePassword()
        expect(entry.getPassword()).to.be.null
    })
})
