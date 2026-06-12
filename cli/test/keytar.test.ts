import { Entry } from "@napi-rs/keyring"
import { expect } from "chai"

describe("Test @napi-rs/keyring", () => {
    it("Sets/retrieves/deletes passwords from keychain", () => {
        const entry = new Entry("freeclimbCLIAutomatedTest", "automatedTestAccount")
        entry.setPassword("automatedTestPassword")
        expect(entry.getPassword()).to.equal("automatedTestPassword")
        entry.deletePassword()
        expect(entry.getPassword()).to.be.null
    })
})
