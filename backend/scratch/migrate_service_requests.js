import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  try {
    console.log('🚀 Starting Service Requests DB migration...');

    // 1. Add missing columns to service_requests table
    console.log('Adding priority column to service_requests...');
    await pool.query("ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium'");

    console.log('Adding assigned_to column to service_requests...');
    await pool.query("ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES citizens(id)");

    console.log('Adding resolution_note column to service_requests...');
    await pool.query("ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS resolution_note TEXT");

    console.log('Adding rejection_reason column to service_requests...');
    await pool.query("ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS rejection_reason TEXT");

    console.log('Adding scheduled_at column to service_requests...');
    await pool.query("ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP");

    console.log('Adding resolved_at column to service_requests...');
    await pool.query("ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP");

    console.log('Adding closed_at column to service_requests...');
    await pool.query("ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP");

    // 2. Drop existing CHECK constraints on status/stage columns
    console.log('Checking check constraints on status and stage...');

    // List and drop check constraints on service_requests
    const constraintsResult = await pool.query(`
      SELECT conname, pg_get_constraintdef(c.oid) as condef
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conrelid = 'service_requests'::regclass AND contype = 'c';
    `);

    for (const row of constraintsResult.rows) {
      const conname = row.conname;
      const condef = row.condef.toLowerCase();
      // Drop constraints restricting status or stage values
      if (conname.includes('status') || conname.includes('stage') || condef.includes('status') || condef.includes('stage')) {
        console.log(`Dropping constraint: ${conname} (${row.condef})`);
        await pool.query(`ALTER TABLE service_requests DROP CONSTRAINT IF EXISTS "${conname}" CASCADE`);
      }
    }

    console.log('✅ Migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
