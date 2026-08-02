#!/usr/bin/env bash
# Compatibility entrypoint for the single-process detector.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec python3 "$ROOT/scripts/detect-prose-in-code.py" "$@"
