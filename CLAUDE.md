# Working on claude-toolkit

This repo is a Claude Code plugin marketplace plus reusable GitHub workflows.
Other repos load it by reference, so a mistake here reaches every repo.

- Before committing, run:
  - `claude plugin validate --strict .`
  - `claude plugin validate --strict plugins/web-ship`
  - `node --test plugins/web-ship/hooks/guard-git.test.mjs`
- Skills must state only what was verified. Mark anything observed but not
  confirmed as such ("observed", "likely"), and say how to check it.
- Keep each SKILL.md short and procedural; the always-on cost is the
  frontmatter `description` (shown by `claude plugin details`).
- A breaking change to a skill, hook or workflow input needs a new tag and a
  `version` bump in `plugins/web-ship/.claude-plugin/plugin.json`.
- Never put secrets, connection strings or personal data in this public repo.
