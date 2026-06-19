#!/usr/bin/env bash
# audit-fact-density.sh — universal fact-density analyzer
#
# *모든* published 챕터에서 *구체적 주장* (수치·버전·날짜·SKU·표준 번호·제품명)
# 의 density를 측정해 *fact-heavy 챕터*를 자동 식별합니다.
#
# 카테고리 무관하게 "주장 많음 = review 권장" 신호. 새 글이 *기억 위주로 작성*되면
# 자연스럽게 fact-density가 높아지므로 검증 우선순위를 자동 부여합니다.
#
# Universal patterns 탐지:
#   - 구체 수치 with unit:    "100 GB", "3.35 TB/s", "1024-bit"
#   - Version 단정:           "kernel 6.0+", "QEMU 8.0+", "v1.2.3"
#   - 연도 단정:              "2024년", "2025+", "Q4 2024"
#   - 약어/표준 번호:         "JESD238", "DSP0274", "IEEE 802.1AS"
#   - 제품 SKU:               "H100", "MI300X", "Cortex-M55"
#   - 회사+제품:              "NVIDIA Blackwell", "Samsung CMM-D"
#
# Usage:
#   ./scripts/audit-fact-density.sh                       # 전체
#   ./scripts/audit-fact-density.sh --threshold 50        # 50건 이상만
#   ./scripts/audit-fact-density.sh --top 10              # 상위 10개
#   ./scripts/audit-fact-density.sh <path>                # 특정 디렉토리·파일

set -eo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
THRESHOLD=30
TOP=0
TARGETS=()

while [ $# -gt 0 ]; do
  case "$1" in
    --threshold) THRESHOLD="$2"; shift 2 ;;
    --top) TOP="$2"; shift 2 ;;
    --help|-h) sed -n '2,25p' "$0"; exit 0 ;;
    *) TARGETS+=("$1"); shift ;;
  esac
done

[ ${#TARGETS[@]} -eq 0 ] && TARGETS=("$ROOT/src/content/blog")

# Universal "specific claim" patterns
# 단위 있는 수치 (GB/TB/Gbps/MHz/ns/μs/W/V 등)
PAT_NUMERIC='[0-9]+(\.[0-9]+)? *(GB/s|MB/s|TB/s|GB|MB|KB|Gbps|Mbps|MHz|GHz|kHz|ns|μs|µs|ms|μm|nm|W|V|TOPS|FLOPS|FPS|cycle|hop|bit|byte|핀|core|lane|stack)'

# Version 단정 (v1.2, kernel 6.0, etc.)
PAT_VERSION='(v[0-9]+\.[0-9]+|version [0-9]+\.[0-9]+|kernel [0-9]\.[0-9]+|API [0-9]+|spec [0-9]+\.[0-9]+|버전 [0-9]+\.[0-9]+)'

# 연도 단정
PAT_YEAR='(20[1-9][0-9]년|20[1-9][0-9]\+|Q[1-4] 20[1-9][0-9])'

# 표준 번호
PAT_STANDARD='(JESD[0-9]+|DSP[0-9]+|RFC [0-9]+|IEC [0-9]+|ISO [0-9]+|ANSI [0-9]+|IEEE [0-9]+|802\.[0-9]+[a-z]*|GP-[0-9]+)'

# 일반 제품/SKU 패턴
PAT_SKU='([A-Z][a-z]+ [A-Z][0-9]{3,}[A-Z]?|Cortex-[AMR][0-9]+|[A-Z][0-9]+[A-Z]+ ?[0-9]*GB|Snapdragon [0-9]+|Apple A[0-9]+ ?[a-zA-Z]*|i\.MX [0-9]+|STM32[A-Z][0-9]+|RK[0-9]+|MT[0-9]+|RTX [0-9]+|HBM[0-9][A-Z]?)'

# 회사+제품 (구체 매핑)
PAT_COMPANY_PROD='(NVIDIA|AMD|Intel|ARM|Samsung|SK Hynix|Micron|Apple|Google|Qualcomm|MediaTek|Rockchip) [A-Z][A-Za-z0-9 -]+'

# 측정·실측 수치 강한 단정
PAT_MEASUREMENT='(약 |대략 )?[0-9]+(\.[0-9]+)? *(%|배|이상|이하|만큼|×)'

# Output file for sorting
TMP=$(mktemp)

while IFS= read -r f; do
  if grep -q "^draft: true" "$f"; then continue; fi

  count_pattern() {
    local n
    n=$(grep -cE "$1" "$f" 2>/dev/null) || n=0
    echo "${n:-0}"
  }
  numeric=$(count_pattern "$PAT_NUMERIC")
  version=$(count_pattern "$PAT_VERSION")
  year=$(count_pattern "$PAT_YEAR")
  standard=$(count_pattern "$PAT_STANDARD")
  sku=$(count_pattern "$PAT_SKU")
  company=$(count_pattern "$PAT_COMPANY_PROD")
  measure=$(count_pattern "$PAT_MEASUREMENT")

  total=$((numeric + version + year + standard + sku + company + measure))

  if [ "$total" -ge "$THRESHOLD" ]; then
    relpath="${f#$ROOT/}"
    printf "%5d %s\n" "$total" "$relpath" >> "$TMP"
  fi
done < <(find "${TARGETS[@]}" -name "*.md" -type f)

if [ ! -s "$TMP" ]; then
  echo "✓ Fact-density threshold ($THRESHOLD) 초과 챕터 없음."
  rm -f "$TMP"
  exit 0
fi

echo "═══ Fact-Density 분석 — threshold $THRESHOLD ═══"
echo "  density는 *fact 주장의 양*. 많을수록 review 우선순위 높음."
echo ""

# Sort descending by density
if [ "$TOP" -gt 0 ]; then
  sort -rn "$TMP" | head -n "$TOP"
else
  sort -rn "$TMP"
fi

TOTAL_FILES=$(wc -l < "$TMP" | tr -d ' ')
rm -f "$TMP"

echo ""
echo "총 $TOTAL_FILES 챕터가 threshold $THRESHOLD 이상."
echo ""
echo "권장 검증:"
echo "  1. 상위 챕터부터 수동 review (./scripts/audit-suspect-claims.sh <path>)"
echo "  2. fact를 *공식 출처*와 비교 (datasheet·spec PDF)"
echo "  3. 확인 못 한 fact는 *qualifier* 추가 ('알려져 있음'·'발표·예정')"
echo "  4. 검증 완료 후 frontmatter에 'last-verified: <date>' 추가 권장"

# Always exit 0 — informational, not blocking
exit 0
