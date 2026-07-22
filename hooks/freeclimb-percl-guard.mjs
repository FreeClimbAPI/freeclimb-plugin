#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const validatorPath =
  process.env.FREECLIMB_PERCL_VALIDATOR_PATH ||
  join(scriptDir, "..", "core", "lib", "percl", "index.js");
const stateDir =
  process.env.FREECLIMB_PERCL_GUARD_STATE_DIR ||
  join(tmpdir(), "freeclimb-percl-guard");

function emit(payload) {
  process.stdout.write(JSON.stringify(payload));
}

function readStdin() {
  return new Promise((resolvePromise) => {
    const chunks = [];
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => resolvePromise(Buffer.concat(chunks).toString("utf8")));
    process.stdin.on("error", () => resolvePromise(""));
  });
}

function statePath(conversationId) {
  const key = createHash("sha256").update(conversationId).digest("hex");
  return join(stateDir, `${key}.json`);
}

async function readState(conversationId) {
  if (!conversationId) return { files: {} };
  try {
    const state = JSON.parse(await readFile(statePath(conversationId), "utf8"));
    if (!state || typeof state.files !== "object" || Array.isArray(state.files)) {
      return { files: {} };
    }
    return state;
  } catch {
    return { files: {} };
  }
}

async function writeState(conversationId, state) {
  if (!conversationId) return;
  const target = statePath(conversationId);
  if (Object.keys(state.files).length === 0) {
    await rm(target, { force: true });
    return;
  }
  await mkdir(stateDir, { recursive: true });
  const temporary = `${target}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(state));
  await rename(temporary, target);
}

function editedFilePath(event) {
  const candidates = [
    event.file_path,
    event.tool_input?.file_path,
    event.tool_input?.path,
  ];
  return candidates.find((value) => typeof value === "string") || "";
}

async function validateFile(filePath) {
  if (!existsSync(filePath)) return { valid: true };

  let parsed;
  try {
    parsed = JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    return {
      valid: false,
      message: `PerCL guard: ${filePath} is not valid JSON (${error.message}).`,
    };
  }

  if (!existsSync(validatorPath)) {
    return {
      valid: null,
      message:
        "PerCL guard: the validator is not built. Run `pnpm run setup` in the FreeClimb plugin directory, then re-save the file.",
    };
  }

  try {
    const { validatePercl } = await import(pathToFileURL(validatorPath).href);
    const result = validatePercl(parsed);
    const diagnostics = [...result.errors, ...result.warnings];
    if (result.valid && diagnostics.length === 0) return { valid: true };
    return {
      valid: false,
      message: [
        `PerCL guard: ${filePath} failed validation:`,
        ...diagnostics.map((diagnostic) => `- ${diagnostic}`),
      ].join("\n"),
    };
  } catch (error) {
    return {
      valid: null,
      message: `PerCL guard: the validator failed (${error.message}). Run \`pnpm build\` in the FreeClimb plugin directory and retry.`,
    };
  }
}

async function handlePostToolUse(event) {
  const filePath = editedFilePath(event);
  if (!filePath.endsWith(".percl.json")) return {};

  const validation = await validateFile(filePath);
  const state = await readState(event.conversation_id);
  if (validation.valid === false) {
    state.files[filePath] = validation.message;
    await writeState(event.conversation_id, state);
    return {
      additional_context: `${validation.message}\nFix the invalid PerCL, rewrite the file, and let the guard validate it again.`,
    };
  }

  delete state.files[filePath];
  await writeState(event.conversation_id, state);
  if (validation.valid === null) {
    return { additional_context: validation.message };
  }
  return {};
}

async function handleStop(event) {
  if (event.status !== "completed" || !event.conversation_id) return {};

  const state = await readState(event.conversation_id);
  const remaining = {};
  for (const filePath of Object.keys(state.files)) {
    const validation = await validateFile(filePath);
    if (validation.valid === false) remaining[filePath] = validation.message;
  }
  await writeState(event.conversation_id, { files: remaining });
  const messages = Object.values(remaining);
  if (messages.length === 0) return {};
  return {
    followup_message: `Fix the invalid PerCL before finishing:\n${messages.join("\n")}\nRewrite each file and verify that the guard passes.`,
  };
}

const raw = await readStdin();
let event = {};
try {
  event = JSON.parse(raw || "{}");
} catch {
  event = {};
}

const output =
  event.hook_event_name === "stop"
    ? await handleStop(event)
    : await handlePostToolUse(event);
emit(output);
