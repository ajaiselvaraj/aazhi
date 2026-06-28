$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$BaseDir = Split-Path -Parent $ScriptDir

Write-Host "Starting AAZHI Functional Stress-Test Suite" -ForegroundColor Cyan

# 1. Start Monitoring Stack
Write-Host "Starting Prometheus and Grafana..." -ForegroundColor Yellow
cd $BaseDir
docker compose up -d

# Wait for services to initialize
Start-Sleep -Seconds 5

# 2. Run k6 Tests
Write-Host "Running k6 Scenarios..." -ForegroundColor Yellow
$Env:K6_WEB_DASHBOARD = "true"
$Env:K6_WEB_DASHBOARD_EXPORT = "$BaseDir\reports\html-report.html"

# Run the main orchestrator script
k6 run --out json=$BaseDir\reports\summary.json $BaseDir\k6\main.js

Write-Host "Stress testing completed." -ForegroundColor Green
Write-Host "HTML Report generated at: $BaseDir\reports\html-report.html" -ForegroundColor Cyan
Write-Host "JSON Report generated at: $BaseDir\reports\summary.json" -ForegroundColor Cyan
Write-Host "You can view Grafana at http://localhost:3000 (admin/admin)" -ForegroundColor Cyan
