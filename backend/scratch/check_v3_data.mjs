import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', 'back.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

try {
  // Check all recent reports with V3 columns
  const result = await pool.query(`
    SELECT id, anonymous_case_code, risk_score, risk_level, retaliation_risk, escalation_level, created_at
    FROM anonymous_integrity_reports
    ORDER BY created_at DESC
    LIMIT 10
  `);
  
  console.log('=== RECENT REPORTS (V3 fields) ===');
  result.rows.forEach(r => {
    console.log(`${r.anonymous_case_code}: risk=${r.risk_score}/${r.risk_level} retaliation=${r.retaliation_risk} escalation=${r.escalation_level} time=${r.created_at}`);
  });

  // Count V3 table contents
  const tables = ['integrity_case_assignments', 'approval_requests', 'evidence_chain', 'security_incidents', 'case_escalations'];
  console.log('\n=== V3 TABLE COUNTS ===');
  for (const t of tables) {
    const cnt = await pool.query(`SELECT COUNT(*) FROM ${t}`);
    console.log(`  ${t}: ${cnt.rows[0].count} rows`);
  }

  // Latest security incidents
  const incidents = await pool.query('SELECT incident_type, severity, created_at FROM security_incidents ORDER BY created_at DESC LIMIT 5');
  console.log('\n=== LATEST SECURITY INCIDENTS ===');
  incidents.rows.forEach(r => console.log(`  [${r.severity}] ${r.incident_type} @ ${r.created_at}`));

} finally {
  await pool.end();
}
