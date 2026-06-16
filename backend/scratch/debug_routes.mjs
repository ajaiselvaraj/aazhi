import fetch from 'node-fetch';

const BASE = 'http://localhost:5000/api';

const loginRes = await fetch(`${BASE}/auth/admin-login`, {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({adminId: 'integrity_admin', password: 'integrity_pass', department: 'Integrity Office'})
});
const login = await loginRes.json();
const token = login.data?.tokens?.accessToken;
const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

console.log('TOKEN:', token ? 'OK' : 'FAIL');

// Check all routes
const routes = [
  ['GET', '/integrity/reports'],
  ['GET', '/integrity/metrics'],
  ['GET', '/integrity/officers'],
  ['GET', '/integrity/incidents'],
  ['GET', '/integrity/disaster-recovery/status'],
  ['GET', '/integrity/governance/report?format=csv'],
];

for (const [method, path] of routes) {
  const res = await fetch(BASE + path, { method, headers: auth });
  const data = await res.json().catch(() => ({ status: 'non-json' }));
  console.log(`${method} ${path}: ${res.status}`, data.success !== undefined ? (data.success ? 'OK' : data.message?.substring(0,60)) : '(no success field)');
}

// Fetch latest report to check columns
const reportsRes = await fetch(`${BASE}/integrity/reports`, { headers: auth });
const reports = await reportsRes.json();
if (reports.data?.length > 0) {
  const last = reports.data[0];
  console.log('\nLATEST REPORT COLUMNS:');
  console.log('  risk_score:', last.risk_score);
  console.log('  risk_level:', last.risk_level);
  console.log('  retaliation_risk:', last.retaliation_risk);
  console.log('  escalation_level:', last.escalation_level);
  console.log('  location:', last.location?.substring(0, 50));
  
  const reportId = last.id;
  
  // Check report-specific routes
  const reportRoutes = [
    ['GET', `/integrity/reports/${reportId}/assignments`],
    ['GET', `/integrity/reports/${reportId}/evidence-chain`],
    ['GET', `/integrity/reports/${reportId}/approvals`],
    ['GET', `/integrity/reports/${reportId}/escalate`],
  ];
  
  for (const [method, path] of reportRoutes) {
    const res = await fetch(BASE + path, { method, headers: auth });
    const data = await res.json().catch(() => ({ status: 'non-json' }));
    console.log(`${method} ${path}: ${res.status}`, data.success !== undefined ? (data.success ? 'OK, count=' + data.data?.length : data.message?.substring(0,60)) : '');
  }
  
  // Test Four-Eyes enforcement
  const closeAttempt = await fetch(`${BASE}/integrity/reports/${reportId}/status`, {
    method: 'PUT', headers: auth,
    body: JSON.stringify({ status: 'Closed' })
  });
  const closeData = await closeAttempt.json();
  console.log(`\nFOUR-EYES CLOSE TEST: ${closeAttempt.status} - ${closeData.message?.substring(0,100)}`);
}
