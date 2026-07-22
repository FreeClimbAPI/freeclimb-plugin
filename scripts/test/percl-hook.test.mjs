import assert from "node:assert/strict"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { spawn } from "node:child_process"
import { after, before, describe, it } from "node:test"

const root = resolve(import.meta.dirname, "../..")
const hook = join(root, "hooks", "freeclimb-percl-guard.mjs")
let workDir
let stateDir
let perclPath
let validatorPath

function runHook(event) {
    return new Promise((resolvePromise, reject) => {
        const child = spawn(process.execPath, [hook], {
            cwd: root,
            env: {
                ...process.env,
                FREECLIMB_PERCL_GUARD_STATE_DIR: stateDir,
                FREECLIMB_PERCL_VALIDATOR_PATH: validatorPath,
            },
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
        child.stdin.end(JSON.stringify(event))
    })
}

before(async () => {
    workDir = await mkdtemp(join(tmpdir(), "freeclimb-percl-hook-test-"))
    stateDir = join(workDir, "state")
    perclPath = join(workDir, "flow.percl.json")
    validatorPath = join(workDir, "validator.mjs")
    await writeFile(
        validatorPath,
        'export function validatePercl(input) { const valid = Array.isArray(input) && input.every((entry) => !entry.Say || typeof entry.Say.text === "string"); return { valid, errors: valid ? [] : ["percl[0].Say.text is required."], warnings: [] }; }\n',
    )
})

after(async () => {
    await rm(workDir, { force: true, recursive: true })
})

describe("PerCL repair hook", () => {
    it("feeds validation errors back and requests a bounded repair follow-up", async () => {
        await writeFile(perclPath, JSON.stringify([{ Say: {} }]))

        const postResult = await runHook({
            hook_event_name: "postToolUse",
            conversation_id: "conversation-one",
            tool_input: { file_path: perclPath },
        })
        assert.match(postResult.additional_context, /Say\.text is required/)

        const stopResult = await runHook({
            hook_event_name: "stop",
            conversation_id: "conversation-one",
            status: "completed",
            loop_count: 0,
        })
        assert.match(stopResult.followup_message, /Fix the invalid PerCL/)
    })

    it("clears the repair state after a valid rewrite", async () => {
        await writeFile(perclPath, JSON.stringify([{ Say: { text: "Hello" } }]))

        const postResult = await runHook({
            hook_event_name: "postToolUse",
            conversation_id: "conversation-one",
            tool_input: { file_path: perclPath },
        })
        assert.deepEqual(postResult, {})

        const stopResult = await runHook({
            hook_event_name: "stop",
            conversation_id: "conversation-one",
            status: "completed",
            loop_count: 1,
        })
        assert.deepEqual(stopResult, {})
    })

    it("ignores files outside the PerCL artifact convention", async () => {
        const result = await runHook({
            hook_event_name: "postToolUse",
            conversation_id: "conversation-two",
            tool_input: { file_path: join(workDir, "server.js") },
        })
        assert.deepEqual(result, {})
    })

    it("bounds automatic repair continuations", async () => {
        const config = JSON.parse(await readFile(join(root, "hooks", "hooks.json"), "utf8"))
        assert.equal(config.hooks.stop[0].loop_limit, 3)
    })
})
