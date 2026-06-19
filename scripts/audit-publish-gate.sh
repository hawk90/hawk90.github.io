#!/usr/bin/env bash
# audit-publish-gate.sh — pre-publish 통합 검증 gate
#
# CLAUDE.md §6·§10에 정의된 publish 전 4가지 검증을 한 번에 실행:
#   1. ASCII 박스 다이어그램 (자동 차단)
#   2. TikZ 텍스트 겹침 (자동 차단)
#   3. 코드 블록 내 한국어 산문 (자동 차단)
#   4. Hallucination 후보 (수동 review 알림)
#
# Usage:
#   ./scripts/audit-publish-gate.sh                  # 전체 published
#   ./scripts/audit-publish-gate.sh <path>           # 특정 디렉토리·파일
#   ./scripts/audit-publish-gate.sh --strict         # hallucination 후보도 차단
#
# Exit code:
#   0 = all gates pass
#   1 = blocking violation (rules 1·2·3) — publish 금지
#   2 = hallucination candidates only — strict 모드에서만 차단

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
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
  local cmd="$2"
  local blocking="$3"  # "block" or "warn"

  echo ""
  echo "═══ $name ═══"

  if eval "$cmd" > /tmp/audit-out.txt 2>&1; then
    echo "✓ PASS"
  else
    cat /tmp/audit-out.txt
    if [ "$blocking" = "block" ]; then
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

ARGS_STR="${ARGS[*]:-}"

# 1. ASCII 박스 다이어그램
run_check \
  "1/4 ASCII 박스 다이어그램 검사 (CLAUDE.md §6)" \
  "$ROOT/scripts/detect-ascii-diagrams.sh $ARGS_STR" \
  "block"

# 2. TikZ 텍스트 겹침 (시리즈 인자 없이 전체 빠른 검사)
if [ -x "$ROOT/scripts/detect-tikz-overlap.sh" ]; then
  run_check \
    "2/4 TikZ 텍스트 근접 휴리스틱" \
    "$ROOT/scripts/detect-tikz-overlap.sh" \
    "block"
else
  echo ""
  echo "═══ 2/4 TikZ 텍스트 근접 휴리스틱 ═══"
  echo "− SKIPPED (detect-tikz-overlap.sh 미존재)"
fi

# 3. 코드 블록 내 한국어 산문
if [ -x "$ROOT/scripts/detect-prose-in-code.sh" ]; then
  run_check \
    "3/4 코드 블록 내 한국어 산문" \
    "$ROOT/scripts/detect-prose-in-code.sh" \
    "block"
else
  echo ""
  echo "═══ 3/4 코드 블록 내 한국어 산문 ═══"
  echo "− SKIPPED (detect-prose-in-code.sh 미존재)"
fi

# 4. Hallucination 후보 — strict 모드에서만 block
run_check \
  "4/5 Hallucination 후보 (CLAUDE.md §10)" \
  "$ROOT/scripts/audit-suspect-claims.sh $ARGS_STR" \
  "warn"

# 5. Known-fact whitelist 검증 — strict 모드에서만 block
if [ -x "$ROOT/scripts/verify-known-facts.sh" ]; then
  run_check \
    "5/6 Known-fact whitelist (data/known-facts.yaml)" \
    "$ROOT/scripts/verify-known-facts.sh $ARGS_STR" \
    "warn"
fi

# 6. Universal fact-density (informational, 항상 warn — review 우선순위 식별)
if [ -x "$ROOT/scripts/audit-fact-density.sh" ]; then
  run_check \
    "6/10 Fact-density 분석 (universal, 모든 챕터)" \
    "$ROOT/scripts/audit-fact-density.sh --top 20 $ARGS_STR" \
    "warn"
fi

# 7. Upstream freshness — code-review·spec-analysis 시리즈가 upstream에 얼마나 뒤처졌나
#    --no-fetch: local clone 기준만 (빠름, fetch는 별도 npm run audit:upstream)
if [ -x "$ROOT/scripts/audit-upstream-freshness.py" ] && [ -f "$ROOT/data/upstream-tracking.yaml" ]; then
  echo ""
  echo "═══ 7/10 Upstream freshness (code-review·spec) ═══"
  if python3 "$ROOT/scripts/audit-upstream-freshness.py" --no-fetch --top 5 > /tmp/audit-freshness.txt 2>&1; then
    # staleness 요약만 표시 (Top chapter는 상세 명령으로)
    grep -E "^## |Since baseline:|Chapters:" /tmp/audit-freshness.txt || true
    echo "ℹ  상세는 'npm run audit:upstream' 실행 (fetch 포함)"
  else
    echo "− SKIPPED (upstream tracking 미설정 또는 clone 없음)"
  fi
fi

# 8. Internal link rot — /blog/... 링크가 실제 파일을 가리키는지
#    인자 전달 — 단일 파일/디렉터리 publish 시 그 대상만 검사 (전체 검사는 별 작업)
if [ -x "$ROOT/scripts/audit-internal-links.sh" ]; then
  run_check \
    "8/10 Internal link rot (/blog/... 깨진 링크)" \
    "$ROOT/scripts/audit-internal-links.sh $ARGS_STR" \
    "block"
fi

# 9. Series integrity — seriesOrder gap·draft 혼합·date 역행·중복 검출
if [ -x "$ROOT/scripts/audit-series-integrity.py" ]; then
  echo ""
  echo "═══ 9/10 Series integrity (frontmatter 일관성) ═══"
  if python3 "$ROOT/scripts/audit-series-integrity.py" --quiet > /tmp/audit-integrity.txt 2>&1; then
    head -3 /tmp/audit-integrity.txt
    echo "ℹ  상세는 'npm run audit:series' 실행"
  else
    head -3 /tmp/audit-integrity.txt
    echo "ℹ  Blocking 위반 발견 — 'npm run audit:series'로 확인"
    FAILED=$((FAILED + 1))
  fi
fi

# 10. Image coverage — §11 접근성 — 추상 개념 vs 이미지 0개 챕터 ranking
if [ -x "$ROOT/scripts/audit-image-coverage.py" ]; then
  echo ""
  echo "═══ 10/10 Image coverage (§11 접근성, informational) ═══"
  python3 "$ROOT/scripts/audit-image-coverage.py" --top 5 2>&1 | head -5
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
