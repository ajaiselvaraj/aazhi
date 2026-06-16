import fetch from 'node-fetch';

const BASE = 'http://localhost:5000/api';

async function test() {
  console.log('=== V3 ENTERPRISE WHISTLEBLOWER PLATFORM VERIFICATION ===\n');

  // 1. CAPTCHA
  const captchaRes = await fetch(`${BASE}/integrity/captcha`);
  const captcha = await captchaRes.json();
  const [num1, num2] = captcha.data.question.match(/\d+/g).map(Number);
  console.log('1. CAPTCHA:', captchaRes.status, captcha.data.question);

  // 2. Submit report WITH retaliation risk
  const submitRes = await fetch(`${BASE}/integrity/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category: 'Corruption / Bribe Demand',
      description: 'Officer demands 5000 INR bribe to restore electricity connection.',
      location: 'Electricity Department, Zone 3',
      incidentDate: '2026-06-15',
      captchaId: captcha.data.captchaId,
      captchaAnswer: String(num1 + num2),
      retaliationRisk: true
    })
  });
  const submit = await submitRes.json();
  console.log('2. SUBMIT REPORT (retaliationRisk=true):', submitRes.status, submit.success ? 'OK' : 'FAIL');
  const caseCode = submit.data?.caseCode;
  if (!caseCode) { console.log('   ERROR: No case code returned.', submit.message); return; }
  console.log('   CASE CODE:', caseCode);

  // 3. Track report
  const trackRes = await fetch(`${BASE}/integrity/track/${caseCode}`);
  const track = await trackRes.json();
  console.log('3. TRACK REPORT:', trackRes.status, JSON.stringify(track.data));

  // 4. Officer Login
  const loginRes = await fetch(`${BASE}/auth/admin-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminId: 'integrity_admin', password: 'integrity_pass', department: 'Integrity Office' })
  });
  const login = await loginRes.json();
  const token = login.data?.tokens?.accessToken;
  console.log('4. OFFICER LOGIN:', loginRes.status, token ? 'TOKEN OK' : 'FAIL: ' + JSON.stringify(login).substring(0, 120));
  if (!token) { console.log('   Aborting — no token.'); return; }
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // 5. Get reports queue - verify risk score and witness protection redaction
  const reportsRes = await fetch(`${BASE}/integrity/reports`, { headers: auth });
  const reports = await reportsRes.json();
  const latestReport = reports.data?.find(r => r.anonymous_case_code === caseCode);
  console.log('5. GET REPORTS:', reportsRes.status, 'Count:', reports.data?.length);
  if (latestReport) {
    console.log('   RISK SCORE:', latestReport.risk_score, '| RISK LEVEL:', latestReport.risk_level);
    console.log('   RETALIATION RISK:', latestReport.retaliation_risk);
    console.log('   LOCATION (should be RESTRICTED):', latestReport.location);
  } else {
    console.log('   WARNING: Could not find our report in queue');
  }
  const reportId = latestReport?.id;

  // 6. Officers list
  const officersRes = await fetch(`${BASE}/integrity/officers`, { headers: auth });
  const officers = await officersRes.json();
  console.log('6. OFFICERS LIST:', officersRes.status, 'Count:', officers.data?.length);

  // 7. Get Security Incidents
  const incRes = await fetch(`${BASE}/integrity/incidents`, { headers: auth });
  const inc = await incRes.json();
  console.log('7. SECURITY INCIDENTS:', incRes.status, 'Count:', inc.data?.length);

  // 8. Disaster Recovery status
  const drRes = await fetch(`${BASE}/integrity/disaster-recovery/status`, { headers: auth });
  const dr = await drRes.json();
  console.log('8. DR STATUS:', drRes.status, JSON.stringify(dr.data)?.substring(0, 150));

  if (!reportId) { console.log('No report ID - skipping case-specific tests'); return; }

  // 9. Four-Eyes: Try to close case WITHOUT approval (should fail)
  const closeRes = await fetch(`${BASE}/integrity/reports/${reportId}/status`, {
    method: 'PUT', headers: auth,
    body: JSON.stringify({ status: 'Closed' })
  });
  const closeData = await closeRes.json();
  console.log('9. CLOSE WITHOUT APPROVAL:', closeRes.status, closeData.message?.substring(0, 80));

  // 10. Create approval request
  const createApprovalRes = await fetch(`${BASE}/integrity/reports/${reportId}/approvals`, {
    method: 'POST', headers: auth,
    body: JSON.stringify({ action_type: 'Close Case' })
  });
  const createApproval = await createApprovalRes.json();
  console.log('10. CREATE APPROVAL REQUEST:', createApprovalRes.status, createApproval.success ? 'SUCCESS' : createApproval.message);

  // 11. Governance report (CSV)
  const govRes = await fetch(`${BASE}/integrity/governance/report?format=csv`, { headers: auth });
  const govContent = await govRes.text();
  console.log('11. GOVERNANCE CSV:', govRes.status, 'Lines:', govContent.split('\n').length, 'Header:', govContent.split('\n')[0]?.substring(0, 40));

  // 12. Evidence chain (should have Upload entry)
  const chainRes = await fetch(`${BASE}/integrity/reports/${reportId}/evidence-chain`, { headers: auth });
  const chain = await chainRes.json();
  console.log('12. EVIDENCE CHAIN:', chainRes.status, 'Entries:', chain.data?.length);

  // 13. Escalations
  const escRes = await fetch(`${BASE}/integrity/reports/${reportId}/escalate`, { headers: auth });
  const esc = await escRes.json();
  console.log('13. ESCALATIONS:', escRes.status, 'Count:', esc.data?.length);

  // 14. Brute force tracking test (5 invalid codes)
  console.log('\n--- BRUTE FORCE TEST ---');
  let lastBruteCode = 404;
  for (let i = 1; i <= 5; i++) {
    const bfRes = await fetch(`${BASE}/integrity/track/INVALID-CODE-${i}XXX`);
    lastBruteCode = bfRes.status;
    const bfData = await bfRes.json();
    console.log(`    Attempt ${i}: ${bfRes.status} - ${bfData.message?.substring(0, 60)}`);
  }

  console.log('\n=== ALL V3 TESTS COMPLETE ===');
}

test().catch(err => {
  console.error('FATAL TEST ERROR:', err.message);
  process.exit(1);
});
