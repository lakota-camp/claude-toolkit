---
name: next-agent-starter
description: Build a Next.js app with a LangGraph.js agent that streams to the browser over the AG-UI protocol, pauses for human approval (interrupt/resume), and optionally renders agent-described UI with A2UI - deployable to Vercel. Use when the user wants an AI agent web app, a chat UI with tool calls, human-in-the-loop approvals, "approve before the agent acts", or asks to start from the agui-demo pattern.
---

# Next.js + LangGraph + AG-UI agent app

Reference implementation: `github.com/lakota-camp/agui-demo`, branch
`claude/langgraph-hitl-portfolio-demo-jely8d` (commit `8111674`). If the
session can't read it, ask to attach the repo. Read its README "Design
decisions" first; copy structure, not versions. Re-verify versions with the
`verify-stack` skill: these packages change monthly.

## Architecture

```
browser (HttpAgent, @ag-ui/client)
  → POST /api/agent (route handler, runtime "nodejs", maxDuration)
    → adapter: graph.stream(...) → AG-UI events → SSE (@ag-ui/encoder)
      → LangGraph StateGraph + checkpointer (Postgres; MemorySaver for local dev)
```

| Piece | File in the reference | Notes |
|---|---|---|
| Graph | `src/agent/graph.ts` | agent → tools → approval (`interrupt()`) → execute/cancel → agent |
| Model | `src/agent/model.ts` | own module so tests can mock it |
| Checkpointer | `src/agent/checkpointer.ts` | Postgres when `DATABASE_URL`, else MemorySaver |
| AG-UI adapter | `src/server/agui.ts` | the part to copy and adapt |
| Route | `app/api/agent/route.ts` | validates body, streams SSE |
| UI | `src/ui/Chat.tsx` | `HttpAgent` + subscriber callbacks |
| A2UI (optional) | `src/a2ui/*`, `src/ui/a2ui/*`, `src/agent/ui.ts` | custom catalog + small renderer |

## Decisions that held up (keep them unless verification says otherwise)

- **No official in-process adapter existed** (`@ag-ui/langgraph` needed a
  LangGraph Platform server), so the route maps the stream itself:
  `messages` mode → TEXT_MESSAGE_*, `updates` → TOOL_CALL_* and
  TOOL_CALL_RESULT, `values` → STATE_SNAPSHOT (+ ACTIVITY_SNAPSHOT for A2UI).
- **Interrupts:** end the run with `RUN_FINISHED { outcome: { type: "interrupt", interrupts } }`;
  resume from `RunAgentInput.resume[]` as `Command({ resume: { [interruptId]: value } })`.
  Check the id is still pending first (stops double-submits).
- **threadId = LangGraph thread_id.** The server checkpoint is the source of
  truth; take only the latest user message from the client.
- **The human decision is the tool result** of the model's proposing tool
  call, written by the execute/cancel node.
- **The graph, not the LLM, builds approval UI** from the validated object
  that will be executed.
- **Code before `interrupt()` must be safe to run twice**: the node re-runs
  from the top on resume.
- On Vercel, interrupts across requests need Postgres (`neon-envs`).

## Build order

Use `phased-build`: (1) graph + tests with a scripted fake model,
(2) AG-UI endpoint + handler tests including an `HttpAgent` run with its
`fetch` pointed at the route handler, (3) UI, (4) optional A2UI. Then
`llm-e2e` against a fake Anthropic server, then `vercel-ship`.

## Model settings

Follow the current Claude model guidance for whatever model is chosen
(thinking, effort, sampling params, `max_tokens`, refusal handling). Pin the
settings with a unit test on `invocationParams({})`.
