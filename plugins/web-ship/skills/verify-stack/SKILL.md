---
name: verify-stack
description: Verify fast-moving libraries and APIs against the installed packages before writing code. Use when starting a project or feature that depends on new or fast-changing packages (AI SDKs, agent frameworks, protocol libraries, Next.js majors), when the user says "verify, don't guess", "check the real API", "which version supports X", or before adding any dependency.
---

# Verify the stack before writing code

Training data goes stale; package APIs do not wait. Confirm every API against
what is actually installed, then record what you found.

## Steps

1. **List the questions first.** For each library, write the specific
   question the code depends on, e.g. "Does package X have an in-process
   adapter, or does it need a server?", "How does version Y represent an
   interrupt / resume?". Vague questions produce vague verification.

2. **Check what exists and how current it is.**
   - `npm view <pkg> version dist-tags peerDependencies dependencies --json`
   - `npm search --json <topic>` to find official vs third-party packages.
     Check `repository.url` / maintainers before trusting an unscoped package.

3. **Install candidates in a scratch directory, not the project:**
   `mkdir -p <scratch>/probe && cd <scratch>/probe && npm init -y && npm i --ignore-scripts <pkgs>`

4. **Read the installed types and source**, not the README:
   - `node_modules/<pkg>/package.json` → `exports` (what you may import)
   - `.d.ts` files for signatures; grep for the concept (`interrupt`, `resume`, ...)
   - minified `dist/*.mjs` with `grep -o '.\{200\}keyword.\{400\}'` when
     behavior matters (e.g. which fields a client sends).
   - If a package ships JSON Schemas for a protocol, those are the spec.

5. **Check peer-dependency compatibility before pinning.** Latest is not
   always installable together. Examples from a real build: ESLint 10 was out
   but `eslint-plugin-react` only supported `^9`; TypeScript 7 was out but
   `typescript-eslint` required `<6.1`. Pick the newest versions that agree.

6. **Run `npm audit`** after installing. If a dev-only package pulls in a
   vulnerable transitive dependency and you only need its data files,
   vendor those files (with their license) instead of installing it.

7. **Pin exact versions** (`npm i --save-exact`) for everything you verified.

8. **Write it down** in the README under "Design decisions": each question,
   what the installed package showed (file and symbol), and the option you
   chose. Include a version table.

## Rules

- Never describe an API as existing unless you saw it in the installed
  package or official docs fetched in this session.
- When docs and installed code disagree, the installed code wins; say so.
- Keep probe installs out of the project (`--ignore-scripts`, scratch dir).
