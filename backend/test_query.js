import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aazhi'
});

async function testQuery() {
    try {
        const query = `
            SELECT t.*, b.bill_number, b.service_type, b.billing_month, b.billing_year, b.amount as bill_amount, b.status as bill_status,
                    ua.account_number, c.name as consumer_name
             FROM transactions t
             JOIN bills b ON t.bill_id = b.id
             JOIN utility_accounts ua ON b.account_id = ua.id
             JOIN citizens c ON t.citizen_id = c.id
             WHERE b.service_type = 'electricity'
             ORDER BY t.created_at DESC LIMIT 10 OFFSET 0
        `;
        const res = await pool.query(query);
        console.log("Success! rows:", res.rows.length);
    } catch (e) {
        console.error("Error executing query:");
        console.error(e.message);
    } finally {
        pool.end();
    }
}

testQuery();
