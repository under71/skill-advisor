# skill-advisor 활용 가이드 (설치부터 실전 예시까지)

스킬이 많아지면 생기는 세 가지 질문에 답하는 도구입니다.

1. 이 작업엔 **어떤 스킬**을 써야 하지?
2. 이 스킬은 **언제** 불리고, 왜 안 불리지?
3. 내 스킬들 중 **겹치거나 낡은 것**은 뭐지?

---

## 1. 설치 (3가지 중 편한 것 하나)

### A. 설치 없이 바로 실행 (Node 18 이상)

```bash
npx github:under71/skill-advisor find "PDF 두 개 합치기"
```

처음 한 번 내려받고, 그다음부터는 바로 실행됩니다.

### B. Claude Code 플러그인으로 설치 (추천)

Claude Code 안에서:

```
/plugin marketplace add under71/skill-advisor
/plugin install skill-advisor@under71
```

이제 Claude에게 "이 작업엔 어떤 스킬 써?"라고 물으면 Claude가 skill-advisor를 돌려서 답합니다.

### C. 다른 에이전트(Codex, Hermes, OpenClaw, Cursor 등)에 스킬로 넣기

스킬 폴더 하나에 필요한 게 다 들어 있습니다. 복사만 하면 됩니다.

```bash
git clone https://github.com/under71/skill-advisor.git
cp -r skill-advisor/skills/skill-advisor ~/.codex/skills/      # Codex
cp -r skill-advisor/skills/skill-advisor ~/.hermes/skills/     # Hermes
cp -r skill-advisor/skills/skill-advisor ~/.agents/skills/     # 여러 에이전트 공용 폴더
```

### 터미널 명령으로 쓰고 싶다면

```bash
npm install -g github:under71/skill-advisor
skill-advisor --help
```

---

## 2. 명령 5개

| 명령 | 하는 일 |
|---|---|
| `find "<하고 싶은 일>"` | 작업에 맞는 스킬 추천 |
| `explain <스킬이름>` | 언제 불리는지, 어디 설치됐는지, 헷갈리는 스킬 |
| `doctor` | 중복·충돌·설명 부족·구버전 진단 |
| `list [--agent 이름]` | 에이전트별 설치 목록 |
| `scan [--root 폴더:이름]` | 다시 조사 (7일 지나면 자동) |

공통 옵션: `--lang ko` (한국어 출력), `--json` (스크립트용), `--agent hermes` (특정 에이전트만), `--top 5` (결과 개수).

---

## 3. 실전 예시

아래 출력은 스킬 385개가 깔린 실제 맥에서 돌린 결과입니다(일부 줄임).

### 예시 1. "PDF 합치려는데 뭐 써?"

```
$ skill-advisor find "PDF 두 개 합치기" --lang ko
1. pdf  [Claude Code/personal, Hermes/personal, Claude Code/plugin:example-skills]
   Use this skill whenever the user wants to do anything with PDF files ... combining or merging multiple PDFs ...
2. nano-pdf  [Hermes/personal]
   Edit text in existing PDFs via natural-language prompts.
```

읽는 법:
- 1번 `pdf`가 세 곳(Claude Code 개인, Hermes, 예제 플러그인)에 깔려 있다는 것까지 알려 줍니다.
- "합치기"라고 한국어로 물어도 설명의 merging과 이어 줍니다(한영 대응어).

이렇게 쓰면 됩니다: Claude에게 **"pdf 스킬로 두 파일 합쳐줘"**처럼 스킬 이름을 붙여 말하면 확실하게 그 스킬이 쓰입니다.

### 예시 2. "버그 원인부터 찾고 싶어" (Hermes만 보기)

```
$ skill-advisor find "버그 원인 찾기" --agent hermes --lang ko
1. python-debugpy         Debug Python: pdb REPL + debugpy remote (DAP).
2. systematic-debugging   4-phase root cause debugging: understand bugs before fixing.
3. node-inspect-debugger  Debug Node.js via --inspect + Chrome DevTools Protocol CLI.
```

언어가 정해져 있으면 1·3번, 원인 분석 절차가 필요하면 2번입니다. Hermes에서는 `/systematic-debugging`으로 바로 부를 수 있습니다.

### 예시 3. "이 스킬은 도대체 언제 불려?"

```
$ skill-advisor explain systematic-debugging --lang ko
4-phase root cause debugging: understand bugs before fixing.

설치 위치:
  [Hermes/personal] ~/.hermes/skills/superpowers/systematic-debugging/SKILL.md
  [Claude Code/plugin:superpowers] ~/.claude/plugins/cache/.../systematic-debugging/SKILL.md

언제 호출되나: 에이전트는 매 요청마다 위 description만 보고 고릅니다.
  확실히 쓰려면 이름을 직접 말하세요: "systematic-debugging 스킬로 해줘"

헷갈릴 수 있는 스킬:
  8%  test-driven-development [Hermes]
```

포인트: 에이전트가 보는 건 **description 한두 줄뿐**입니다. 원하는 스킬이 안 불리면 요청에 description의 표현을 섞거나 이름을 직접 부르세요. description에 `"주간 보고서 써줘"` 같은 예시 문구가 있으면 "이런 말을 하면 잘 불립니다"로 뽑아 보여 줍니다.

### 예시 4. "내 스킬 상태 점검" (doctor)

```
$ skill-advisor doctor --lang ko
[WARN] name-conflict (12)  "docx" 5곳에 있는데 설명이 서로 다름 (버전이 갈라짐)
[WARN] overlap (35)        "diagram-import-drawio" 와 "diagram-import-mermaid" 설명이 75% 비슷해 같은 요청을 두고 경쟁함
[WARN] too-many (3)        Hermes: 스킬 171개. 50개를 넘으면 일부가 모델의 스킬 목록에서 조용히 빠질 수 있음
[WARN] short-description (5)  description이 31자뿐이라 언제 쓸지 판단하기 어려움
[INFO] copies (46)         "security-audit" 같은 내용으로 4곳에 설치됨
[INFO] stale-cache (4)     플러그인 ui-ux-pro-max: 안 쓰는 예전 버전 1개 (21.0 MB)
```

고치는 순서:
1. **name-conflict**: 같은 이름인데 내용이 다르면 어느 에이전트에서 어떤 버전이 불릴지 모릅니다. 최신본 하나로 맞추세요.
2. **overlap**: 설명이 비슷한 스킬은 description에 "언제 쓰는지"를 서로 다르게 적으세요. 예: "draw.io 파일(.drawio)을 받을 때만".
3. **short-description**: "Helps with stuff" 같은 설명은 거의 안 불립니다. 무엇을, 언제, 어떤 말에 반응하는지 한두 문장으로.
4. **too-many**: 안 쓰는 스킬은 지우거나 보관 폴더로 옮기세요. (`.archive` 같은 폴더는 skill-advisor가 세지 않습니다.)
5. **stale-cache**: Claude Code `/plugin`에서 정리하면 됩니다.

### 예시 5. 에이전트에게 맡기기 (플러그인/스킬 설치 후)

Claude Code나 Hermes에서 이렇게 말하면 됩니다.

- "이번 주간 보고서 작업엔 어떤 스킬이 제일 맞아? 비슷한 것도 같이 알려줘"
- "brainstorming 스킬은 언제 불려? 내가 요청할 때 뭐라고 말하면 돼?"
- "내 스킬 중에 겹치는 거 정리해서 지울 후보만 뽑아줘"
- "새로 스킬 설치했어. 목록 다시 조사하고 충돌 있는지 봐줘"

에이전트가 `find`, `explain`, `doctor`, `scan`을 알아서 돌리고 결과를 해석해 답합니다.

### 예시 6. 회사·팀 스킬 폴더도 같이 보기

```bash
skill-advisor scan --root ~/work/team-skills:Team
# 또는 항상 포함
export SKILL_ADVISOR_ROOTS="$HOME/work/team-skills:Team,$HOME/lab/skills:Lab"
```

### 예시 7. 스크립트·자동화에 쓰기

```bash
skill-advisor find "엑셀 표 정리" --json | jq '.results[0].invocable'
# "xlsx"

skill-advisor doctor --json | jq '[.[] | select(.level=="warn")] | length'
```

매주 `doctor --json`을 돌려 경고 수가 늘면 알림을 보내는 식으로 쓸 수 있습니다.

---

## 4. 자주 묻는 것

**Q. 어디를 조사하나요?**
`~/.claude/skills`, 현재 폴더의 `.claude/skills`, Claude Code 플러그인(지금 쓰는 버전만), `~/.codex/skills`, `~/.cursor/skills`, `~/.gemini/skills`, `~/.config/opencode/skills`, `~/.hermes/skills`, `~/.openclaw/skills`, `~/.agents/skills`, Aside 스킬 폴더. 없는 폴더는 건너뜁니다.

**Q. 인터넷으로 뭔가 보내나요?**
아니요. 전부 내 컴퓨터 안에서 읽고, 결과는 `~/.skill-advisor/`에만 저장합니다.

**Q. 추천이 이상해요.**
키워드 순위는 후보를 좁히는 용도입니다. 에이전트(플러그인/스킬)로 쓰면 에이전트가 후보의 설명을 읽고 의미로 최종 판단합니다. 그래도 이상하면 그 스킬의 description이 모호한 경우가 많습니다. `explain`으로 확인해 보세요.
