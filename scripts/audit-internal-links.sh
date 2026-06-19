#!/usr/bin/env bash
# audit-internal-links.sh — 시리즈 안 /blog/... 내부 링크가 실제 파일을 가리키는지 검증
#
# 동작:
#   1. src/content/blog/ 아래 모든 .md에서 (/blog/... 또는 ](/blog/...) 추출
#   2. anchor #는 제거, path만 확인
#   3. src/content/blog/<path>.md 또는 src/content/blog/<path>/index.md 존재 확인
#   4. broken 링크 리포트
#
# Exit code:
#   0 = 모든 내부 링크 valid
#   1 = broken 링크 발견

set -eo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONTENT_DIR="$ROOT/src/content/blog"

if [ ! -d "$CONTENT_DIR" ]; then
  echo "ERROR: $CONTENT_DIR 없음" >&2
  exit 1
fi

# 인자 처리: 대상 경로 (없으면 전체)
TARGET="${1:-$CONTENT_DIR}"

# 모든 /blog/... 링크를 (source_file:line:link) 형식으로 수집
# Markdown link: [text](/blog/...)  또는 raw /blog/...
# Anchor #...는 제거
broken_count=0
total_count=0
tmp_broken="$(mktemp)"
trap 'rm -f "$tmp_broken"' EXIT

while IFS=: read -r source_file line link; do
  total_count=$((total_count + 1))
  # anchor 제거
  path="${link%%#*}"
  # /blog/foo/bar → src/content/blog/foo/bar
  rel="${path#/blog/}"
  # trailing slash 제거
  rel="${rel%/}"

  # 후보: .md 직접 또는 디렉터리 안 index.md
  candidate1="$CONTENT_DIR/$rel.md"
  candidate2="$CONTENT_DIR/$rel/index.md"

  if [ -f "$candidate1" ] || [ -f "$candidate2" ]; then
    continue
  fi

  echo "  $source_file:$line  →  $link" >> "$tmp_broken"
  broken_count=$((broken_count + 1))
done < <(
  grep -rEn -o '\(/blog/[^)#[:space:]]+[#)]?[^)]*\)|/blog/[a-zA-Z0-9_/-]+' "$TARGET" --include="*.md" 2>/dev/null \
    | grep -E '/blog/' \
    | sed -E 's|^([^:]+):([0-9]+):.*\((/blog/[^)]+)\).*|\1:\2:\3|; s|^([^:]+):([0-9]+):.*(/blog/[a-zA-Z0-9_/-]+).*|\1:\2:\3|' \
    | grep -E "^[^:]+:[0-9]+:/blog/" \
    | sort -u
)

echo "=== Internal Link Audit ==="
echo "  Total /blog/ links checked: $total_count"
echo "  Broken: $broken_count"

if [ "$broken_count" -gt 0 ]; then
  echo ""
  echo "=== Broken links ==="
  cat "$tmp_broken"
  exit 1
fi

echo "✓ 모든 내부 링크 valid"
exit 0
