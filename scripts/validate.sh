#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> Python: ruff"
python -m ruff check src tests

echo "==> Python: pytest"
python -m pytest tests/ -q

echo "==> Studio: lint, typecheck, test, build"
(
  cd src/web/studio
  npm run lint
  npm run typecheck
  npm run test
  npm run build
)

echo "All checks passed."
