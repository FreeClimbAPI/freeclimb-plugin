import { readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

function readJson(rel) {
  const path = join(root, rel);
  if (!existsSync(path)) {
    errors.push(`Missing file: ${rel}`);
    return null;
  }
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    errors.push(`Invalid JSON in ${rel}: ${err.message}`);
    return null;
  }
}

function requirePath(rel, label) {
  if (!existsSync(join(root, rel))) {
    errors.push(`${label} path does not exist: ${rel}`);
  }
}

const manifest = readJson(".cursor-plugin/plugin.json");
if (manifest) {
  if (!manifest.name || typeof manifest.name !== "string") {
    errors.push("plugin.json is missing a valid string `name`");
  }
  for (const [key, value] of Object.entries(manifest)) {
    if (typeof value === "string" && (value.startsWith("/") || value.includes(".."))) {
      errors.push(`plugin.json field "${key}" must be a relative in-plugin path, got: ${value}`);
    }
  }
  for (const key of ["skills", "rules", "commands", "agents", "hooks"]) {
    if (manifest[key]) requirePath(manifest[key], `plugin.json ${key}`);
  }
  if (manifest.mcpServers) requirePath(manifest.mcpServers, "plugin.json mcpServers");
}

const mcp = readJson(".mcp.json");
if (mcp) {
  const server = mcp.mcpServers?.freeclimb;
  if (!server) {
    errors.push(".mcp.json must define an mcpServers.freeclimb entry");
  } else {
    for (const arg of [server.command, ...(server.args || [])]) {
      if (typeof arg === "string" && arg.startsWith("/Users/")) {
        errors.push(`.mcp.json must not contain machine-specific absolute paths: ${arg}`);
      }
    }
    if (server.env) {
      errors.push(".mcp.json must not embed an `env` block with credentials");
    }
  }
}

const hooks = readJson("hooks/hooks.json");
if (hooks) {
  for (const defs of Object.values(hooks.hooks || {})) {
    for (const def of defs) {
      if (!def.command) continue;
      const script = def.command.split(" ")[0];
      const scriptPath = join(root, script);
      if (!existsSync(scriptPath)) {
        errors.push(`Hook script not found: ${script}`);
      } else if (!(statSync(scriptPath).mode & 0o111)) {
        errors.push(`Hook script is not executable: ${script}`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error("Plugin validation failed:");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log("Plugin validation passed.");
