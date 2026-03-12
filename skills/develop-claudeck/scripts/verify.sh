#!/usr/bin/env bash
# ClauDeck verification script — run all quality gates
# Usage: scripts/verify.sh [--quick]
#   --quick: skip web build (faster for daemon-only changes)

set -euo pipefail

cd "$(dirname "$0")/.."

QUICK=false
if [[ "${1:-}" == "--quick" ]]; then
  QUICK=true
fi

echo "=== ClauDeck Verification ==="
echo ""

# 1. Run all tests
echo "--- Running tests ---"
bun test
echo ""

# 2. Build web (unless --quick)
if [[ "$QUICK" == false ]]; then
  echo "--- Building web ---"
  bun run build:web
  echo ""

  # 3. TypeScript check for web
  echo "--- Type checking web ---"
  cd packages/web
  bunx tsc --noEmit
  cd ../..
  echo ""
fi

echo "=== All checks passed ==="
