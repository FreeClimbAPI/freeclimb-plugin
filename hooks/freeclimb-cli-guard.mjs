#!/usr/bin/env node
const chunks = [];
process.stdin.on("data", (c) => chunks.push(c));
process.stdin.on("end", () => {
  let command = "";
  try {
    command = JSON.parse(Buffer.concat(chunks).toString("utf8")).command ?? "";
  } catch {
    command = "";
  }

  const billable =
    /\bfreeclimb\s+(calls:make|calls:update|sms:send|incoming-numbers:(buy|delete|update)|applications:(create|update|delete)|conference-participants:remove|recordings:delete)\b/.test(
      command,
    ) ||
    (/\bfreeclimb\s+api\b/.test(command) && /--method[= ]+(POST|PUT|DELETE)\b/i.test(command));

  if (billable && !/--dry-run\b/.test(command)) {
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
