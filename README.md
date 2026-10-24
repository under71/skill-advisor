# skill-advisor

**Which skill should I use?** You installed dozens (or hundreds) of agent skills and no longer know which one fires when. `skill-advisor` inventories every `SKILL.md` on your machine, recommends the right one for a task, explains when a skill is triggered, and finds the duplicates and look-alikes that make agents pick the wrong one.

[한국어 README](README.ko.md)

- **Every agent at once**: Claude Code (personal, project and the active version of each plugin), Codex, Cursor, Gemini CLI, OpenCode, Hermes, OpenClaw, Aside, `~/.agents/skills`, plus any folder you add.
- **Korean + English**: Korean queries work with particles (`보고서를`, `보고서는`) and a small KO↔EN synonym map (`엑셀` → xlsx, `발표` → pptx).
- **Doctor**: same skill drifted apart in different places, different skills competing for the same request, descriptions too vague to trigger, too many skills for the context budget, old plugin versions left on disk.
- **Zero dependencies, fully local**: Node 18+, nothing leaves your machine.

## Install

```bash
# CLI
npx github:under71/skill-advisor find "merge two PDFs"

# Claude Code plugin (adds the skill so Claude answers "which skill should I use?")
/plugin marketplace add under71/skill-advisor
/plugin install skill-advisor@under71

# Any other agent: copy the self-contained skill folder
cp -r skills/skill-advisor ~/.codex/skills/        # or ~/.hermes/skills/, ~/.agents/skills/ ...
```

## Use

```bash
skill-advisor find "write tests first"        # recommend skills for a task
skill-advisor explain brainstorming           # when it fires, where it lives, what competes with it
skill-advisor doctor                          # problems worth fixing
skill-advisor list --agent hermes             # inventory
skill-advisor scan --root ~/work/skills:Team  # rebuild catalog, add a custom folder
```

`--json` for scripts, `--lang ko|en` to force the language. The catalog is cached in `~/.skill-advisor/` (also a readable `catalog.md`) and rebuilt automatically after 7 days.

Example on a real machine with 385 skills:

```
$ skill-advisor doctor
[WARN] name-conflict (12)   "docx" exists 5 times with DIFFERENT descriptions
[WARN] overlap (35)         "diagram-import-drawio" and "diagram-import-mermaid" are 75% similar
[WARN] too-many (3)         Hermes: 171 skills. Past ~50, some may be silently left out
[WARN] short-description (5)
[INFO] copies (46)
[INFO] stale-cache (4)      plugin ui-ux-pro-max: 1 old cached version (21.0 MB)
```

**Full guide with examples:** [docs/GUIDE.md](docs/GUIDE.md) · [한국어 가이드](docs/GUIDE.ko.md)

## How agents actually pick a skill

All of these agents use progressive disclosure:

1. At session start only each skill's `name` + `description` go into the model's context.
2. The model compares your request with those descriptions and decides on its own.
3. Only then is the SKILL.md body loaded, and scripts/references after that.

So a skill that "never gets used" usually has a vague description, shares wording with another skill, or was crowded out. Fix the description, or call it by name (`/skill-name`). `skill-advisor` shows you which case you are in.

## How it compares

| | skill-advisor | [skill-search-cli](https://github.com/Michaelliv/skill-search-cli) | [meta-router](https://github.com/dmmdea/meta-router) | [SkillFinder](https://github.com/yya007/SkillFinder) |
|---|---|---|---|---|
| Installed skills, many agents | yes | yes | Claude Code | no (remote catalog) |
| Hermes / OpenClaw / Aside | yes | no | no | partial |
| Korean queries | yes | no | no | no |
| Doctor (conflicts, overlap, stale) | yes | no | no | no |
| Auto-inject per prompt | no | no | yes (hook) | no |
| Dependencies | none | Bun binary | Go + embedding server | Python + Ollama |

If you want automatic per-prompt routing in Claude Code, meta-router is great; skill-advisor is the "what do I have and why is it misbehaving" tool and works with it.

## License

MIT, by [Rothem System](https://github.com/rothemsys).
