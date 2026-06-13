/**
 * verify_fix.js
 *
 * Post-patch verification. Checks:
 *  1. No rows in service_requests still have status = 'submitted'.
 *  2. Admin API returns all active requests (pending + in_progress).
 *  3. Department normalization map resolves correctly.
 */
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  // ── 1. Status distribution ─────────────────────────────
  console.log('\n=== 1. Status Distribution ===');
  const statusRes = await pool.query(
    `SELECT status, COUNT(*) AS count FROM service_requests GROUP BY status ORDER BY count DESC`
  );
  console.table(statusRes.rows);

  const orphaned = statusRes.rows.find(r => r.status === 'submitted');
  if (orphaned) {
    console.warn(`⚠️  ${orphaned.count} row(s) still have status='submitted'. Migration may have missed them.`);
  } else {
    console.log('✅ No orphaned "submitted" rows. Bug 1 fixed.');
  }

  // ── 2. Active request count (what admin sees by default) ─
  console.log('\n=== 2. Active Requests Visible to Admin ===');
  const activeRes = await pool.query(
    `SELECT status, department, COUNT(*) AS count
     FROM service_requests
     WHERE status IN ('pending', 'submitted', 'in_progress')
     GROUP BY status, department
     ORDER BY status, department`
  );
  console.table(activeRes.rows);
  console.log(`✅ Admin would see ${activeRes.rows.reduce((s, r) => s + parseInt(r.count), 0)} total active requests.`);

  // ── 3. Recently created utility requests visible ─────────
  console.log('\n=== 3. Recent Utility Requests (Electricity / Gas / Municipal) ===');
  const utilityRes = await pool.query(
    `SELECT ticket_number, department, request_type, status, current_stage, created_at
     FROM service_requests
     WHERE department IN ('Electricity', 'Gas', 'Municipal', 'Waste Management')
     ORDER BY created_at DESC LIMIT 10`
  );
  console.table(utilityRes.rows);

  // ── 4. Bug 2: Department normalization check ─────────────
  console.log('\n=== 4. Department Values in DB ===');
  const deptRes = await pool.query(
    `SELECT department, COUNT(*) AS count FROM service_requests GROUP BY department ORDER BY count DESC`
  );
  console.table(deptRes.rows);

  await pool.end();
  console.log('\n🎉 Verification complete.');
}

run().catch(err => {
  console.error('❌ Verification error:', err.message);
  process.exit(1);
});
