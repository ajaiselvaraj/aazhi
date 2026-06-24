/**
 * migrate_fix_submitted_status.js
 *
 * Retroactive fix: All existing service_requests rows with status = 'submitted'
 * were created by utility controllers (electricity, gas, municipal) before Bug 1
 * was patched. This script normalises them to status = 'pending' so they appear
 * in the Admin panel's "All Active Requests" default view.
 *
 * Run once: node migrate_fix_submitted_status.js
 */

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  console.log('🔧 [MIGRATION] Connecting to database...');

  // 1. Count affected rows
  const countRes = await pool.query(
    `SELECT COUNT(*) AS total FROM service_requests WHERE status = 'submitted'`
  );
  const total = parseInt(countRes.rows[0].total, 10);
  console.log(`📊 [MIGRATION] Found ${total} service request(s) with status = 'submitted'.`);

  if (total === 0) {
    console.log('✅ [MIGRATION] Nothing to fix. All rows already have correct status.');
    await pool.end();
    return;
  }

  // 2. Preview the rows to be updated
  const preview = await pool.query(
    `SELECT ticket_number, department, request_type, status, current_stage, created_at
     FROM service_requests WHERE status = 'submitted'
     ORDER BY created_at DESC LIMIT 10`
  );
  console.log('\n📋 [MIGRATION] Preview of rows to be updated (max 10):');
  console.table(preview.rows);

  // 3. Apply the fix
  const updateRes = await pool.query(
    `UPDATE service_requests
     SET status = 'pending', updated_at = NOW()
     WHERE status = 'submitted'
     RETURNING ticket_number, department, status`
  );
  console.log(`\n✅ [MIGRATION] Updated ${updateRes.rowCount} row(s) successfully.`);

  // 4. Verify
  const verifyRes = await pool.query(
    `SELECT COUNT(*) AS remaining FROM service_requests WHERE status = 'submitted'`
  );
  const remaining = parseInt(verifyRes.rows[0].remaining, 10);
  if (remaining === 0) {
    console.log('🎉 [MIGRATION] Verification passed. No orphaned "submitted" rows remain.');
  } else {
    console.warn(`⚠️  [MIGRATION] Warning: ${remaining} row(s) still have status = 'submitted'. Check for errors.`);
  }

  await pool.end();
}

run().catch(err => {
  console.error('❌ [MIGRATION] Fatal error:', err.message);
  process.exit(1);
});
