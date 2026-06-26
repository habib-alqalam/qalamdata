# Starts the QalamData Sovereign AI server (proxies to on-prem Ollama).
# Usage:  ./run.ps1   (optionally set $env:QALAM_MODEL first)
if (-not $env:QALAM_MODEL) { $env:QALAM_MODEL = "qwen2.5:14b" }
$py = Get-Command python -ErrorAction SilentlyContinue
if (-not $py) { $py = Get-Command py -ErrorAction SilentlyContinue }
if (-not $py) { Write-Error "Python not found on PATH"; exit 1 }
Write-Host "Starting Sovereign AI on http://127.0.0.1:8077  (model: $env:QALAM_MODEL)" -ForegroundColor Cyan
& $py.Source "$PSScriptRoot\server.py"
