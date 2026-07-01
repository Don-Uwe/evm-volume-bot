$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host "==> Python: ruff"
python -m ruff check src tests

Write-Host "==> Python: pytest"
python -m pytest tests/ -q

Write-Host "==> Studio: lint, typecheck, test, build"
Push-Location src/web/studio
npm run lint
npm run typecheck
npm run test
npm run build
Pop-Location

Write-Host "All checks passed."
