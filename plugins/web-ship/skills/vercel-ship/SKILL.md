---
name: vercel-ship
description: Deploy a web app to Vercel from a remote or phone session using the Vercel MCP tools - create the project, set env vars, deploy a branch as preview (staging) or production, watch the build, smoke-test, and pause or hide it afterwards. Use when the user says "deploy", "ship it", "put it on Vercel", "deploy to staging/preview", "redeploy", "pause the app", or "take it offline".
---

# Ship to Vercel (via the Vercel MCP tools)

Load tools with ToolSearch (`select:mcp__Vercel__...`) before calling them.

## Before deploying

1. `list_teams` → get the team id. `get_auth_user` → plan (`billing.plan`).
2. `list_projects` with `repoUrl` and `search` → reuse an existing project.
3. Ask the user (one question each, with a recommended option):
   - **Target**: preview of the branch (recommended) or production.
   - **Database** if the app needs one (see `neon-envs`).
4. Note the plan limits that change the plan:
   - **Hobby has no custom environments** (`list_project_custom_environments`
     returns `accountLimit.total: 0`). "Staging" = the Preview environment.
   - New projects get Vercel Authentication on all deployments except
     custom domains (`ssoProtection.deploymentType: all_except_custom_domains`).
     Keep it on for apps without their own auth: anyone with the URL could
     otherwise spend the owner's API credits.

## Create and configure

1. `create_project` with `framework` and `gitRepository: {repo, type: "github"}`.
   Do not use `create_git_project` when the code is only on a feature
   branch: it deploys the production branch, which may be empty.
2. Env vars with `create_project_env`: secrets as `type: "sensitive"`,
   targets `["production"]` / `["preview"]` separately when staging and
   production must differ (e.g. different databases). Sensitive vars cannot
   target `development`.
3. **Never ask the user to paste a secret into chat** (e.g. an LLM API key).
   Tell them where to add it (Project → Settings → Environment Variables,
   Sensitive, which environments), and that env changes apply only to new
   deployments.

## Deploy

Use `create_deployment` with an explicit git source and commit:

```json
{ "name": "<project>", "project": "<prj_id>",
  "gitSource": { "type": "github", "org": "<owner>", "repo": "<repo>", "ref": "<branch>", "sha": "<full sha>" },
  "projectSettings": { "framework": "nextjs", "nodeVersion": "22.x" } }
```

- Pin `nodeVersion` to the version you tested with; new projects default to
  the newest Node.
- **Check `target` in the response immediately.** Observed: the first
  deployment of a fresh project came back `target: "production"` although
  no target was sent; later ones were `null` (= preview). If it is not what
  the user chose, `cancel_deployment` before it reaches READY.
- Watch with `list_deployment_events` (`builds: 1`, `direction: "backward"`,
  small `limit`) and `get_deployment` until `readyState` is `READY` or `ERROR`.
  Build errors are in the events; runtime errors in `get_runtime_logs`
  (Hobby keeps about 1 hour).

## Git-triggered deployments

Once the GitHub link is active, every push to a branch creates a preview.
Observed on Hobby: push-triggered deployments of commits authored by
`Claude <noreply@anthropic.com>` were `BLOCKED` with no build log, while
API-created deployments of the same commit built fine. The cause was not
confirmed by the API; the likely fix is committing as the account owner's
GitHub identity. Until then, deploy with `create_deployment`.

## Smoke test

- Cloud sessions usually cannot reach `*.vercel.app` (egress proxy 403).
  `web_fetch_vercel_url` can fetch protected deployments, but it **creates a
  share link that bypasses Vercel Authentication for about 23 hours**. Tell
  the user when you use it; avoid it when they want the app hidden.
- It does GET only. To exercise an API route, ask the user to try it in
  their browser, then read `get_runtime_logs`.

## Take offline / bring back

- `pause_project` stops **production** traffic only. Preview deployments
  stay reachable to signed-in team members. Say this explicitly.
- To hide previews too, delete their deployments (ask first; it is
  irreversible, but a redeploy of the same commit restores it).
- `unpause_project` to bring production back.

## Report

URL(s), target, commit, build time, env vars set (names only), what was
smoke-tested and how, what was not, and any share links created.
