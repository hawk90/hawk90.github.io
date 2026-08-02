#!/usr/bin/env bash
# Backward-compatible single-file entrypoint for build-diagrams.sh.
# Keeping compilation in one implementation prevents engine/cleanup drift.
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "usage: $0 <file.tex>" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec "$ROOT/scripts/build-diagrams.sh" --force "$1"
