# claude-toolkit

Reusable Claude Code plugins and GitHub workflows for building and shipping production web apps from anywhere: skills, agents, hooks, and CI/deploy pipelines shared across repos.

Each repo that wants the toolkit commits a small `.claude/settings.json` and,
optionally, a short CI workflow. Everything else lives here, so an update here
reaches every repo.

## What's inside

| Path | What it is |
| --- | --- |
| `.claude-plugin/marketplace.json` | Makes this repo a Claude Code plugin marketplace named `claude-toolkit` |
| `plugins/web-ship/` | The `web-ship` plugin: 6 skills, 2 agents, 1 hook ([details](plugins/web-ship/README.md)) |
| `.github/workflows/node-ci.yml` | Reusable CI: `npm ci`, lint, test, build |
| `.github/workflows/toolkit-checks.yml` | Checks for this repo itself |

## Use it in a repo

### 1. Claude Code plugin

Commit this as `.claude/settings.json` in the repo (merge it into the file if
one exists):

```json
{
  "extraKnownMarketplaces": {
    "claude-toolkit": {
      "source": { "source": "github", "repo": "lakota-camp/claude-toolkit", "ref": "v0.1.0" }
    }
  },
  "enabledPlugins": {
    "web-ship@claude-toolkit": true
  }
}
```

- Both keys are needed: a plugin listed in `enabledPlugins` without its
  marketplace in `extraKnownMarketplaces` is not installed.
- `ref` pins a tag, branch or commit. Omit it to follow the default branch.
- Committing it to the repo (rather than your personal `~/.claude`) is what
  makes it work in cloud sessions, whose containers start fresh each time.
- Keep this repo **public**: private marketplaces install over git with
  credential prompts disabled, which cloud sessions may not be able to satisfy.

Or install by hand in any session:

```
/plugin install web-ship --marketplace lakota-camp/claude-toolkit
```

### 2. CI

Add `.github/workflows/ci.yml`:

```yaml
name: ci
on:
  push:
  pull_request:
jobs:
  ci:
    uses: lakota-camp/claude-toolkit/.github/workflows/node-ci.yml@v0.1.0
    with:
      node-version: "22"
```

Inputs: `node-version` (default `"22"`), `working-directory` (default `"."`),
`build` (default `true`). Missing npm scripts are skipped.

## Versioning

Tag releases (`v0.1.0`, `v0.2.0`, ...) and bump `version` in
`plugins/web-ship/.claude-plugin/plugin.json` to match. Consumers pin a tag in
both the settings `ref` and the workflow `uses: ...@vX.Y.Z`, and move forward
when ready.

## Develop

```bash
claude plugin validate --strict .                 # marketplace manifest
claude plugin validate --strict plugins/web-ship  # plugin, skills, agents
node --test plugins/web-ship/hooks/guard-git.test.mjs
```

Try local changes without publishing: `claude plugin marketplace add /path/to/claude-toolkit`
then `claude plugin install web-ship@claude-toolkit`, and
`claude plugin details web-ship@claude-toolkit` for the component inventory.
