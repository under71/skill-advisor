# skill-advisor guide: install and real-world examples

## Install (pick one)

```bash
npx github:under71/skill-advisor find "merge two PDFs"          # no install
npm install -g github:under71/skill-advisor                     # global CLI
```

Claude Code plugin (then just ask Claude "which skill should I use for X?"):

```
/plugin marketplace add under71/skill-advisor
/plugin install skill-advisor@under71
```

Other agents: copy the self-contained folder `skills/skill-advisor` into `~/.codex/skills/`, `~/.hermes/skills/`, `~/.agents/skills/`, etc.

## Commands

| command | what it does |
|---|---|
| `find "<task>"` | recommend skills for a task |
| `explain <skill>` | when it fires, where it lives, look-alikes |
| `doctor` | drifted copies, overlap, vague descriptions, stale caches |
| `list [--agent name]` | inventory |
| `scan [--root dir:Label]` | rebuild (automatic after 7 days) |

Options: `--json`, `--lang ko|en`, `--agent <name>`, `--top N`.

## Examples (real output, 385 skills, trimmed)

```
$ skill-advisor find "write tests first" --agent "claude code"
1. superpowers:test-driven-development  [Claude Code/plugin:superpowers]

$ skill-advisor find "merge two PDFs"
1. pdf  [Claude Code/personal, Hermes/personal, Claude Code/plugin:example-skills]

$ skill-advisor explain systematic-debugging
Installed at:
  [Hermes/personal] ~/.hermes/skills/superpowers/systematic-debugging/SKILL.md
  [Claude Code/plugin:superpowers] ~/.claude/plugins/cache/.../systematic-debugging/SKILL.md
To force it, name it: "use the systematic-debugging skill"

$ skill-advisor doctor
[WARN] name-conflict (12)  "docx" exists 5 times with DIFFERENT descriptions
[WARN] overlap (35)        "diagram-import-drawio" and "diagram-import-mermaid" are 75% similar
[WARN] too-many (3)        Hermes: 171 skills. Past ~50, some may be silently left out
```

Fix order: unify drifted copies, make overlapping descriptions say *when* each one applies, rewrite one-line descriptions, archive what you don't use (folders like `.archive` are not counted), clean old plugin versions with `/plugin`.

## Ask your agent

- "Which skill fits this weekly report task? Show look-alikes too."
- "When does the brainstorming skill fire? What should I say to trigger it?"
- "List overlapping skills I could remove."
- "I just installed new skills, rescan and check for conflicts."

## Scripting

```bash
skill-advisor find "spreadsheet cleanup" --json | jq '.results[0].invocable'
skill-advisor doctor --json | jq '[.[] | select(.level=="warn")] | length'
SKILL_ADVISOR_ROOTS="$HOME/work/team-skills:Team" skill-advisor scan
```
