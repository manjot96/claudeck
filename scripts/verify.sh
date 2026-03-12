#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "=== ClauDeck Verification ==="

# Parse args
QUICK=false
for arg in "$@"; do
  case "$arg" in
    --quick) QUICK=true ;;
  esac
done

echo ""
echo "--- Running tests ---"
bun test

if [ "$QUICK" = true ]; then
  echo ""
  echo "--- Quick mode: skipping web build and typecheck ---"
  echo ""
  echo "=== All checks passed (quick) ==="
  exit 0
fi

if [ -d "packages/web" ]; then
  echo ""
  echo "--- Building web ---"
  bun run build:web

  echo ""
  echo "--- TypeScript check (web) ---"
  cd packages/web && bunx tsc --noEmit && cd ../..
fi

echo ""
echo "=== All checks passed ==="
