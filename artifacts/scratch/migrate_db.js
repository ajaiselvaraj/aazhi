const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.herdtfhovpatumqnupmy:HmULwizbkHTHF6hT@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true'
});

async function migrate() {
  try {
    console.log('🚀 Starting DB migration...');
    
    // Add metadata column to complaints
    console.log('Adding metadata column to complaints...');
    await pool.query('ALTER TABLE complaints ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT \'{}\'');
    
    // Add rejection_reason to complaints if missing
    console.log('Adding rejection_reason column to complaints...');
    await pool.query('ALTER TABLE complaints ADD COLUMN IF NOT EXISTS rejection_reason TEXT');
    
    console.log('✅ Migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    pool.end();
  }
}

migrate();
