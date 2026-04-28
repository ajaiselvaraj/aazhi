import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seed() {
  try {
    console.log("🌱 Seeding Demo Data for Electricity Bill Fetch...");

    // 1. Ensure a demo citizen exists
    const citizenRes = await pool.query(`
      INSERT INTO citizens (name, mobile, role, ward, zone)
      VALUES ('Ram Kumar', '9999999999', 'citizen', 'Ward 12', 'South Zone')
      ON CONFLICT (mobile) DO UPDATE SET name = 'Ram Kumar'
      RETURNING id;
    `);
    const citizenId = citizenRes.rows[0].id;
    console.log(`✅ Citizen verified (ID: ${citizenId})`);

    // 2. Create Utility Account for 050010005678
    const accountRes = await pool.query(`
      INSERT INTO utility_accounts (citizen_id, service_type, account_number, meter_number, status)
      VALUES ($1, 'electricity', '050010005678', 'MTR-882299', 'active')
      ON CONFLICT (account_number) DO UPDATE SET status = 'active'
      RETURNING id;
    `, [citizenId]);
    const accountId = accountRes.rows[0].id;
    console.log(`✅ Utility Account created (No: 050010005678)`);

    // 3. Create a Pending Bill
    const billNumber = 'BILL-ELEC-2026-04-101';
    await pool.query(`
      INSERT INTO bills (
        account_id, citizen_id, service_type, bill_number, 
        amount, tax_amount, total_amount, 
        billing_month, billing_year, due_date, status
      )
      VALUES (
        $1, $2, 'electricity', $3,
        1450.50, 145.05, 1595.55,
        'April', '2026', '2026-05-15', 'pending'
      )
      ON CONFLICT (bill_number) DO NOTHING;
    `, [accountId, citizenId, billNumber]);
    console.log(`✅ Pending Bill created (${billNumber})`);

    console.log("\n✨ Database successfully seeded! Try fetching bill details for '050010005678' again.");
    
    await pool.end();
  } catch (err) {
    console.error("❌ Seeding failed:", err.message);
    process.exit(1);
  }
}

seed();
