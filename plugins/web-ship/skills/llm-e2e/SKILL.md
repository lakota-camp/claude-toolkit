---
name: llm-e2e
description: Test an LLM-powered app end to end without an API key, at two levels - a scripted fake chat model for unit tests, and a fake Anthropic HTTP server plus Playwright for the real client and UI. Use when the user asks to test an AI/agent app, there is no ANTHROPIC_API_KEY in the environment, or you need to prove streaming, tool calls, thinking blocks or refusals work before deploying.
---

# End-to-end tests for LLM apps, no API key

Two layers. Use both: they catch different bugs.

## 1. Unit/integration: a scripted fake chat model

For LangChain/LangGraph apps, write a tiny `BaseChatModel` subclass in the
project's tests that replays a script of turns (text streamed word by word,
optional tool calls, optional refusal), and swap it in with
`vi.mock("<path to the module that creates the model>")`.

Requirements that matter:
- Implement `_streamResponseChunks` and call `runManager.handleLLMNewToken`
  for each chunk, or LangGraph's `messages` stream mode sees no tokens.
- Give every chunk the same `id`, so text and tool calls land on one message.
- Return `this` from `bindTools()`.
- To simulate a refusal, end with a chunk whose
  `response_metadata.finish_reason` is `"refusal"` (that is where
  `@langchain/anthropic` 1.6.x reports `stop_reason: "refusal"`).

Keep the model construction in its own module so it is mockable.

## 2. Real client + UI: fake Anthropic server

`scripts/fake-anthropic.mjs` (in this skill's base directory) speaks the
Anthropic streaming Messages API: thinking block with signature, streamed text,
streamed `input_json_delta` tool input, and `stop_reason: "refusal"`.

1. Write a scenario file (see `scripts/example-scenario.json`); rules match on
   the last user text or on a tool_result id.
2. Start it, and start the production build pointed at it:
   ```bash
   node <skill-dir>/scripts/fake-anthropic.mjs scenario.json --port 4010 --log requests.jsonl &
   npm run build
   ANTHROPIC_API_KEY=sk-fake ANTHROPIC_BASE_URL=http://localhost:4010 PORT=3123 npx next start &
   ```
   (`@langchain/anthropic` and the Anthropic SDK read `ANTHROPIC_BASE_URL`.)
3. Drive the UI: copy `scripts/drive-ui.example.cjs` to scratch, edit the
   selectors, run with `NODE_PATH="$(npm root -g)" node drive-ui.cjs http://localhost:3123 <outdir>`.
4. **Read `requests.jsonl`.** It is the evidence for what the app really
   sends: model id, `max_tokens`, `output_config`, betas, whether thinking
   blocks are passed back with their signatures, and that no forbidden
   parameter (e.g. `temperature` on models that reject it) is present.
5. Stop both servers: `pkill -f next-server; pkill -f fake-anthropic.mjs`.

## Also check the request without any server

For `ChatAnthropic`, `model.invocationParams({})` returns the request body it
would send. A unit test on it pins the model settings cheaply.

## Report honestly

A fake server proves the app's handling of the protocol, not the model's
behavior. Say "verified against a fake Anthropic server" and list what still
needs a real-key run.
