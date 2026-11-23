---
name: phased-build
description: Build an app in gated phases with a test/lint/build check and a commit after each phase, stopping for review where the user asks. Use when the user describes a multi-phase build ("Phase 1 ... Phase 2 ..."), asks to "commit after each phase", "stop after phase N", or wants a large feature built incrementally from a phone or remote session.
---

# Phased build with gates

## Before Phase 1

1. Restate the phases and the stop points the user gave. If they said
   "STOP after Phase N", that is a hard stop: summarize and wait.
2. Run the `verify-stack` skill for any fast-moving dependency.
3. Find the project's check commands (`package.json` scripts, Makefile, CI
   config). The default gate for Node projects is
   `npm test && npm run lint && npm run build`.

## Each phase

1. Write the code for this phase only. Comment the non-obvious parts; the
   reader may be learning the stack.
2. Add tests for the phase's behavior. For LLM apps, use a scripted fake
   model so tests need no API key (see the `llm-e2e` skill).
3. Run the full gate. All three must pass. Do not skip, disable, or weaken a
   test to get green; fix the cause.
4. Commit with a message that names the phase and lists what changed.
   Never commit `.env*` files (only `.env.example`).
5. Push to the session's working branch (never force-push).

## When a phase ends at a stop point

Report, in this order:
- what was built (one line per part),
- what was verified and how (tests, build, a real browser run, ...),
- what was NOT verified and why (no API key, network blocked, ...),
- open decisions for the user.

Then wait. Do not start the next phase.

## Verification beyond unit tests

- Run the production build (`npm run build && npm start`) and drive the UI
  with Playwright for user-facing phases. Screenshots at deviceScaleFactor 1
  for your own checks.
- Kill any server you started (`pkill -f next-server`, not `pkill -f "next start"`,
  which misses the renamed process) before finishing.
