import { expect } from "chai"
import http from "http"
import { forwardRequest, isForwardError } from "../../src/proxy/forwarder.js"

describe("forwardRequest", () => {
    let server: http.Server
    let port: number

    afterEach((done) => {
        if (server) {
            server.close(() => done())
        } else {
            done()
        }
    })

    function startServer(handler: http.RequestListener): Promise<number> {
        return new Promise((resolve) => {
            server = http.createServer(handler)
            server.listen(0, () => {
                const addr = server.address()
                port = typeof addr === "object" && addr ? addr.port : 0
                resolve(port)
            })
        })
    }

    it("should forward body and capture 200 response", async () => {
        await startServer((req, res) => {
            let body = ""
            req.on("data", (c) => (body += c))
            req.on("end", () => {
                res.writeHead(200, { "Content-Type": "application/json" })
                res.end(JSON.stringify({ received: JSON.parse(body) }))
            })
        })

        const result = await forwardRequest(port, "POST", "/voice", { "content-type": "application/json" }, Buffer.from('{"test":true}'))
        expect(isForwardError(result)).to.be.false
        if (!isForwardError(result)) {
            expect(result.statusCode).to.equal(200)
            expect(result.latencyMs).to.be.a("number").and.to.be.at.least(0)
        }
    })

    it("should capture response headers", async () => {
        await startServer((_req, res) => {
            res.writeHead(200, { "Content-Type": "application/json", "X-Custom": "test-value" })
            res.end("{}")
        })

        const result = await forwardRequest(port, "POST", "/voice", {}, Buffer.from("{}"))
        if (!isForwardError(result)) {
            expect(result.headers).to.have.property("x-custom", "test-value")
        }
    })

    it("should capture 4xx/5xx as results, not errors", async () => {
        await startServer((_req, res) => {
            res.writeHead(500, { "Content-Type": "application/json" })
            res.end(JSON.stringify({ error: "Internal" }))
        })

        const result = await forwardRequest(port, "POST", "/voice", {}, Buffer.from("{}"))
        expect(isForwardError(result)).to.be.false
        if (!isForwardError(result)) {
            expect(result.statusCode).to.equal(500)
        }
    })

    it("should return ForwardError on ECONNREFUSED", async () => {
        const result = await forwardRequest(59999, "POST", "/voice", {}, Buffer.from("{}"))
        expect(isForwardError(result)).to.be.true
        if (isForwardError(result)) {
            expect(result.code).to.equal("ECONNREFUSED")
        }
    })

    it("should handle non-JSON response bodies", async () => {
        await startServer((_req, res) => {
            res.writeHead(200, { "Content-Type": "text/plain" })
            res.end("OK")
        })

        const result = await forwardRequest(port, "POST", "/voice", {}, Buffer.from("{}"))
        expect(isForwardError(result)).to.be.false
        if (!isForwardError(result)) {
            expect(result.statusCode).to.equal(200)
            expect(result.body).to.equal("OK")
        }
    })
})
