$ErrorActionPreference = "Stop"

Write-Host "--- AAZHI Failure Injection Tool ---" -ForegroundColor Cyan
Write-Host "This script simulates infrastructure failures during a load test."

function Simulate-Database-Failure {
    Write-Host "[*] Pausing PostgreSQL Container..." -ForegroundColor Yellow
    docker pause aazhi-postgres-1 # Replace with actual container name if different
    Start-Sleep -Seconds 30
    Write-Host "[*] Resuming PostgreSQL Container..." -ForegroundColor Green
    docker unpause aazhi-postgres-1
}

function Simulate-Redis-Failure {
    Write-Host "[*] Stopping Redis Container..." -ForegroundColor Yellow
    docker stop aazhi-redis-1
    Start-Sleep -Seconds 15
    Write-Host "[*] Starting Redis Container..." -ForegroundColor Green
    docker start aazhi-redis-1
}

function Simulate-Backend-Restart {
    Write-Host "[*] Restarting Backend Node.js Service..." -ForegroundColor Yellow
    docker restart aazhi-backend-1
}

Write-Host "Select Failure Scenario:"
Write-Host "1. Database Pause (30s)"
Write-Host "2. Redis Stop & Start (15s)"
Write-Host "3. Backend Restart"
Write-Host "4. Exit"

$choice = Read-Host "Enter choice (1-4)"

switch ($choice) {
    "1" { Simulate-Database-Failure }
    "2" { Simulate-Redis-Failure }
    "3" { Simulate-Backend-Restart }
    "4" { exit }
    default { Write-Host "Invalid choice." }
}

Write-Host "Failure scenario completed." -ForegroundColor Cyan
