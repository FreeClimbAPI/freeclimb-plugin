import { expect } from "chai"
import { createTunnel } from "../../src/tunnel/index.js"

describe("createTunnel", () => {
    it("should return a tunnel for 'ngrok'", () => {
        const tunnel = createTunnel("ngrok")
        expect(tunnel).to.have.property("start").that.is.a("function")
        expect(tunnel).to.have.property("stop").that.is.a("function")
        expect(tunnel).to.have.property("url")
    })

    it("should return a tunnel for 'cloudflared'", () => {
        const tunnel = createTunnel("cloudflared")
        expect(tunnel).to.have.property("start").that.is.a("function")
        expect(tunnel).to.have.property("stop").that.is.a("function")
        expect(tunnel).to.have.property("url")
    })

    it("should throw for unknown provider", () => {
        expect(() => createTunnel("invalid" as any)).to.throw("Unknown tunnel provider")
    })

    it("should return an EventEmitter", () => {
        const tunnel = createTunnel("ngrok")
        expect(tunnel).to.have.property("on").that.is.a("function")
        expect(tunnel).to.have.property("emit").that.is.a("function")
    })
})
