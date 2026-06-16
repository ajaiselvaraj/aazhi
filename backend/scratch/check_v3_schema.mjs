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
  // Check if V3 columns exist on anonymous_integrity_reports
  const colRes = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'anonymous_integrity_reports'
    ORDER BY column_name
  `);
  console.log('=== anonymous_integrity_reports COLUMNS ===');
  colRes.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));

  // Check if V3 tables exist
  const tabRes = await pool.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('integrity_case_assignments', 'approval_requests', 'evidence_chain', 'security_incidents', 'case_escalations', 'officer_accounts')
    ORDER BY table_name
  `);
  console.log('\n=== V3 TABLES ===');
  tabRes.rows.forEach(r => console.log(`  ✅ ${r.table_name}`));
  
  const allTables = ['integrity_case_assignments', 'approval_requests', 'evidence_chain', 'security_incidents', 'case_escalations', 'officer_accounts'];
  const foundTables = tabRes.rows.map(r => r.table_name);
  const missingTables = allTables.filter(t => !foundTables.includes(t));
  if (missingTables.length > 0) {
    console.log('\n=== MISSING TABLES ===');
    missingTables.forEach(t => console.log(`  ❌ ${t}`));
  }

  // Check officer_accounts columns
  const officerCols = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'officer_accounts'
    ORDER BY column_name
  `);
  console.log('\n=== officer_accounts COLUMNS ===');
  officerCols.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));

  // Count reports
  const cnt = await pool.query('SELECT COUNT(*) FROM anonymous_integrity_reports');
  console.log('\nTotal reports:', cnt.rows[0].count);

  // Latest report
  const latest = await pool.query('SELECT id, anonymous_case_code, risk_score, risk_level, retaliation_risk FROM anonymous_integrity_reports ORDER BY created_at DESC LIMIT 1');
  if (latest.rows.length) {
    console.log('\nLatest report V3 columns:');
    console.log(JSON.stringify(latest.rows[0], null, 2));
  }

} finally {
  await pool.end();
}
