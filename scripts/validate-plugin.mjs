import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateContentIndex, validateDocsIndex, validateSdkMatrix } from "./sdk-matrix.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

function readFrontmatter(rel) {
  const content = readFileSync(join(root, rel), "utf8");
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    errors.push(`Missing YAML frontmatter: ${rel}`);
    return null;
  }
  const fields = {};
  for (const line of match[1].split("\n")) {
    const kv = line.match(/^([A-Za-z_-]+):\s*(.*)$/);
    if (kv) fields[kv[1]] = kv[2].trim();
  }
  return fields;
}

function requireFrontmatterKeys(rel, keys) {
  const fields = readFrontmatter(rel);
  if (!fields) return;
  for (const key of keys) {
    if (!fields[key]) {
      errors.push(`Frontmatter in ${rel} is missing required key: ${key}`);
    }
  }
}

function listFiles(relDir, suffix) {
  const dir = join(root, relDir);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(suffix))
    .map((f) => join(relDir, f));
}

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
  if (manifest.logo) requirePath(manifest.logo, "plugin.json logo");
}

const mcp = readJson(".mcp.json");
if (mcp) {
  const server = mcp.mcpServers?.freeclimb;
  if (!server) {
    errors.push(".mcp.json must define an mcpServers.freeclimb entry");
  } else {
    if (server.type !== "stdio") {
      errors.push(".mcp.json freeclimb server must use type stdio");
    }
    if (!server.args?.some((arg) => arg.includes("${CURSOR_PLUGIN_ROOT}"))) {
      errors.push(".mcp.json must resolve the server path from ${CURSOR_PLUGIN_ROOT}");
    }
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

const skillsDir = join(root, "skills");
if (existsSync(skillsDir)) {
  for (const skill of readdirSync(skillsDir)) {
    const skillFile = join("skills", skill, "SKILL.md");
    if (!existsSync(join(root, skillFile))) {
      if (statSync(join(skillsDir, skill)).isDirectory()) {
        errors.push(`Skill directory has no SKILL.md: skills/${skill}`);
      }
      continue;
    }
    requireFrontmatterKeys(skillFile, ["name", "description"]);
  }
}

for (const rule of listFiles("rules", ".mdc")) {
  requireFrontmatterKeys(rule, ["description", "alwaysApply"]);
}

for (const agent of listFiles("agents", ".md")) {
  requireFrontmatterKeys(agent, ["name", "description", "model", "readonly"]);
}

for (const command of listFiles("commands", ".md")) {
  requireFrontmatterKeys(command, ["name", "description"]);
}

errors.push(...validateSdkMatrix());
errors.push(...validateContentIndex());
errors.push(...validateDocsIndex());

if (errors.length > 0) {
  console.error("Plugin validation failed:");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log("Plugin validation passed.");
