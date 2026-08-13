import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { spawn } from "node:child_process"
import { describe, it } from "node:test"

const root = resolve(import.meta.dirname, "../..")
const hook = join(root, "hooks", "freeclimb-cli-guard.mjs")

function runHookPayload(payload) {
    return new Promise((resolvePromise, reject) => {
        const child = spawn(process.execPath, [hook], {
            cwd: root,
            stdio: ["pipe", "pipe", "pipe"],
        })
        const stdout = []
        const stderr = []
        child.stdout.on("data", (chunk) => stdout.push(chunk))
        child.stderr.on("data", (chunk) => stderr.push(chunk))
        child.on("error", reject)
        child.on("close", (code) => {
            if (code !== 0) {
                reject(new Error(Buffer.concat(stderr).toString("utf8")))
                return
            }
            resolvePromise(JSON.parse(Buffer.concat(stdout).toString("utf8") || "{}"))
        })
        child.stdin.end(payload)
    })
}

function runHook(command) {
    return runHookPayload(JSON.stringify({ command }))
}

describe("billable CLI dry-run guard", () => {
    it("asks for approval on a billable command without --dry-run", async () => {
        const result = await runHook("freeclimb sms:send --to +15551234567 --text hi")

        assert.equal(result.permission, "ask")
        assert.match(result.user_message, /billable or irreversible/)
        assert.match(result.agent_message, /rules\/freeclimb\.mdc/)
    })

    it("asks for approval when a --dry-run preview is chained ahead of the real command", async () => {
        const result = await runHook(
            "freeclimb sms:send --to +15551234567 --text hi --dry-run && freeclimb sms:send --to +15551234567 --text hi",
        )

        assert.equal(result.permission, "ask")
    })

    it("asks for approval across every shell separator that starts a new command", async () => {
        for (const chain of [
            "freeclimb calls:make --from +15551234567 --to +15557654321 --dry-run ; freeclimb calls:make --from +15551234567 --to +15557654321",
            "freeclimb calls:make --dry-run | tee run.log && freeclimb calls:make --from +15551234567 --to +15557654321",
            "freeclimb recordings:delete --id RE1 --dry-run || freeclimb recordings:delete --id RE1",
        ]) {
            const result = await runHook(chain)

            assert.equal(result.permission, "ask", chain)
        }
    })

    it("asks for approval when --dry-run appears only inside a quoted argument", async () => {
        const result = await runHook(
            'freeclimb sms:send --to +15551234567 --text "ask support about --dry-run"',
        )

        assert.equal(result.permission, "ask")
    })

    it("asks for approval when a billable command is nested in another shell command", async () => {
        const result = await runHook(
            'bash -c "freeclimb calls:make --from +15551234567 --to +15557654321"',
        )

        assert.equal(result.permission, "ask")
    })

    it("asks for approval for a raw API mutation chained after its own preview", async () => {
        const result = await runHook(
            "freeclimb api /Calls --method POST --dry-run && freeclimb api /Calls --method POST",
        )

        assert.equal(result.permission, "ask")
    })

    it("allows a billable command that carries its own --dry-run", async () => {
        const result = await runHook(
            "freeclimb sms:send --to +15551234567 --text hi --dry-run",
        )

        assert.deepEqual(result, { permission: "allow" })
    })

    it("allows a chain in which every billable invocation is a dry run", async () => {
        const result = await runHook(
            "freeclimb sms:send --to +15551234567 --text hi --dry-run && freeclimb calls:make --from +15551234567 --to +15557654321 --dry-run",
        )

        assert.deepEqual(result, { permission: "allow" })
    })

    it("allows read-only commands", async () => {
        for (const command of [
            "freeclimb calls:list --limit 5",
            "freeclimb api /Calls --method GET",
            "freeclimb percl:validate flow.percl.json --json",
        ]) {
            const result = await runHook(command)

            assert.deepEqual(result, { permission: "allow" }, command)
        }
    })

    it("fails open to Cursor's own approvals when the payload is unreadable", async () => {
        assert.deepEqual(await runHookPayload("not json"), { permission: "allow" })
        assert.deepEqual(await runHookPayload(""), { permission: "allow" })
    })

    it("is registered on beforeShellExecution for freeclimb commands", async () => {
        const config = JSON.parse(await readFile(join(root, "hooks", "hooks.json"), "utf8"))
        const entry = config.hooks.beforeShellExecution[0]

        assert.equal(entry.command, "hooks/freeclimb-cli-guard.mjs")
        assert.match("freeclimb sms:send", new RegExp(entry.matcher))
    })
})
