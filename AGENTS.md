## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues (ryanteo96/GarminCompanion) via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `GLOSSARY.md` + `docs/adr/`. See `docs/agents/domain.md`.

## Attribution

Commits and PRs are authored with the local machine's configured git user and `gh` account (`git config user.name`, `gh auth status`), never a Claude identity. Do not add a `Co-Authored-By: Claude` trailer, a `Claude-Session:` link, a "Generated with Claude Code" line, or a claude.ai session link to commit messages or PR bodies.
