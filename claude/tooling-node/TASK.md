# Tooling workstream — Python·Bash 검사 도구를 Node로 통일

Cross-phase workstream (like `security-admin`). Numbered phases are unaffected.

## Why

`scripts/`는 Node 133개(11.5k줄), Python 22개(3.9k줄), Bash 13개(1.3k줄)가 섞여 있다.
Python 도구는 frontmatter·코드 블록을 정규식으로 따로 해석하므로, 사이트가 보는
마크다운과 검사기가 보는 마크다운이 어긋날 수 있다. 2026-10-05 세션에서 실제로
겪은 결함은 `FINDINGS.md`에 있다. 통일 대상은 Node(사이트와 같은 런타임·파서)다.

## Non-negotiable rule — parity before deletion

옛 도구는 새 도구가 **전체 콘텐츠(draft 포함)에서 같은 판정**을 낸 뒤에만 지운다.
판정이 의도적으로 달라지면(버그 수정 등) 그 차이를 `CHANGES.md`에 파일·줄 단위로
기록하고 사용자 승인을 받는다. 판정이 조용히 약해지는 것이 이 작업의 최대 위험이다.

## Active batch

- `PH-TN-01` Parity harness — `scripts/tooling-parity.mjs <old-cmd> <new-cmd>`:
  두 명령을 같은 대상에 돌려 출력(경로·줄·카테고리)을 정규화해 비교, 차이가 있으면 exit 1.
- `PH-TN-02` Shared content walker (`scripts/lib/content-walk.mjs`): 경로 해석,
  없는 경로·0건 매칭 시 오류, draft 판정(스키마 기본값 `draft=false` 반영), frontmatter 파싱.
- `PH-TN-03` `audit-translationese.py` → `.mjs` (parity 통과 후 `.py`를 얇은 래퍼로 교체).
- `PH-TN-04` `audit-tone-consistency.py` → `.mjs` (같은 방식).

Implement only this batch in one run. After verification, record the handoff and
activate the next pending tasks.

## Full backlog (호출 빈도·위험 순)

- [ ] `PH-TN-01` Parity harness
- [ ] `PH-TN-02` Shared content walker
- [ ] `PH-TN-03` audit-translationese
- [ ] `PH-TN-04` audit-tone-consistency
- [ ] `PH-TN-05` detect-prose-in-code (.py + .sh 래퍼) — 코드 펜스 판정은 remark로
- [ ] `PH-TN-06` audit-internal-links, resolve-internal-links
- [ ] `PH-TN-07` audit-series-integrity, audit-image-coverage
- [ ] `PH-TN-08` audit-upstream-freshness, audit-cited-symbols, audit-prose-staleness, audit-roadmap-staleness, audit-resource-freshness, audit-industry-watch
- [ ] `PH-TN-09` detect-text-overlap (TeX 호출 포함)
- [ ] `PH-TN-10` Bash 검사기: detect-ascii-diagrams, audit-suspect-claims, verify-known-facts, audit-fact-density, detect-tikz-overlap
- [ ] `PH-TN-11` audit-publish-gate.sh → Node 오케스트레이터 (훅 호환 셸 래퍼 유지)
- [ ] `PH-TN-12` build-diagrams.sh → Node (stamp 형식 `<!-- tikz-src sha256=… -->` 유지), watch-diagrams.sh
- [ ] `PH-TN-13` 미참조 스크립트 분류 — 옮김/보관/폐기 목록을 만들고 **폐기는 사용자 승인 후**:
  convert-bullet-blocks.py, convert-self-check.py, convert-outline-blocks.py, convert-tone.py,
  check-post-dates.py, normalize-post-dates.py, check-duplicate-topic.py, audit-content-coverage.py,
  spec-section.sh, build-tikz.sh

`sync-deps.sh`, `bootstrap.sh`는 개발 환경 부트스트랩이라 Bash로 남겨도 된다(판단은 PH-TN-13).

## Shared completion rule

Every task needs changed files, a verification command (parity result 포함), and a
result recorded in `CHANGES.md` and `VERIFICATION.md`. 기존 npm script·lefthook·
publish gate의 호출 이름은 바꾸지 않는다(래퍼로 호환).
