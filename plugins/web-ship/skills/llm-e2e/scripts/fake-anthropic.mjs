#!/usr/bin/env node
// Fake Anthropic Messages API (streaming only) for end-to-end tests without
// an API key. Point your app at it with:
//   ANTHROPIC_API_KEY=sk-fake ANTHROPIC_BASE_URL=http://localhost:4010
//
// Usage: node fake-anthropic.mjs <scenario.json> [--port 4010] [--log requests.jsonl]
//
// scenario.json is a list of rules; the first rule whose `when` matches the
// request's LAST message answers it:
//   [
//     { "when": { "userIncludes": "REFUSE" }, "refusal": true },
//     { "when": { "toolResultFor": "toolu_1" },
//       "reply": { "text": "Done." } },
//     { "when": { "userIncludes": "" },
//       "reply": { "text": "Let me check.",
//                  "tool": { "id": "toolu_1", "name": "lookup", "input": { "q": "x" } } } }
//   ]
// `userIncludes` matches the text of the last user message (case-sensitive);
// `toolResultFor` matches a tool_result block's tool_use_id.
// Every reply starts with an empty, signed thinking block, the way current
// Claude models return thinking by default, so the client's handling of
// thinking blocks gets exercised too.
import http from "node:http";
import fs from "node:fs";

const args = process.argv.slice(2);
const scenarioPath = args.find((a) => !a.startsWith("--"));
if (!scenarioPath) {
  console.error("usage: node fake-anthropic.mjs <scenario.json> [--port 4010] [--log requests.jsonl]");
  process.exit(1);
}
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const port = Number(flag("port", "4010"));
const logPath = flag("log", null);
const rules = JSON.parse(fs.readFileSync(scenarioPath, "utf8"));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const send = (res, type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);

function lastMessageInfo(body) {
  const last = body.messages?.at(-1) ?? {};
  const blocks = Array.isArray(last.content) ? last.content : [{ type: "text", text: String(last.content ?? "") }];
  return {
    text: blocks.filter((b) => b.type === "text").map((b) => b.text).join(""),
    toolResultIds: blocks.filter((b) => b.type === "tool_result").map((b) => b.tool_use_id),
  };
}

function pickRule(body) {
  const info = lastMessageInfo(body);
  return rules.find(({ when = {} }) => {
    if (when.toolResultFor !== undefined) return info.toolResultIds.includes(when.toolResultFor);
    if (when.userIncludes !== undefined) return info.toolResultIds.length === 0 && info.text.includes(when.userIncludes);
    return true;
  });
}

let counter = 0;
http
  .createServer(async (req, res) => {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw || "{}");
    if (logPath) {
      fs.appendFileSync(logPath, JSON.stringify({ url: req.url, beta: req.headers["anthropic-beta"] ?? null, body }) + "\n");
    }
    const rule = pickRule(body);
    if (!rule) {
      res.writeHead(500, { "content-type": "application/json" });
      return res.end(JSON.stringify({ type: "error", error: { type: "api_error", message: "fake-anthropic: no rule matched" } }));
    }

    const id = `msg_fake_${++counter}`;
    res.writeHead(200, { "content-type": "text/event-stream" });
    send(res, "message_start", {
      message: { id, type: "message", role: "assistant", model: body.model, content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 1 } },
    });

    if (rule.refusal) {
      send(res, "message_delta", { delta: { stop_reason: "refusal", stop_sequence: null }, usage: { output_tokens: 1 } });
      send(res, "message_stop", {});
      return res.end();
    }

    const { text = "", tool } = rule.reply ?? {};
    let index = 0;
    send(res, "content_block_start", { index, content_block: { type: "thinking", thinking: "", signature: "" } });
    send(res, "content_block_delta", { index, delta: { type: "signature_delta", signature: `sig_${counter}` } });
    send(res, "content_block_stop", { index });
    index += 1;

    if (text) {
      send(res, "content_block_start", { index, content_block: { type: "text", text: "" } });
      for (const word of text.split(/(?<= )/)) {
        send(res, "content_block_delta", { index, delta: { type: "text_delta", text: word } });
        await sleep(30);
      }
      send(res, "content_block_stop", { index });
      index += 1;
    }
    if (tool) {
      send(res, "content_block_start", { index, content_block: { type: "tool_use", id: tool.id, name: tool.name, input: {} } });
      const json = JSON.stringify(tool.input ?? {});
      for (let i = 0; i < json.length; i += 20) {
        send(res, "content_block_delta", { index, delta: { type: "input_json_delta", partial_json: json.slice(i, i + 20) } });
      }
      send(res, "content_block_stop", { index });
    }
    send(res, "message_delta", { delta: { stop_reason: tool ? "tool_use" : "end_turn", stop_sequence: null }, usage: { output_tokens: 20 } });
    send(res, "message_stop", {});
    res.end();
  })
  .listen(port, () => console.log(`fake-anthropic listening on :${port}`));
