#!/usr/bin/env bash
# audit-suspect-claims.sh — pattern-based hallucination candidate detector
#
# CLAUDE.md §10 "Hallucination 방지"의 7 카테고리를 자동 탐지합니다.
# 각 카테고리에서 의심 패턴을 grep으로 찾고, 사람이 review할 위치를 출력합니다.
#
# Usage:
#   ./scripts/audit-suspect-claims.sh                          # 전체 published .md
#   ./scripts/audit-suspect-claims.sh <path>                   # 특정 디렉토리·파일
#   ./scripts/audit-suspect-claims.sh --category future-sku    # 특정 카테고리만
#   ./scripts/audit-suspect-claims.sh --include-drafts         # draft도 스캔
#
# 카테고리:
#   future-sku  — 미발표·미양산 SKU 단정 가능
#   spec-num    — JEDEC/DSP/RFC/IEEE 번호 단정 가능
#   kernel-api  — 가짜 kernel symbol·flag 가능
#   company-impl — 회사-구현 매핑 가능
#   codename    — Project codename 매핑 가능
#   yaml-schema — 라이브러리 schema 단정 가능
#   spec-year   — 표준 publish 연도 단정 가능
#
# Exit code: 0 = no suspects, 1 = suspects found (human review needed)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INCLUDE_DRAFTS=0
CATEGORY=""
TARGETS=()

while [ $# -gt 0 ]; do
  case "$1" in
    --include-drafts) INCLUDE_DRAFTS=1; shift ;;
    --category) CATEGORY="$2"; shift 2 ;;
    --category=*) CATEGORY="${1#--category=}"; shift ;;
    --help|-h) sed -n '2,25p' "$0"; exit 0 ;;
    *) TARGETS+=("$1"); shift ;;
  esac
done

if [ ${#TARGETS[@]} -eq 0 ]; then
  TARGETS=("$ROOT/src/content/blog")
fi

# Build file list (filter drafts unless --include-drafts)
FILES=$(find "${TARGETS[@]}" -name "*.md" -type f | while read -r f; do
  if [ "$INCLUDE_DRAFTS" -eq 0 ] && grep -q "^draft: true" "$f"; then
    continue
  fi
  echo "$f"
done)

# Run a category scan
run_category() {
  local cat="$1"
  local desc="$2"
  local pattern="$3"
  local context="$4"  # optional human-readable note

  # Skip if --category specified and doesn't match
  if [ -n "$CATEGORY" ] && [ "$CATEGORY" != "$cat" ]; then
    return 0
  fi

  echo ""
  echo "=== [$cat] $desc ==="
  if [ -n "$context" ]; then
    echo "  ($context)"
  fi
  local found=0
  while IFS= read -r f; do
    matches=$(grep -cE "$pattern" "$f" 2>/dev/null) || matches=0
    if [ "${matches:-0}" -gt 0 ] 2>/dev/null; then
      relpath="${f#$ROOT/}"
      printf "  %-60s %s line(s)\n" "$relpath" "$matches"
      found=$((found + matches))
    fi
  done <<< "$FILES"
  if [ "$found" -eq 0 ]; then
    echo "  ✓ clean"
  fi
  TOTAL_SUSPECTS=$((TOTAL_SUSPECTS + found))
}

TOTAL_SUSPECTS=0

# 1. Future-product SKU — 미발표·미양산 단정
run_category "future-sku" \
  "Future-product SKU 단정 가능" \
  "(B[1-9][0-9]{2}|MI[3-9][0-9]{2}X|MI[3-9][0-9]{2}|Hopper H[3-9][0-9]{2}|Blackwell|Thor|Sierra Forest|Granite Rapids|Sapphire Rapids|Turin|Genoa-X|Emerald Rapids|Diamond Rapids)" \
  "구체 SKU·코드네임 발견. '예정·발표·로드맵' qualifier 필요한지 검토"

# 2. Spec numbers — 표준 번호 단정
run_category "spec-num" \
  "Spec 번호 (JEDEC·DSP·IEEE·RFC·IEC) 단정" \
  "(JESD[0-9]{3}[A-Z]?|DSP[0-9]{4}|RFC [0-9]{4,}|IEEE 802\.[0-9]+[a-z]+|IEC 6[0-9]{4}|ISO/IEC [0-9]{4,}|PCI-SIG ECN)" \
  "공식 spec 자료 인용 권장. revision suffix(A·B·C) 정확성 점검"

# 3. Kernel/Driver API 가짜 가능
run_category "kernel-api" \
  "Kernel API·flag·struct 단정" \
  "(MHP_[A-Z_]{3,}|VFL_[A-Z_]+|VM_[A-Z_]{3,}|drgn\.helpers\.linux\.[a-z_]+|for_each_cxl_|for_each_logical_|MMAP_[A-Z_]+_NEW)" \
  "Linux kernel source·drgn helper 모듈에서 실제 존재 확인 필요"

# 4. 회사-구현 매핑
run_category "company-impl" \
  "회사 ↔ 내부 구현 매핑 단정" \
  "(현대중공업.*(기반|채택|적용)|두산.*(기반|채택|적용)|삼성.*(기반|채택|적용)|LG.*(기반|채택|적용)|HD현대.*(기반|채택|적용)|대우조선.*(기반|채택|적용)|네이버.*(기반|채택)|카카오.*(기반|채택))" \
  "특정 회사의 내부 구현은 비공개가 일반. 공개 자료 인용 또는 generic 표현으로"

# 5. Project codename — 흔히 잘못 매핑
run_category "codename" \
  "Project codename + 회사 매핑" \
  "(Google.*Carbon|Alibaba.*Pangu|Apple.*Rhapsody|Amazon.*Annapurna|Microsoft.*Maia|Meta.*MTIA|NVIDIA.*Project [A-Z])" \
  "codename은 이름 충돌이 흔함. 공식 발표 자료 재확인"

# 6. YAML/config schema 단정
run_category "yaml-schema" \
  "Library config schema 구체 단정" \
  "(vllm-config|tgi-config|tritonserver|ollama-config)" \
  "라이브러리 schema는 버전·fork별로 다름. '개념적·docs 참조' qualifier 권장"

# 7. Spec publish 연도 단정
run_category "spec-year" \
  "표준 publish 연도 단정 (특히 -2018·-2020·-2024)" \
  "(JESD[0-9]{3}[A-Z]? \([0-9]{4}\)|RFC [0-9]+ \([0-9]{4}\)|802\.[0-9]+[a-z]+-20[0-9]{2})" \
  "표준 publish 연도는 공식 자료 확인. revision 갱신 시 연도 변동"

echo ""
if [ "$TOTAL_SUSPECTS" -eq 0 ]; then
  echo "✓ All categories clean. No suspect claim patterns detected."
  exit 0
else
  echo "✗ Found $TOTAL_SUSPECTS suspect line(s) across categories above."
  echo ""
  echo "이 출력은 *후보 위치*입니다. 모든 line이 hallucination은 아닙니다."
  echo "각 위치를 *수동 검증*해 진짜 hallucination인지 확인하세요."
  echo ""
  echo "참고: CLAUDE.md §10 'Hallucination 방지' 체크리스트"
  exit 1
fi
