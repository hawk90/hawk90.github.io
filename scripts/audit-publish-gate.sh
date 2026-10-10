#!/usr/bin/env bash
# audit-publish-gate.sh — pre-publish 통합 검증 gate
#
# CLAUDE.md §1·§6·§10에 정의된 publish 전 검증을 한 번에 실행:
#   1.  ASCII 박스 다이어그램 (자동 차단)
#   2.  TikZ 텍스트 근접 휴리스틱 (전체 sweep에서만, 참고)
#   3.  코드 블록 내 한국어 산문 후보 (수동 review)
#   3b. Tone 일관성 §1 — ~합니다/~다 혼용 (자동 차단)
#   4.  Hallucination 후보 (수동 review 알림)
#   5b. 이미 틀렸다고 확인된 주장 (data/known-falsehoods.yaml, 자동 차단)
#
# Usage:
#   ./scripts/audit-publish-gate.sh                  # 전체 published
#   ./scripts/audit-publish-gate.sh <path>           # 특정 디렉토리·파일
#   ./scripts/audit-publish-gate.sh --strict         # hallucination 후보도 차단
#
# Exit code:
#   0 = all gates pass
#   1 = blocking violation or a checker that did not run — publish 금지
#   2 = hallucination candidates only — strict 모드에서만 차단

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/audit-publish-gate.XXXXXX")"
# 종료 코드를 보존한다. 예전에는 trap이 오류 종료(예: bash 3.2의 빈 배열
# unbound variable)를 0으로 덮어 "검사 0건 + 성공"이 됐다.
trap 'rc=$?; rm -rf "$TMP_DIR"; exit $rc' EXIT
STRICT=0
ARGS=()

while [ $# -gt 0 ]; do
  case "$1" in
    --strict) STRICT=1; shift ;;
    --help|-h) sed -n '2,18p' "$0"; exit 0 ;;
    *) ARGS+=("$1"); shift ;;
  esac
done

FAILED=0
HALLUCINATION_FOUND=0

run_check() {
  local name="$1"
  local blocking="$2"  # "block" or "warn"
  shift 2
  local output="$TMP_DIR/audit-out.txt"

  echo ""
  echo "═══ $name ═══"

  local rc=0
  "$@" > "$output" 2>&1 || rc=$?
  if [ "$rc" -eq 0 ]; then
    echo "✓ PASS"
  else
    cat "$output"
    if [ "$blocking" = "warn" ] && [ "$rc" -ge 2 ]; then
      # A warn checker reports findings with exit 1. Anything else (a crash,
      # a missing path, 127 for a missing interpreter) means it did not run,
      # which must not read as "candidates, review later".
      echo ""
      echo "✗ 검사기 오류 (exit $rc) — 검사가 돌지 않았다"
      FAILED=$((FAILED + 1))
    elif [ "$blocking" = "block" ]; then
      echo ""
      echo "✗ BLOCKING — publish 금지"
      FAILED=$((FAILED + 1))
    else
      HALLUCINATION_FOUND=1
      echo ""
      echo "⚠ WARN — 수동 review 필요"
    fi
  fi
}

# 검사기가 없거나 실행 권한이 없으면 조용히 건너뛰지 않고 차단한다.
# (detect-prose-in-code.sh가 실행 비트를 잃은 채 SKIPPED로 통과하던 일이 있었다.)
require_checker() {
  local script="$ROOT/scripts/$1"
  if [ -x "$script" ]; then
    return 0
  fi
  echo ""
  echo "═══ 검사기 누락: $1 ═══"
  if [ -f "$script" ]; then
    echo "✗ 실행 권한 없음 — chmod +x scripts/$1 (git update-index --chmod=+x)"
  else
    echo "✗ 파일 없음 — scripts/$1"
  fi
  echo "✗ BLOCKING — 검사를 건너뛴 채 통과시킬 수 없음"
  FAILED=$((FAILED + 1))
  return 1
}

# 1. ASCII 박스 다이어그램
if require_checker "detect-ascii-diagrams.sh"; then
  run_check \
    "1/4 ASCII 박스 다이어그램 검사 (CLAUDE.md §6)" \
    "block" \
    "$ROOT/scripts/detect-ascii-diagrams.sh" ${ARGS[@]+"${ARGS[@]}"}
fi

# 2. TikZ 텍스트 근접 휴리스틱 — 전체 .tex 순위표(점수만, 렌더링 안 함).
#    --fail-above 없이는 exit 0뿐이라 "차단"이라고 적혀 있어도 막은 적이 없다.
#    점수 30 초과가 277개라 차단으로 돌릴 수도 없다. 경로를 받는 커밋 단위
#    실행에서는 건너뛰고, 전체 sweep에서만 상위 5개를 참고로 보여 준다.
if [ ${#ARGS[@]} -eq 0 ] && require_checker "detect-tikz-overlap.sh"; then
  echo ""
  echo "═══ 2/10 TikZ 텍스트 근접 휴리스틱 (informational) ═══"
  "$ROOT/scripts/detect-tikz-overlap.sh" --report "$TMP_DIR/tikz-overlap.txt" 2>&1 | head -8 || true
  echo "ℹ  실제 겹침은 python3 scripts/detect-text-overlap.py --series <name>"
fi

# 3. 코드 블록 내 한국어 산문
if require_checker "detect-prose-in-code.sh"; then
  run_check \
    "3/4 코드 블록 내 한국어 산문 후보" \
    "warn" \
    "$ROOT/scripts/detect-prose-in-code.sh" --published-only ${ARGS[@]+"${ARGS[@]}"}
fi

# 3b. Tone 일관성 (~합니다 vs ~다 혼용·시리즈 이탈) — MIXED 차단
if require_checker "audit-tone-consistency.py"; then
  run_check \
    "3b/10 Tone 일관성 (CLAUDE.md §1, MIXED 차단)" \
    "block" \
    python3 "$ROOT/scripts/audit-tone-consistency.py" ${ARGS[@]+"${ARGS[@]}"}
fi

# 3c. 번역체·AI 상투구 후보 (CLAUDE.md §2) — 휴리스틱이라 warn (후보 = 위반 아님).
#     확정·리라이트는 korean-prose-critic 에이전트로.
if require_checker "audit-translationese.py"; then
  run_check \
    "3c/10 번역체·AI 상투구 후보 (CLAUDE.md §2)" \
    "warn" \
    python3 "$ROOT/scripts/audit-translationese.py" ${ARGS[@]+"${ARGS[@]}"}
fi

# 4. Hallucination 후보 — strict 모드에서만 block
if require_checker "audit-suspect-claims.sh"; then
  run_check \
    "4/10 Hallucination 후보 (CLAUDE.md §10)" \
    "warn" \
    "$ROOT/scripts/audit-suspect-claims.sh" ${ARGS[@]+"${ARGS[@]}"}
fi

# 5. Known-fact whitelist 검증 — strict 모드에서만 block
if require_checker "verify-known-facts.sh"; then
  run_check \
    "5/10 Known-fact whitelist (data/known-facts.yaml)" \
    "warn" \
    "$ROOT/scripts/verify-known-facts.sh" ${ARGS[@]+"${ARGS[@]}"}
fi

# 5b. Known falsehoods — 팩트체크에서 틀렸다고 확인된 문자열(data/known-falsehoods.yaml).
#     후보가 아니라 확정 오류라서 strict와 무관하게 차단한다.
if require_checker "audit-known-falsehoods.mjs"; then
  run_check \
    "5b/10 Known falsehoods (data/known-falsehoods.yaml)" \
    "block" \
    node "$ROOT/scripts/audit-known-falsehoods.mjs" ${ARGS[@]+"${ARGS[@]}"}
fi

# 6. Universal fact-density (informational, 항상 warn — review 우선순위 식별)
if require_checker "audit-fact-density.sh"; then
  run_check \
    "6/10 Fact-density 분석 (universal, 모든 챕터)" \
    "warn" \
    "$ROOT/scripts/audit-fact-density.sh" --top 20 ${ARGS[@]+"${ARGS[@]}"}
fi

# 7. Upstream freshness — code-review·spec-analysis 시리즈가 upstream에 얼마나 뒤처졌나
#    --no-fetch: local clone 기준만 (빠름, fetch는 별도 npm run audit:upstream)
if require_checker "audit-upstream-freshness.py" && [ -f "$ROOT/data/upstream-tracking.yaml" ]; then
  echo ""
  echo "═══ 7/10 Upstream freshness (code-review·spec) ═══"
  if python3 "$ROOT/scripts/audit-upstream-freshness.py" --no-fetch --top 5 > "$TMP_DIR/audit-freshness.txt" 2>&1; then
    # staleness 요약만 표시 (Top chapter는 상세 명령으로)
    grep -E "^## |Since baseline:|Chapters:" "$TMP_DIR/audit-freshness.txt" || true
    echo "ℹ  상세는 'npm run audit:upstream' 실행 (fetch 포함)"
  else
    # clone이 없는 시리즈는 스크립트 안에서 SKIPPED로 끝나고 exit 0이다.
    # 여기 오는 건 도구 자체 오류(YAML 파싱 실패 등) — SKIPPED로 삼키지 않는다.
    cat "$TMP_DIR/audit-freshness.txt"
    echo "✗ 도구 오류 — audit-upstream-freshness.py가 실패"
    FAILED=$((FAILED + 1))
  fi
fi

# 7b. Cited-symbol existence — 글이 인용한 라이브러리 심볼이 upstream에 실제 존재?
#     rename·삭제·hallucination(존재하지 않는 API 이름) 탐지. 후보=수동 review.
if require_checker "audit-cited-symbols.py" && [ -f "$ROOT/data/upstream-tracking.yaml" ]; then
  echo ""
  echo "═══ 7b/10 Cited-symbol existence (rename·hallucination) ═══"
  SYMBOLS_RC=0
  python3 "$ROOT/scripts/audit-cited-symbols.py" > "$TMP_DIR/audit-symbols.txt" 2>&1 || SYMBOLS_RC=$?
  if [ "$SYMBOLS_RC" -eq 0 ]; then
    grep -E "^## |MISSING: 0|✓ 모든" "$TMP_DIR/audit-symbols.txt" || true
    echo "✓ PASS — 검사한 시리즈의 인용 심볼 모두 존재"
    grep -E "^  SKIP " "$TMP_DIR/audit-symbols.txt" || true
  elif [ "$SYMBOLS_RC" -eq 3 ]; then
    grep -E "^  SKIP " "$TMP_DIR/audit-symbols.txt" || true
    echo "− SKIPPED — upstream clone이 없어 아무것도 검사하지 않음 (PASS 아님)"
  elif [ "$SYMBOLS_RC" -ne 2 ]; then
    cat "$TMP_DIR/audit-symbols.txt"
    echo "✗ 도구 오류 — audit-cited-symbols.py exit $SYMBOLS_RC"
    FAILED=$((FAILED + 1))
  else
    # exit 2 = MISSING 후보 있음 (informational, 사람이 확인)
    grep -E "^## |MISSING:|    - \`" "$TMP_DIR/audit-symbols.txt" || true
    echo "ℹ  MISSING 후보 = hallucination 아님. 각 심볼을 upstream에 확인 후 수정, 확인 안 되면 삭제."
    echo "ℹ  상세: python3 scripts/audit-cited-symbols.py [--series <id>]"
    if [ "$STRICT" -eq 1 ]; then
      echo "✗ --strict: 인용 심볼 부재 차단"
      FAILED=$((FAILED + 1))
    fi
  fi
fi

# 8. Internal link rot — /blog/... 링크가 실제 파일을 가리키는지
#    Python 버전이 image markdown ![]()과 page link []()를 구별해 정확.
#    인자 전달 — 단일 파일/디렉터리만 검사 가능.
if require_checker "audit-internal-links.py"; then
  run_check \
    "8/10 Internal link rot (/blog/... page link)" \
    "block" \
    python3 "$ROOT/scripts/audit-internal-links.py" ${ARGS[@]+"${ARGS[@]}"}
fi

# 9. Series integrity — seriesOrder gap·draft 혼합·date 역행·중복 검출
if require_checker "audit-series-integrity.py"; then
  echo ""
  echo "═══ 9/10 Series integrity (frontmatter 일관성) ═══"
  if python3 "$ROOT/scripts/audit-series-integrity.py" --quiet > "$TMP_DIR/audit-integrity.txt" 2>&1; then
    head -3 "$TMP_DIR/audit-integrity.txt"
    echo "ℹ  상세는 'npm run audit:series' 실행"
  else
    # head -3 showed the summary and hid which series and files were blocking.
    cat "$TMP_DIR/audit-integrity.txt"
    echo "ℹ  Blocking 위반 발견 — 'npm run audit:series'로 확인"
    FAILED=$((FAILED + 1))
  fi
fi

# 10. Image coverage — §11 접근성 — 추상 개념 vs 이미지 0개 챕터 ranking.
#     전체 코퍼스 순위표(5초)라 커밋 단위(경로 인자) 실행에서는 건너뛴다.
if [ ${#ARGS[@]} -eq 0 ] && require_checker "audit-image-coverage.py"; then
  echo ""
  echo "═══ 10/10 Image coverage (§11 접근성, informational) ═══"
  python3 "$ROOT/scripts/audit-image-coverage.py" --top 5 > "$TMP_DIR/images.txt" 2>&1 || true
  head -5 "$TMP_DIR/images.txt"
  echo "ℹ  상세는 'npm run audit:images' 실행"
fi

echo ""
echo "═══════════════════════════════════════"
if [ "$FAILED" -gt 0 ]; then
  echo "✗ $FAILED blocking gate(s) 실패 — publish 금지"
  exit 1
elif [ "$HALLUCINATION_FOUND" -eq 1 ]; then
  if [ "$STRICT" -eq 1 ]; then
    echo "✗ Hallucination 후보 발견 — strict 모드 publish 금지"
    exit 2
  else
    echo "✓ All blocking gates pass. Hallucination 후보는 수동 review 필요."
    echo "  (--strict 옵션으로 차단 모드 활성화 가능)"
    exit 0
  fi
else
  echo "✓ All blocking gates pass. Publish OK."
  exit 0
fi
