import axios from "axios";
import { pool } from "./config/db.js";
import 'dotenv/config';

const API_BASE = "http://localhost:5000/api";

async function runTests() {
  console.log("🚀 Starting V4 National-Scale Whistleblower Intelligence Platform Endpoint Tests...");

  try {
    // 1. Fetch the ID of the case we submitted (CIV-6W4E-YF6A-QS7K)
    console.log("\n🔍 Querying database for case CIV-6W4E-YF6A-QS7K...");
    const caseRes = await pool.query(
      "SELECT id, category, protection_level, risk_level, triage_results FROM anonymous_integrity_reports WHERE anonymous_case_code = $1",
      ["CIV-6W4E-YF6A-QS7K"]
    );
    
    if (caseRes.rows.length === 0) {
      console.error("❌ Case CIV-6W4E-YF6A-QS7K not found in the database. Please submit it first.");
      process.exit(1);
    }
    const reportId = caseRes.rows[0].id;
    console.log(`✅ Found report ID: ${reportId}`);
    console.log(`   Category: ${caseRes.rows[0].category}`);
    console.log(`   Risk Level: ${caseRes.rows[0].risk_level}`);
    console.log(`   Protection Level: ${caseRes.rows[0].protection_level}`);
    console.log(`   Triage Results:`, JSON.stringify(caseRes.rows[0].triage_results, null, 2));

    // 2. Admin Login - Integrity Officer
    console.log("\n🔒 Logging in as Integrity Officer (integrity_admin)...");
    const officerLoginRes = await axios.post(`${API_BASE}/auth/admin-login`, {
      adminId: "integrity_admin",
      password: "integrity_pass",
      department: "Integrity Office"
    });
    
    const officerToken = officerLoginRes.data.data.tokens.accessToken;
    const officerHeaders = { Authorization: `Bearer ${officerToken}` };
    console.log("✅ Integrity Officer logged in successfully.");

    // 3. Test: getActiveOfficers (/api/integrity/officers)
    console.log("\n🔍 Fetching active municipal officers queue...");
    const officersRes = await axios.get(`${API_BASE}/integrity/officers`, { headers: officerHeaders });
    console.log("✅ Active officers retrieved. Count:", officersRes.data.data.length);
    console.log("   Officers:", officersRes.data.data.map(o => `${o.username} (${o.department})`).join(", "));

    // 4. Test: getWatchlist (/api/integrity/watchlist)
    console.log("\n🔍 Querying repeat offender watchlist registry...");
    const watchlistRes = await axios.get(`${API_BASE}/integrity/watchlist`, { headers: officerHeaders });
    console.log("✅ Watchlist entries retrieved. Count:", watchlistRes.data.data.length);
    console.log("   Watchlist registry:", JSON.stringify(watchlistRes.data.data, null, 2));

    // 5. Test: getAITriageResults (/api/integrity/reports/:id/triage)
    console.log(`\n🤖 Querying AI Triage analysis for case ${reportId}...`);
    const triageRes = await axios.get(`${API_BASE}/integrity/reports/${reportId}/triage`, { headers: officerHeaders });
    console.log("✅ AI Triage results retrieved successfully:");
    console.log("   Recommended Priority:", triageRes.data.data.recommendedPriority);
    console.log("   AI Summary:", triageRes.data.data.aiSummary);
    console.log("   Fraud Indicators:", triageRes.data.data.fraudIndicators);
    console.log("   Protection Score/Level:", triageRes.data.data.protectionScore, "/", triageRes.data.data.protectionLevel);

    // 6. Test: getEvidenceIntelligence (/api/integrity/reports/:id/evidence-intelligence)
    console.log(`\n🔍 Fetching advanced evidence analytics for case ${reportId}...`);
    const evidenceIntelRes = await axios.get(`${API_BASE}/integrity/reports/${reportId}/evidence-intelligence`, { headers: officerHeaders });
    console.log("✅ Evidence intelligence retrieved:", JSON.stringify(evidenceIntelRes.data.data, null, 2));

    // 7. Admin Login - Executive Oversight
    console.log("\n🔒 Logging in as Executive Oversight (executive_admin)...");
    const execLoginRes = await axios.post(`${API_BASE}/auth/admin-login`, {
      adminId: "executive_admin",
      password: "executive_pass",
      department: "Executive Oversight Board"
    });
    
    const execToken = execLoginRes.data.data.tokens.accessToken;
    const execHeaders = { Authorization: `Bearer ${execToken}` };
    console.log("✅ Executive Oversight logged in successfully.");

    // 8. Test: getExecutiveAnalytics (/api/integrity/analytics/executive)
    console.log("\n📈 Compiling Executive Analytics (heatmap, SLAs, forecasts, early warnings)...");
    const analyticsRes = await axios.get(`${API_BASE}/integrity/analytics/executive`, { headers: execHeaders });
    console.log("✅ Executive analytics compiled successfully:");
    console.log("   SLA Performance:", JSON.stringify(analyticsRes.data.data.slaPerformance, null, 2));
    console.log("   Early Warning Alerts:", JSON.stringify(analyticsRes.data.data.earlyWarningAlerts, null, 2));
    console.log("   Forecasting:", JSON.stringify(analyticsRes.data.data.forecast, null, 2));
    console.log("   Heatmap Region Counts:", analyticsRes.data.data.heatmapData.map(h => `${h.district}: ${h.intensity}`).join(", "));

    // 9. Test: getCompliancePackage (/api/integrity/compliance/export)
    console.log("\n📥 Exporting Compliance & Audit packages (CSV & PDF)...");
    const complianceCsvRes = await axios.get(`${API_BASE}/integrity/compliance/export?format=csv`, { headers: execHeaders });
    console.log("✅ Compliance CSV package fetched successfully. Byte size:", complianceCsvRes.data.length);
    console.log("   CSV preview of first lines:\n", complianceCsvRes.data.split("\n").slice(0, 5).join("\n"));

    const compliancePdfRes = await axios.get(`${API_BASE}/integrity/compliance/export?format=pdf`, { headers: execHeaders, responseType: 'arraybuffer' });
    console.log("✅ Compliance PDF certification package fetched successfully. Byte size:", compliancePdfRes.data.byteLength);

    // 10. Test: getPublicTransparencyMetrics (/api/integrity/public/transparency)
    console.log("\n🌐 Accessing Public Transparency Portal metrics...");
    const transparencyRes = await axios.get(`${API_BASE}/integrity/public/transparency`);
    console.log("✅ Public transparency data verified:", JSON.stringify(transparencyRes.data.data, null, 2));

    // 11. Test Restriction Verification: Executive Oversight role blocked from report detail content
    console.log("\n🔒 Verifying Executive Oversight permission restrictions (Read-only analytics only)...");
    try {
      await axios.get(`${API_BASE}/integrity/reports`, { headers: execHeaders });
      console.error("❌ FAILURE: Executive Oversight role was NOT blocked from reports detail content!");
      process.exit(1);
    } catch (err) {
      if (err.response && err.response.status === 403) {
        console.log("✅ SUCCESS: Executive Oversight role successfully blocked from report content (returned 403).");
      } else {
        console.error("❌ Unexpected error on restriction check:", err.message);
        process.exit(1);
      }
    }

    console.log("\n🎉 ALL V4 PLATFORM ENDPOINT TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Test run failed with error:", err.message);
    if (err.response) {
      console.error("   Response data:", JSON.stringify(err.response.data, null, 2));
    }
    process.exit(1);
  }
}

runTests();
