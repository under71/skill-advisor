---
name: skill-advisor
description: Inventory, recommend and diagnose the agent skills installed on this machine across Claude Code (personal + plugins), Codex, Cursor, Gemini CLI, OpenCode, Hermes, OpenClaw, Aside and ~/.agents. Use when the user asks "which skill should I use for X", "what skills do I have", "why isn't skill Y being used", "when does this skill fire", "find duplicate/conflicting skills", or in Korean "어떤 스킬 써야 해", "설치된 스킬 목록", "이 스킬 언제 호출돼", "스킬 중복 정리".
---

# skill-advisor

Run the bundled CLI (Node 18+, no dependencies). Paths are relative to this SKILL.md.

```bash
node scripts/skill-advisor.mjs find "<what the user wants to do>"   # recommend
node scripts/skill-advisor.mjs explain <skill-name>                # when it fires, where, rivals
node scripts/skill-advisor.mjs doctor                              # duplicates, conflicts, vague descriptions
node scripts/skill-advisor.mjs list [--agent "Claude Code"]        # inventory
node scripts/skill-advisor.mjs scan                                # rebuild catalog (auto if >7 days old)
```

Add `--json` for structured output and `--lang ko` for Korean.

## How to answer

1. Pull the key nouns from the request (task, file type, service, standard) and run `find`. Keyword ranking is only a shortlist: read the top descriptions and judge by meaning.
2. Reply with: the best skill, which agent it lives in, one line on why, the trigger phrases from its description, and any look-alike skill that could be picked instead.
3. If nothing fits, say so and suggest creating a skill.
4. If the user installed or removed skills, run `scan` first.

## How agents pick skills (explain when asked)

Every agent puts only each skill's `name` + `description` in the model's context. The model picks by matching the request against descriptions, then loads the SKILL.md body, then any scripts/references it needs. So a skill that never fires usually has a vague or overlapping description, or was dropped because too many skills are installed. Users can always force one by naming it (`/skill-name` in Claude Code and Hermes).
