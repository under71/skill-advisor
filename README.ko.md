# skill-advisor

**이 작업엔 어떤 스킬을 써야 하지?** 에이전트 스킬을 수십, 수백 개 깔다 보면 언제 무엇이 불리는지 모르게 됩니다. `skill-advisor`는 내 컴퓨터의 모든 `SKILL.md`를 모아 목록을 만들고, 작업에 맞는 스킬을 추천하고, 스킬이 언제 호출되는지 설명하고, 엉뚱한 스킬이 불리게 만드는 중복과 닮은꼴을 찾아 줍니다.

[English README](README.md)

- **모든 에이전트를 한 번에**: Claude Code(개인·프로젝트·플러그인 현재 버전), Codex, Cursor, Gemini CLI, OpenCode, Hermes, OpenClaw, Aside, `~/.agents/skills`, 직접 추가한 폴더.
- **한국어 질문**: 조사가 붙어도(`보고서를`, `보고서는`) 찾고, `엑셀`→xlsx, `발표`→pptx 같은 한영 대응어를 씁니다.
- **진단(doctor)**: 같은 스킬이 여러 곳에서 서로 다르게 바뀐 경우, 같은 요청을 두고 경쟁하는 스킬, 설명이 짧아 안 불리는 스킬, 너무 많아 빠질 위험, 남아 있는 구버전 플러그인.
- **설치 없음, 100% 로컬**: Node 18 이상만 있으면 되고, 아무것도 밖으로 보내지 않습니다.

## 설치

```bash
# 바로 실행
npx github:under71/skill-advisor find "PDF 두 개 합치기"

# Claude Code 플러그인 (Claude에게 "어떤 스킬 써?"라고 물으면 이 스킬이 답함)
/plugin marketplace add under71/skill-advisor
/plugin install skill-advisor@under71

# 다른 에이전트: 스킬 폴더만 복사 (폴더 하나로 완결)
cp -r skills/skill-advisor ~/.codex/skills/        # 또는 ~/.hermes/skills/, ~/.agents/skills/ ...
```

## 사용법

```bash
skill-advisor find "주간 보고서 작성"           # 작업에 맞는 스킬 추천
skill-advisor explain brainstorming            # 언제 불리는지, 어디 있는지, 경쟁 스킬
skill-advisor doctor                           # 고칠 만한 문제
skill-advisor list --agent hermes              # 목록
skill-advisor scan --root ~/work/skills:Team   # 다시 조사 + 폴더 추가
```

`--json`은 스크립트용, `--lang ko|en`으로 언어를 고정합니다. 목록은 `~/.skill-advisor/`에 저장되고(읽기 좋은 `catalog.md` 포함) 7일이 지나면 자동으로 다시 만듭니다.

**설치부터 실전 예시까지 자세한 가이드: [docs/GUIDE.ko.md](docs/GUIDE.ko.md)**

## 에이전트는 스킬을 어떻게 고르나

Claude Code, Hermes 등은 모두 같은 방식(단계적 로딩)입니다.

1. 세션이 시작되면 각 스킬의 `name`과 `description`만 모델에게 보여 줍니다.
2. 모델이 요청과 설명을 비교해 스스로 고릅니다.
3. 고른 뒤에야 SKILL.md 본문을, 그다음 필요한 스크립트와 참고 파일을 읽습니다.

그래서 "한 번도 안 불리는 스킬"은 대개 설명이 모호하거나, 다른 스킬과 설명이 겹치거나, 너무 많아 밀려난 경우입니다. 설명을 고치거나 이름으로 직접 부르면(`/스킬이름`) 됩니다. `skill-advisor`는 어느 경우인지 보여 줍니다.

## 비슷한 도구와 차이

자동 라우팅(질문마다 스킬을 끼워 넣기)이 필요하면 [meta-router](https://github.com/dmmdea/meta-router)가 좋습니다. skill-advisor는 "내게 뭐가 있고 왜 엉뚱하게 동작하는지"를 보는 도구라 함께 쓸 수 있습니다. 자세한 비교표는 [영문 README](README.md#how-it-compares)에 있습니다.

## 라이선스

MIT, [로뎀시스템(Rothem System)](https://github.com/rothemsys)
