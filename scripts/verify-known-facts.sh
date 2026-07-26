#!/usr/bin/env bash
# verify-known-facts.sh — whitelist-based fact verification
#
# data/known-facts.yaml에 등재된 fact만 안전 등장 가능.
# 등재 안 한 spec/product/standard 이름은 *수동 review 필요* 후보.
#
# Usage:
#   ./scripts/verify-known-facts.sh                    # 전체 published
#   ./scripts/verify-known-facts.sh <path>             # 특정 파일·디렉토리
#   ./scripts/verify-known-facts.sh --category jedec   # 카테고리만
#
# 카테고리: jedec, cxl, dmtf, ieee_tsn, nvidia_gpu, amd_gpu, jetson
#
# Exit: 0 = 모두 known, 1 = unknown 발견 (review)

set -eo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KNOWN_FACTS="$ROOT/data/known-facts.yaml"
TARGETS=()
CATEGORY=""

if [ ! -f "$KNOWN_FACTS" ]; then
  echo "✗ $KNOWN_FACTS 파일 없음."
  exit 2
fi

while [ $# -gt 0 ]; do
  case "$1" in
    --category) CATEGORY="$2"; shift 2 ;;
    --help|-h) sed -n '2,18p' "$0"; exit 0 ;;
    *) TARGETS+=("$1"); shift ;;
  esac
done

[ ${#TARGETS[@]} -eq 0 ] && TARGETS=("$ROOT/src/content/blog")

extract_category() {
  awk -v cat="$1" '
    $0 ~ "^"cat":" { in_cat = 1; next }
    in_cat && /^[a-z_]+:/ { in_cat = 0 }
    in_cat && /^  - / {
      sub(/^  - /, "")
      sub(/[ ]*#.*$/, "")
      gsub(/[ \t]+$/, "")
      if (length($0) > 0) print
    }
  ' "$KNOWN_FACTS"
}

# Build whitelist once
WHITELIST=$(mktemp)
for sub in jedec_standards pcie_standards dmtf_standards ieee_802_1_tsn \
           nvidia_gpu_verified nvidia_gpu_roadmap \
           amd_gpu_verified amd_gpu_roadmap \
           nvidia_jetson_verified nvidia_jetson_roadmap \
           industrial_ethernet google_tpu_verified intel_ai_verified \
           korean_npu_verified cxl_memory_verified; do
  extract_category "$sub" >> "$WHITELIST"
done

UNKNOWN_COUNT=0
COUNTFILE=$(mktemp)
echo 0 > "$COUNTFILE"
echo "═══ Known-fact verification ═══"

while IFS= read -r f; do
  if grep -q "^draft: true" "$f"; then continue; fi

  for cat in jedec cxl dmtf ieee_tsn nvidia_gpu amd_gpu jetson; do
    [ -n "$CATEGORY" ] && [ "$CATEGORY" != "$cat" ] && continue
    case "$cat" in
      jedec)      pattern="JESD[0-9]{3}[A-Z]?" ;;
      cxl)        pattern="CXL [0-9]\.[0-9]" ;;
      dmtf)       pattern="DSP[0-9]{4}" ;;
      ieee_tsn)   pattern="IEEE 802\.[0-9]+[A-Za-z]+(-[0-9]{4})?" ;;
      # bare 모델 토큰만 추출(용량·SXM suffix 제외) → 화이트리스트의 bare 토큰과 매칭.
      # GH[0-9]{3}를 H[12]보다 먼저 둬 "GH200"이 "H200"으로 오절단되지 않게.
      # \b(단어경계) — "BMI270"의 MI270 같은 부분 매칭 방지.
      nvidia_gpu) pattern="\b(GH[0-9]{3}|H[12][0-9]{2}|B[1-3][0-9]{2}|GB[0-9]{3})\b" ;;
      amd_gpu)    pattern="\bMI[0-9]{3}[XA]?\b" ;;
      # 2번째 토큰은 *알려진 family 단어*까지만 확장 → "Jetson Orin DLA/GPU" 과포획·후행공백 방지.
      jetson)     pattern="Jetson (Nano|Xavier|Orin|Thor|AGX)( (Nano|NX|Xavier|Thor|AGX|Orin))?" ;;
    esac

    while IFS=: read -r linenum match; do
      [ -z "$match" ] && continue
      if ! grep -qFx "$match" "$WHITELIST" 2>/dev/null; then
        relpath="${f#$ROOT/}"
        printf "  [%s] %-55s line %s: %s\n" "$cat" "$relpath" "$linenum" "$match"
        cur=$(cat "$COUNTFILE")
        echo $((cur + 1)) > "$COUNTFILE"
      fi
    done < <(grep -nEo "$pattern" "$f" 2>/dev/null || true)
  done
done < <(find "${TARGETS[@]}" -name "*.md" -type f)

UNKNOWN_COUNT=$(cat "$COUNTFILE")
rm -f "$COUNTFILE"

rm -f "$WHITELIST"

echo ""
if [ "$UNKNOWN_COUNT" -eq 0 ]; then
  echo "✓ 모든 fact가 whitelist에 등재됨."
  exit 0
else
  echo "✗ $UNKNOWN_COUNT 개 unknown fact 발견."
  echo ""
  echo "각 위치를 수동 review:"
  echo "  - 진짜 fact라면 data/known-facts.yaml에 출처와 함께 등재"
  echo "  - hallucination이면 수정·qualifier 추가"
  echo "  - false positive면 패턴·whitelist 정교화"
  exit 1
fi
