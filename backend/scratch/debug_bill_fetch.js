import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    const consumerNumber = '050010005678';
    
    console.log(`🔍 Searching for consumer: ${consumerNumber}`);
    
    const account = await pool.query(
      "SELECT * FROM utility_accounts WHERE account_number = $1",
      [consumerNumber]
    );
    
    if (account.rows.length === 0) {
      console.log("❌ No utility account found for this number.");
      
      const anyAccount = await pool.query("SELECT account_number FROM utility_accounts LIMIT 5");
      console.log("💡 Available account numbers:", anyAccount.rows.map(r => r.account_number));
    } else {
      console.log("✅ Account found:", account.rows[0]);
      
      const bills = await pool.query(
        "SELECT * FROM bills WHERE account_id = $1",
        [account.rows[0].id]
      );
      console.log(`📄 Bills found: ${bills.rows.length}`);
      console.log(bills.rows);
    }

    await pool.end();
  } catch (err) {
    console.error("Check failed:", err.message);
    process.exit(1);
  }
}

run();
