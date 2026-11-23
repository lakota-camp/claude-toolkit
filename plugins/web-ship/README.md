# web-ship

A Claude Code plugin for building and shipping web apps, written from a real
build: a Next.js + LangGraph + AG-UI agent app taken from empty repo to
Vercel + Neon entirely from a phone.

Install in a session:

```
/plugin install web-ship --marketplace lakota-camp/claude-toolkit
```

To load it automatically in a repo (including cloud sessions), see the
[top-level README](../../README.md#use-it-in-a-repo).

## Skills

| Skill | Use it to |
| --- | --- |
| `verify-stack` | Confirm package APIs and versions against the installed code before writing any, and record the findings |
| `phased-build` | Build in phases with a test/lint/build gate and a commit after each, stopping where you said |
| `next-agent-starter` | Start an agent web app (LangGraph + AG-UI + human approval, optional A2UI) from the agui-demo pattern |
| `llm-e2e` | Test an LLM app without an API key: scripted fake model for unit tests, fake Anthropic server + Playwright for the real client and UI |
| `vercel-ship` | Create, configure, deploy, smoke-test, pause or hide a Vercel project via the Vercel MCP tools |
| `neon-envs` | Give production and staging separate Neon Postgres branches and wire them into Vercel env vars |

## Agents

| Agent | Does |
| --- | --- |
| `stack-researcher` | Read-only verification of library APIs and versions, with evidence |
| `qa-runner` | Runs the quality gate and an optional browser smoke test, reports pass/fail |

## Hook

`hooks/guard-git.mjs` runs before every Bash command and blocks:
- `git push --force` / `-f` (`--force-with-lease` is allowed),
- `git add` of real env files (`.env`, `.env.local`, ...; `.env.example` is allowed).

It needs `node` on the PATH. Tests: `node --test hooks/guard-git.test.mjs`.

## Requirements

- The Vercel and Neon skills expect the Vercel and Neon connectors (MCP
  servers) to be connected to your Claude account.
- `llm-e2e` uses Playwright, which is preinstalled in Claude Code cloud sessions.
