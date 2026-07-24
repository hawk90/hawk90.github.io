# 블로그 글쓰기 가이드라인

이 저장소(`hawk90.github.io`)에 글을 쓰거나 다듬을 때 따르는 규칙입니다. 한국어 톤, 구조, 코드 예시, frontmatter 등 모든 결정을 한 자리에 모았습니다.

---

## 스타일 가이드 (상세 규칙)

세부 스타일 규칙은 아래 파일로 분리돼 있으며, 세션 시작 시 이 지점에 인라인 로드됩니다. 섹션 번호(§1~§11)와 모든 상호참조는 그대로 유지됩니다.

@.claude/rules/01-tone-and-prose.md
@.claude/rules/02-structure-and-frontmatter.md
@.claude/rules/03-code-and-visuals.md
@.claude/rules/04-linking-and-catalog.md
@.claude/rules/05-quality.md

## 12. 동기화된 콘텐츠

다음은 다른 저장소에서 동기화되는 콘텐츠입니다. **직접 편집하지 마세요.**

- `src/content/blog/math/linear-algebra/**` — `../book-notes/`에서 `npm run sync:book-notes`로 동기화.

원본을 수정하고 동기화 스크립트를 다시 돌리는 방식으로 작업합니다.

---

## 13. 작업 원칙 (사용자가 자주 강조한 것)

- **드래프트 우선.** 글을 한 번에 완성으로 보지 않습니다. 사용자가 "발행" 또는 "draft 풀어"라고 하기 전까지 모두 draft.
- **반복 수정 허용.** 한 시리즈 안에서도 톤·예시·구조를 사용자가 피드백하면 즉시 반영.
- **사용자가 직접 결정하는 것** — 톤 전환, 발행 여부, 시리즈 추가/제거, 카테고리 변경.
- **AI가 결정하는 것** — 코드 예시 선택, 단락 흐름, 절 분할, 표 사용 여부.
- **overview 글 만들지 않기.** 새 시리즈를 만들 때 별도의 *overview / preface / 00-* 글을 추가하지 않습니다. 시리즈 첫 글이 도입을 겸하면 충분합니다.

  예외(이 네 시리즈만 1편짜리 overview 허용):
  - Embedded C++ for Real Systems
  - Modern Embedded Recipes
  - Embedded Performance Engineering
  - Practical RTOS Internals

---

## 14. 자동화 워크플로우 지도

콘텐츠 수명주기의 각 단계에 *올바른 도구 하나*가 있습니다. 스크립트를 개별로 외우지 말고 *단계 → 도구*로 찾습니다. 아래 표가 정본입니다.

| 단계 | 무엇을 검증/생성 | 도구 (`scripts/` 또는 `npm run`) |
|------|-----------------|--------------------------------|
| ① 집필 — 톤·산문 | Tone A/B 혼용, 번역체·AI 상투구 | `audit:tone` · `audit-translationese.py` · `korean-prose-critic`(agent) |
| ② 시각화 | ASCII 다이어그램, TikZ 겹침, 코드 블록 산문 | `npm run diagrams` · `detect-ascii-diagrams.sh` · `detect-text-overlap.py` · `detect-prose-in-code.sh` |
| ③ 사실 검증 | hallucination 후보, known-fact, 인용 심볼 존재, upstream drift | `audit-suspect-claims.sh` · `verify-known-facts.sh` · `audit-cited-symbols.py` · `audit:upstream` |
| ④ 발행 게이트 | ①③의 blocking 부분을 한 번에 | `npm run audit:gate` (= `audit-publish-gate.sh`) |
| ⑤ 구조 무결성 | seriesOrder gap·draft 혼합·링크 rot·중복 | `audit:series` · `audit:links` · `check:duplicate` |
| ⑥ 유지보수 (발행 후) | upstream 코드·spec 변화, 인용 심볼 rename, 로드맵 만료 | `audit:upstream` · `audit-cited-symbols.py` · `audit:roadmap` |

### Dispatch — 언제 자동으로 도는가

- **commit 시**: lefthook `pre-commit`이 staged `.md`에 `audit-publish-gate.sh` + frontmatter 검사.
- **push 시**: lefthook `pre-push`가 push되는 commit의 변경 파일에 gate.
- **수동 sweep**: `npm run audit:gate` (전체), `npm run audit:upstream` (fetch 포함 drift).
- **게이트가 느릴 때**: `git commit/push --no-verify`로 우회하되 *책임 본인* — 우회했으면 `npm run audit:gate`를 별도로 돌린다.

### Slash 커맨드 (`.claude/commands/`)

의도 기반 진입점. 스크립트 이름을 몰라도 단계로 부른다.

- `/pre-publish [dir]` — 발행 전 통합 gate (④).
- `/audit-freshness` — upstream drift + 인용 심볼 존재 (③⑥).
- `/new-chapter` — frontmatter 스캐폴딩 (§4 준수).

### Upstream tracking 등록

외부 repo·spec을 인용하는 시리즈는 `data/upstream-tracking.yaml`에 등록해야 ③⑥ 자동화가 적용됩니다. 스키마·baseline 갱신 규칙은 그 파일 주석 참조. 인용 심볼 중 upstream에 *의도적으로 없는 것*(버전 네임스페이스 등)은 `cited_symbol_whitelist`로 예외 처리.
