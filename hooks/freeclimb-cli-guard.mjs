#!/usr/bin/env node
const BILLABLE =
  /\bfreeclimb\s+(calls:make|calls:update|sms:send|incoming-numbers:(buy|delete|update)|applications:(create|update|delete)|conference-participants:remove|recordings:delete|exports:delete|blobs:delete)\b/;
const RAW_API = /\bfreeclimb\s+api\b/;
const MUTATING_METHOD = /--method[= ]+(POST|PUT|DELETE)\b/i;
const DRY_RUN = /--dry-run\b/;

function isBillable(text) {
  return BILLABLE.test(text) || (RAW_API.test(text) && MUTATING_METHOD.test(text));
}

// A `&&`/`;`/`|` outside quotes starts a new command, so a `--dry-run` preview
// must not vouch for the real invocation chained after it.
function splitInvocations(command) {
  const invocations = [];
  let current = "";
  let quote = "";

  for (let i = 0; i < command.length; i += 1) {
    const char = command[i];
    if (quote) {
      current += char;
      if (char === quote) quote = "";
      else if (char === "\\" && quote === '"' && i + 1 < command.length) current += command[++i];
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      current += char;
      continue;
    }
    if (char === "\\" && i + 1 < command.length) {
      current += char + command[++i];
      continue;
    }
    if (char === "&" || char === "|" || char === ";" || char === "\n") {
      invocations.push(current);
      current = "";
      if ((char === "&" || char === "|") && command[i + 1] === char) i += 1;
      continue;
    }
    current += char;
  }
  invocations.push(current);
  return invocations.filter((invocation) => invocation.trim() !== "");
}

// Quoted and escaped text is argument data, not flags, so it cannot grant
// `--dry-run` credit. Removed characters become spaces so nothing joins across
// the gap and reads as a flag that was never typed.
function flagText(text) {
  let out = "";
  let quote = "";

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quote) {
      out += " ";
      if (char === quote) quote = "";
      else if (char === "\\" && quote === '"' && i + 1 < text.length) {
        out += " ";
        i += 1;
      }
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      out += " ";
      continue;
    }
    if (char === "\\" && i + 1 < text.length) {
      out += "  ";
      i += 1;
      continue;
    }
    out += char;
  }
  return out;
}

function isPreviewed(command) {
  const billableInvocations = splitInvocations(command).filter(isBillable);
  if (billableInvocations.length === 0) return DRY_RUN.test(command);
  return billableInvocations.every((invocation) => DRY_RUN.test(flagText(invocation)));
}

const chunks = [];
process.stdin.on("data", (c) => chunks.push(c));
process.stdin.on("end", () => {
  let command = "";
  try {
    command = JSON.parse(Buffer.concat(chunks).toString("utf8")).command ?? "";
  } catch {
    command = "";
  }

  if (isBillable(command) && !isPreviewed(command)) {
    process.stdout.write(
      JSON.stringify({
        permission: "ask",
        user_message:
          "This FreeClimb CLI command is billable or irreversible and does not use --dry-run. Review it before continuing.",
        agent_message:
          "Blocked pending approval: billable/irreversible FreeClimb CLI command without --dry-run. Per rules/freeclimb.mdc, run the same command with --dry-run first and confirm with the user before executing for real.",
      }),
    );
    return;
  }

  process.stdout.write(JSON.stringify({ permission: "allow" }));
});
