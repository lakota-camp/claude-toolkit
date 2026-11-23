---
name: neon-envs
description: Provision Postgres on Neon for a web app with separate production and staging (preview) databases using Neon branches, and wire the connection strings into Vercel env vars without exposing them. Use when an app needs Postgres on Vercel, durable state across serverless requests (e.g. LangGraph checkpointers, sessions), "a staging database", or "a separate DB for previews".
---

# Neon Postgres for production and staging

Load tools with ToolSearch (`select:mcp__Neon__...`).

## Why serverless apps need it

Serverless functions keep no memory between requests, and two requests can
hit different instances. Anything that must survive from one request to the
next (a paused agent run, a session) belongs in a database.

## Steps

1. `list_projects` → show the user what exists; never reuse a project that
   belongs to another app without asking.
2. Ask before creating: "New Neon project `<app>` in `<region>`?" Pick the
   region next to the Vercel function region (Vercel default `iad1` =
   `aws-us-east-1`).
3. `create_project` (name, `region_id`, `org_id`). The default branch is
   production.
4. For staging: `create_branch` named `staging` (copy-on-write from
   production, its own compute endpoint).
5. `get_connection_string` for each branch (`branch_id` for staging). Neon
   returns the **pooled** host (`-pooler` in the hostname); keep it for
   serverless.
6. Store each in Vercel with `create_project_env` as `type: "sensitive"`:
   - production branch → `DATABASE_URL`, target `["production"]`
   - staging branch → `DATABASE_URL`, target `["preview"]`
   To split an existing shared var, `edit_project_env` its target to
   `["production"]`, then create the preview one.
7. Confirm with `filter_project_envs` (values stay hidden).

## Secret handling

- Connection strings contain the password. Never print them in chat, never
  commit them, never put them in `.env.example`.
- Cloud sessions usually cannot open Postgres connections (DNS/TCP is
  blocked), so you cannot test the string from the sandbox. Say so, and
  verify through the deployed app's runtime logs instead.

## Driver notes (node-postgres)

- `pg` 8.x copies URL query params into its config but only sends known
  startup keys, so Neon's `channel_binding=require` is ignored (harmless);
  TLS still comes from `sslmode=require`.
- Libraries that create tables on first use (e.g. `PostgresSaver.setup()`)
  need the role to own the database; Neon's default `neondb_owner` does.
