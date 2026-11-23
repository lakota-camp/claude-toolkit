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

Claude Code installs a plugin only when it is enabled in **your own (user)
settings**. A plugin enabled only by a repo's `.claude/settings.json` is
skipped (the debug log says `enabled only by repo-authored settings`), so a
cloned repo cannot run code on its own.

**Cloud sessions (claude.ai/code):** add this to the cloud environment's
setup script (environment menu → Edit → Setup script). It runs when each fresh
container starts, before Claude, and never blocks the session:

```bash
# Install the web-ship plugin (lakota-camp/claude-toolkit) at user scope.
if command -v claude >/dev/null 2>&1; then
  claude plugin marketplace add "https://github.com/lakota-camp/claude-toolkit.git#v0.1.0" \
    && claude plugin install web-ship@claude-toolkit \
    || echo "warning: web-ship plugin not installed" >&2
fi
```

Put it on an environment every repo uses (e.g. Default) to get the plugin
everywhere. Change `#v0.1.0` to move to a new release.

**Your own computer:** install once; it persists in `~/.claude`:

```
/plugin install web-ship --marketplace lakota-camp/claude-toolkit
```

**Optional, in each repo:** commit `.claude/settings.json` to record which
toolkit version the repo expects. It does not install the plugin by itself
(checked in a cloud session):

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

`ref` pins a tag, branch or commit; omit it to follow the default branch.

Keep this repo **public**: private marketplaces install over git with
credential prompts disabled, which cloud sessions may not be able to satisfy.

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
