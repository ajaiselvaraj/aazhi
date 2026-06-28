# AAZHI Functional Stress-Test Evaluation Suite

This is the production-grade functional stress-testing suite for the AAZHI GovTech application. It uses **k6** to simulate extreme user load, integrated with **Prometheus** and **Grafana** for real-time monitoring and reporting.

## Directory Structure
- `k6/`: Contains the K6 JS load testing scripts and shared configurations.
  - `scenarios/`: Contains scripts for the 10 specific test scenarios (Login, Complaints, DB heavy, AI, etc.)
  - `main.js`: Orchestrator to run all scenarios concurrently.
- `dashboards/`: Pre-configured Grafana dashboard JSON models (`aazhi-stress.json`).
- `monitoring/`: Configuration files for Prometheus.
- `reports/`: Output directory for HTML and JSON test reports after test execution.
- `scripts/`: PowerShell scripts for automation and failure injection.

## Prerequisites
- **Docker** and **Docker Compose** installed (to run Grafana/Prometheus).
- **k6** installed locally. (Install instructions: https://k6.io/docs/get-started/installation/).
- The backend application running (default expects `http://localhost:5000/api`).

## Execution

### Automated One-Command Execution
You can run the entire suite automatically from the root folder:
```powershell
npm run stress:test
```
This will:
1. Start the monitoring stack in Docker.
2. Run the `k6/main.js` script with the k6 web dashboard enabled.
3. Save the results to `reports/summary.json` and `reports/html-report.html`.

### Manual Execution
To run a specific scenario manually:
```powershell
k6 run .\k6\scenarios\01-login.js
```

## Failure Injection
A key part of the stress test is verifying the system recovers gracefully from failures.
Run the failure injection script while a test is actively running:
```powershell
powershell .\scripts\failure-injection.ps1
```
You will be prompted to select a scenario (e.g., pausing PostgreSQL, stopping Redis, or restarting the backend).

## Monitoring & Reporting
- **Grafana**: Available at `http://localhost:3000` (User: admin / Password: admin). Import the dashboard from `dashboards/aazhi-stress.json` if not loaded automatically.
- **k6 Web Dashboard**: K6 natively serves a beautiful dashboard when `K6_WEB_DASHBOARD=true` is used (handled automatically by `run-tests.ps1`).
- **Reports**: Check the `reports/` folder for HTML and JSON test summaries.

## Test Cases Covered
1. User Login Stress
2. Complaint Submission Stress
3. Complaint Tracking Stress
4. Dashboard Stress
5. AI Chat Stress
6. Image Upload Stress
7. Admin Operations Stress
8. Notification Stress
9. Database Write/Read Stress
10. Long Duration Stability Test
