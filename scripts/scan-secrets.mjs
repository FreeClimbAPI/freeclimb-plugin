import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SKIP_PATHS = [/^package-lock\.json$/, /^pnpm-lock\.yaml$/, /(^|\/)package-lock\.json$/, /(^|\/)pnpm-lock\.yaml$/];
const SKIP_EXTENSIONS = /\.(png|jpe?g|gif|ico|pdf|woff2?|ttf|eot|mp[34]|wav|tsbuildinfo)$/i;

const KNOWN_PLACEHOLDERS = new Set([
  "AC1234567890abcdef1234567890abcdef12345678",
  "AC1234567890123456789012345678901234567890",
  "AC0000000000000000000000000000000000000000",
  "abcdef1234567890abcdef1234567890abcdef12",
  "abc123def456abc123def456abc123def456abc12",
  "1111122222333334444455555666667777788888",
  "0000000000000000000000000000000000000000",
]);

function isObviousPlaceholder(value) {
  const hex = value.startsWith("AC") ? value.slice(2) : value;
  if (KNOWN_PLACEHOLDERS.has(value) || KNOWN_PLACEHOLDERS.has(hex)) return true;
  if (/^(.)\1+$/.test(hex)) return true;
  if ((hex + hex).indexOf(hex, 1) < hex.length) return true;
  return false;
}

const ACCOUNT_ID = /\bAC[0-9a-fA-F]{40}\b/g;
const KEY_CONTEXT = /api[_-]?key/i;
const BARE_HEX_40 = /\b[0-9a-fA-F]{40}\b/g;

const files = execSync("git ls-files", { cwd: root, encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .filter((f) => !SKIP_EXTENSIONS.test(f))
  .filter((f) => !SKIP_PATHS.some((re) => re.test(f)));

const findings = [];

for (const file of files) {
  let content;
  try {
    content = readFileSync(resolve(root, file), "utf8");
  } catch {
    continue;
  }
  if (content.includes("\u0000")) continue;

  const lines = content.split("\n");
  lines.forEach((line, i) => {
    for (const match of line.matchAll(ACCOUNT_ID)) {
      if (!isObviousPlaceholder(match[0])) {
        findings.push(`${file}:${i + 1} account-ID-shaped value: ${match[0].slice(0, 8)}...`);
      }
    }
    if (KEY_CONTEXT.test(line)) {
      for (const match of line.matchAll(BARE_HEX_40)) {
        if (!match[0].startsWith("AC") && !isObviousPlaceholder(match[0])) {
          findings.push(`${file}:${i + 1} API-key-shaped value near "api key": ${match[0].slice(0, 6)}...`);
        }
      }
    }
  });
}

if (findings.length > 0) {
  console.error("Secret scan failed - credential-shaped values found:");
  for (const f of findings) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(`Secret scan passed (${files.length} files).`);
