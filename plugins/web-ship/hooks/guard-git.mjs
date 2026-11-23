#!/usr/bin/env node
// PreToolUse hook for Bash: blocks two git mistakes that are hard to undo.
//   1. Force-pushing (`--force` / `-f`). `--force-with-lease` is allowed.
//   2. Staging real env files (`.env`, `.env.local`, ...). `.env.example`
//      and other `*.example` / `*.sample` / `*.template` files are allowed.
// Exit code 2 blocks the call and shows stderr to Claude; exit 0 allows it.
import { readFileSync } from "node:fs";

export function check(command) {
  const problems = [];
  for (const part of command.split(/&&|\|\||;|\n/)) {
    const words = part.trim().split(/\s+/);
    const git = words.indexOf("git");
    if (git === -1) continue;
    const sub = words[git + 1];
    const rest = words.slice(git + 2);
    if (sub === "push" && rest.some((w) => w === "--force" || w === "-f" || /^-[a-zA-Z]*f[a-zA-Z]*$/.test(w) && !w.startsWith("--"))) {
      problems.push("Force-push blocked. Use `git push --force-with-lease` only if you are sure, or ask the user.");
    }
    if (sub === "add") {
      const envFiles = rest.filter((w) => {
        const name = w.replace(/^["']|["']$/g, "").split("/").pop();
        return /^\.env(\..+)?$/.test(name) && !/\.(example|sample|template)$/.test(name);
      });
      if (envFiles.length) {
        problems.push(`Staging secrets blocked: ${envFiles.join(", ")}. Commit only .env.example; set real values in the host's env settings.`);
      }
    }
  }
  return problems;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let input;
  try {
    input = JSON.parse(readFileSync(0, "utf8"));
  } catch {
    process.exit(0); // never block on a malformed event
  }
  if (input?.tool_name !== "Bash") process.exit(0);
  const problems = check(String(input.tool_input?.command ?? ""));
  if (problems.length) {
    process.stderr.write(problems.map((p) => `• ${p}`).join("\n") + "\n");
    process.exit(2);
  }
  process.exit(0);
}
