# Findings — 2026-10-05 세션에서 확인한 검사 도구 결함

통일 작업의 동기이자 회귀 테스트 목록이다. 아래 항목은 이 세션에서 이미 고쳤고,
Node 이관 후에도 같은 보장이 유지돼야 한다.

| # | 결함 | 영향 | 이 세션의 수정 | 이관 후 보장 |
|---|---|---|---|---|
| F1 | `detect-prose-in-code.sh`가 실행 비트(100644)를 잃음 | publish gate가 "SKIPPED"로 산문 검사를 건너뜀 | 실행 비트 복구, `check-script-modes.mjs` 추가 | 검사기 누락은 항상 차단 |
| F2 | gate의 검사기 9개가 `if [ -x ]; fi`로 else 없이 감싸짐 | 실행 불가 시 출력에서 통째로 사라짐 | `require_checker`로 누락 시 차단 | 동일 |
| F3 | 존재하지 않는 경로를 넘기면 7개 검사기가 "깨끗함"으로 통과 | 경로 오타 = gate 통과 | 경로 존재 검사 추가 | walker가 0건·없는 경로를 오류로 |
| F4 | zsh가 `$VAR`를 단어 분리하지 않아 파일 목록이 경로 하나로 전달 → "검사 챕터 0" | 리뷰 에이전트도 검사 0건으로 통과 | F3으로 오류화 | 동일 |
| F5 | gate가 산문 검사를 인자 없이 호출 | draft 위반 1,030줄이 매 커밋 출력 | `--published-only` | gate는 대상 파일만 |
| F6 | 다이어그램 증분 빌드가 mtime 기준 | git checkout 후 무관한 SVG 재빌드, tex 수정 미반영 SVG 24개 방치(그중 5개는 빈 그림) | 내용 해시 stamp, `--check`, pre-commit `diagram-fresh` | stamp 형식 유지 |
| F7 | 검사기가 프로브 없이 tex를 컴파일 못 하는 상태를 몰랐음 | 51개 그림이 재빌드 불가(라이브러리·폰트 누락, 오타) | 프리앰블·오타 수정 | 전체 `--check`가 CI에서 돎 |
| F8 | xelatex 감지가 `\setmainhangulfont`를 놓침 | kotex 그림이 pdflatex로 돌아 실패 | 감지 정규식 보완 | 동일 |
| F9 | 폰트에 없는 글자(μ, sans 한글)가 빈칸으로 렌더 | 발행 그림에 빈 괄호·빈 박스 | 로그의 "Missing character" 경고 | 경고 유지 |
| F10 | `.pyc`가 git에 추적됨 | 저장소 오염 | 추적 해제, `*.pyc` ignore | — |
| F11 | 다이어그램 빌드가 동기화 디렉터리(linear-algebra, set-theory)까지 다시 씀 | `../book-notes` 원본과 어긋남 | 빌드 대상에서 제외 | 동일 |
| F12 | 인자 없이 gate를 돌리면 macOS bash 3.2에서 `"${ARGS[@]}"`가 unbound variable로 첫 단계 전에 죽고, EXIT trap이 종료 코드를 0으로 덮음 | 로컬 `npm run audit:gate`(전체 sweep)가 검사 0건으로 "성공" | `${ARGS[@]+"${ARGS[@]}"}`, trap에서 `$?` 보존 | Node 오케스트레이터는 셸 버전 무관 |
