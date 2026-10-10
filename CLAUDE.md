# 블로그 글쓰기 가이드라인

이 저장소(`hawk90.github.io`)에 글을 쓰거나 다듬을 때 따르는 규칙입니다. 한국어 톤, 구조, 코드 예시, frontmatter 등 모든 결정을 한 자리에 모았습니다.

---

## 스타일 가이드 (상세 규칙)

세부 규칙은 `.claude/rules/`에 있고 Claude Code가 자동 로드합니다(각 파일의 `paths:` 범위 — 블로그 콘텐츠·다이어그램을 다룰 때). 섹션 번호 §1~§11은 커맨드·에이전트·스크립트가 상호참조하므로 그대로 유지합니다.

| 섹션 | 파일 |
|------|------|
| §1 톤 · §2 한국어 산문 | `.claude/rules/01-tone-and-prose.md` |
| §3 글 구조 · §4 Frontmatter | `.claude/rules/02-structure-and-frontmatter.md` |
| §5 코드 예시 · §6 시각 자료 | `.claude/rules/03-code-and-visuals.md` |
| §7 교차 링크 · §8 카테고리 · §9 시리즈 양산 | `.claude/rules/04-linking-and-catalog.md` |
| §10 흔한 실수·Hallucination 방지 · §11 접근성 | `.claude/rules/05-quality.md` |
| 안티패턴 처분 증거 규칙 | `.claude/rules/06-remediation-evidence.md` |

## 12. 동기화된 콘텐츠

다음은 다른 저장소에서 동기화되는 콘텐츠입니다. **직접 편집하지 마세요.**

- `src/content/blog/math/linear-algebra/**`, `src/content/blog/math/set-theory/**` (+ `public/images/blog/<series>/`) — `../book-notes/<series>/`에서 동기화. `npm run sync:book-notes`는 dry run이고, 실제 쓰기는 `npm run sync:book-notes -- --apply`.
- `npm run diagrams`는 위 두 그림 디렉터리(`public/images/blog/linear-algebra`, `set-theory`)를 건너뜁니다. 그림 소스도 원본 저장소에서 고칩니다.

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
| ② 시각화 | ASCII 다이어그램, TikZ 겹침, 코드 블록 산문 | `npm run diagrams` · `detect-ascii-diagrams.sh` · `detect-tikz-overlap.sh`(게이트, 차단) · `detect-text-overlap.py`(strict, 수동) · `detect-prose-in-code.sh` |
| ③ 사실 검증 | hallucination 후보, known-fact, 이미 틀렸다고 확인된 주장, 인용 심볼 존재, upstream drift, 글 단위 1차 자료 대조 | `audit-suspect-claims.sh` · `verify-known-facts.sh` · `audit:falsehoods` · `audit-cited-symbols.py` · `audit:upstream` · `/fact-check-round` |
| ④ 발행 게이트 | ①③의 blocking 부분을 한 번에 | `npm run audit:gate` (= `audit-publish-gate.sh`) |
| ⑤ 구조 무결성 | seriesOrder gap·draft 혼합·링크 rot·중복·미작성 장(stub) | `audit:series` · `audit:links` · `check:duplicate` · `audit:series-structure` · `audit:connectivity` · `audit:completeness` |
| ⑥ 유지보수 (발행 후) | upstream 코드·spec 변화, 인용 심볼 rename, 로드맵 만료, 산문 미래 시제·날짜 앵커 stale | `audit:upstream` · `audit-cited-symbols.py` · `audit:roadmap` · `audit:staleness` |
| ⑦ URL·경로 | 두 글이 같은 URL을 주장, 손으로 조립한 post URL | `audit:routes` · `audit:content-portability` |
| ⑧ 렌더된 결과 | 표 잘림·제목 계층 건너뜀·alt 누락·링크 이름 없음·깨진 `#앵커` (빌드된 HTML 대상) | `audit:reading` · `audit:anchors` |
| ⑨ 자산 | 다이어그램 참조 rot, alt 커버리지, 미참조 SVG | `audit:diagram-accessibility` · `audit:diagrams` |

### Dispatch — 언제 자동으로 도는가

- **commit 시**: lefthook `pre-commit`이 staged `src/content/blog/**/*.md`에 `audit-publish-gate.sh` + 태그 모양 자동 정규화(`normalize-tag-shape.mjs --apply`, 같은 커밋에 stage) + 필수 frontmatter(`title`·`date`·`description`) 검사 + 의도하지 않은 인라인 수식(`check-inline-math.mjs` — 가격 `$20K~$40K`·셸 `${D}`처럼 `$` 두 개가 수식으로 렌더되는 것) 검사.
- **push 시**: lefthook `pre-push`가 push되는 commit 범위(새 브랜치는 `origin/main`과의 merge-base부터)에서 바뀐 글에 gate.
- **수동 sweep**: `npm run audit:gate` (전체), `npm run audit:upstream` (local clone 기준 drift — 기본 offline, fetch는 `python3 scripts/audit-upstream-freshness.py --fetch`), `npm run audit:staleness` (산문 미래 시제·날짜 앵커), `npm run audit:tags` (태그 어휘 — 리포트형이라 pass/fail 아님).
- **`npm run verify:release`**: ④(전체 publish gate, non-strict)·⑤⑦⑧⑨를 포함한 릴리스 검사 전체(`scripts/verify-release.mjs`)를 한 번에. 발행된 글이 stub(`(작성 예정)`·`Outline —` 같은 placeholder뿐인 글)이거나 시리즈 계획서면 `gate:completeness`가 막는다. ⑧은 `dist/`를 읽으므로 빌드 *뒤*에 돕니다 — 표 잘림·제목 계층은 마크다운 원본에는 없고 렌더된 HTML에만 있습니다. CI가 배포 전 이걸 돌립니다.
- **완성도 vs draft**: `draft:true`는 *발행 여부*, `audit:completeness`는 *본문이 쓰였는지*를 본다(stub·partial·thin·plan). 미작성 백로그는 `reports/content-completeness/latest.md`가 정본(시리즈별 stub 수). 글별 줄 번호는 실행할 때 생기는 `latest.json`에 있고, 커밋하지 않는다.
- **known-facts vs known-falsehoods**: `data/known-facts.yaml`은 *실존하는 이름*의 화이트리스트(미등재 = review 후보), `data/known-falsehoods.yaml`은 팩트체크에서 *틀렸다고 확인된 문자열*의 블랙리스트(매치 = 차단). 한 글에서 고친 오류가 같은 주제의 다른 시리즈에 남는 것을 막는다. known-falsehoods는 게이트와 `verify:release` 둘 다에서 돌고, known-facts는 게이트(경고)에서만 돈다.
- **인용 심볼 SKIPPED ≠ PASS**: `audit-cited-symbols.py`는 upstream clone이 하나도 없으면 exit 3으로 "검사 안 함"을 알린다. CI에는 clone이 없으므로 이 검사는 로컬에서 clone을 받은 뒤에만 의미가 있다.
- **staleness 두 도구 구분**: `audit:roadmap`은 `known-facts.yaml`에 *등재된 SKU*의 `review:` 날짜만, `audit:staleness`는 *본문 산문 자체*의 미래 시제(`예정`·`미발표`)·날짜 앵커(`YYYY년 현재`)를 훑는다. 등재 안 된 주장은 후자만 잡는다.
- **다이어그램 캐시**: `npm run diagrams`는 mtime이 아니라 내용 해시로 판단한다. 각 `.svg`에 `<!-- tikz-src sha256=… -->` stamp가 있고, `.tex`나 `_design*.tex`가 바뀌어 해시가 달라질 때만 다시 빌드한다. `npm run check:diagrams`는 빌드 없이 stamp 불일치(= `.tex`만 고치고 `.svg`를 안 만든 상태)를 찾고, pre-commit `diagram-fresh`가 같은 검사를 한다.
- **새 스크립트는 Node(`.mjs`)로 쓴다.** 기존 Python·Bash 검사기는 `claude/tooling-node/` 패킷에서 parity 검증을 거쳐 옮긴다.
- **게이트가 느릴 때**: `git commit/push --no-verify`로 우회하되 *책임 본인* — 우회했으면 `npm run audit:gate`를 별도로 돌린다.

### Slash 커맨드 (`.claude/commands/`)

의도 기반 진입점. 스크립트 이름을 몰라도 단계로 부른다.

- `/pre-publish [dir]` — 발행 전 통합 gate (④).
- `/audit-freshness` — upstream drift + 인용 심볼 존재 + 산문 staleness (③⑥).
- `/fact-check-round <series dir>` — 발행된 시리즈를 장마다 1차 자료와 대조, 장마다 출처를 적은 커밋 (③).
- `/new-chapter` — frontmatter 스캐폴딩 (§4 준수).
- 거버넌스·리메디에이션: `/content-readiness-run`, `/content-governance-run`, `/methodology-batch-run`, `/phase-run`, `/phase-verify`, `/security-admin-run`, `/security-admin-verify`.
- 에이전트(`.claude/agents/`): `korean-prose-critic`, `hallucination-triage`, `content-governance`, `phase-guardian`.

### Upstream tracking 등록

외부 repo·spec을 인용하는 시리즈는 `data/upstream-tracking.yaml`에 등록해야 ③⑥ 자동화가 적용됩니다. 스키마·baseline 갱신 규칙은 그 파일 주석 참조. 인용 심볼 중 upstream에 *의도적으로 없는 것*(버전 네임스페이스 등)은 `cited_symbol_whitelist`로 예외 처리.

---

## 15. Claude Code 실행 패킷

코드 리팩터링 작업은 [claude/WORKFLOW.md](claude/WORKFLOW.md)를 따릅니다. 패킷은 `claude/phase-00`~`phase-07`; 어느 패킷·태스크가 활성인지는 각 `STATE.json`의 `status`·`activeTasks`가 정본입니다(phase-00은 `completed`, phase-01은 15/46 작업 뒤 `paused`, 나머지는 `queued`). `queued`·`paused` 패킷도 `activeTasks`를 갖고 있지만 활성이 아닙니다 — 활성화·재개는 사용자 결정 — 스스로 활성화하지 않습니다.
