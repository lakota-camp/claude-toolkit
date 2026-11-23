// Run: node --test plugins/web-ship/hooks/guard-git.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { check } from "./guard-git.mjs";

const blocked = (cmd) => check(cmd).length > 0;

test("blocks force pushes", () => {
  assert.ok(blocked("git push --force origin main"));
  assert.ok(blocked("git push -f origin feature"));
  assert.ok(blocked("git push -uf origin feature"));
  assert.ok(blocked("npm test && git push --force"));
});

test("allows normal pushes and --force-with-lease", () => {
  assert.ok(!blocked("git push -u origin feature"));
  assert.ok(!blocked("git push --force-with-lease origin feature"));
  assert.ok(!blocked("git -C repo -c push.negotiate=true push -u origin b"));
});

test("blocks staging real env files", () => {
  assert.ok(blocked("git add .env"));
  assert.ok(blocked("git add src/x.ts .env.local"));
  assert.ok(blocked("git add 'apps/web/.env.production'"));
});

test("allows example env files and ordinary files", () => {
  assert.ok(!blocked("git add .env.example"));
  assert.ok(!blocked("git add .env.sample README.md"));
  assert.ok(!blocked("git add -A"));
  assert.ok(!blocked("cat .env"));
});

test("as a hook: exit 2 with a reason when blocked, 0 otherwise", () => {
  const script = fileURLToPath(new URL("./guard-git.mjs", import.meta.url));
  const run = (event) => spawnSync("node", [script], { input: JSON.stringify(event), encoding: "utf8" });
  const bad = run({ tool_name: "Bash", tool_input: { command: "git push --force" } });
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /Force-push blocked/);
  assert.equal(run({ tool_name: "Bash", tool_input: { command: "git status" } }).status, 0);
  assert.equal(run({ tool_name: "Read", tool_input: {} }).status, 0);
  assert.equal(spawnSync("node", [script], { input: "not json" }).status, 0);
});
