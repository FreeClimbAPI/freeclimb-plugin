#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const validatorPath = join(scriptDir, "..", "core", "lib", "percl", "index.js");

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

const raw = await readStdin();

let event = {};
try {
  event = JSON.parse(raw || "{}");
} catch {
  event = {};
}

const filePath = typeof event.file_path === "string" ? event.file_path : "";

if (!filePath.endsWith(".percl.json")) {
  emit({});
  process.exit(0);
}

if (!existsSync(filePath)) {
  emit({});
  process.exit(0);
}

let fileContents;
try {
  fileContents = readFileSync(filePath, "utf8");
} catch (err) {
  const message = `PerCL guard: could not read ${filePath} (${err.message}).`;
  emit({ agent_message: message, additional_context: message });
  process.exit(0);
}

let parsed;
try {
  parsed = JSON.parse(fileContents);
} catch (err) {
  const message = `PerCL guard: ${filePath} is not valid JSON (${err.message}). Fix the syntax error before using this file in a webhook response.`;
  emit({ agent_message: message, additional_context: message });
  process.exit(0);
}

if (!existsSync(validatorPath)) {
  const message =
    "PerCL guard: core/lib/percl/index.js is not built yet, so this .percl.json file was not validated. Run `pnpm build` (or `pnpm run setup`) in the plugin directory, then re-save the file.";
  emit({ agent_message: message, additional_context: message });
  process.exit(0);
}

let validatePercl;
try {
  ({ validatePercl } = await import(pathToFileURL(validatorPath).href));
} catch (err) {
  const message = `PerCL guard: failed to load the core validator (${err.message}). Run \`pnpm build\` in the plugin directory and retry.`;
  emit({ agent_message: message, additional_context: message });
  process.exit(0);
}

let result;
try {
  result = validatePercl(parsed);
} catch (err) {
  const message = `PerCL guard: validator threw while checking ${filePath} (${err.message}).`;
  emit({ agent_message: message, additional_context: message });
  process.exit(0);
}

if (!result.valid) {
  const lines = [
    `PerCL guard: ${filePath} failed PerCL validation. Fix these errors before using it in a webhook response:`,
    ...result.errors.map((e) => `  - ${e}`),
  ];
  const message = lines.join("\n");
  emit({ agent_message: message, additional_context: message });
  process.exit(0);
}

emit({});
process.exit(0);
