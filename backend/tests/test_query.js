import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
});

async function testQuery() {
    try {
        const query = `
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'complaints'
            ORDER BY column_name;
        `;
        const res = await pool.query(query);
        console.log("Complaints Columns:");
        res.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));
    } catch (e) {
        console.error("Error executing query:", e.message);
    } finally {
        pool.end();
    }
}

testQuery();

