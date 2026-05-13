import pkg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const { Pool } = pkg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkAndSeed() {
    try {
        console.log("Checking service_config table...");
        const res = await pool.query("SELECT * FROM service_config");
        console.log(`Found ${res.rowCount} services.`);
        
        if (res.rowCount === 0) {
            console.log("Seeding service_config table...");
            await pool.query(`
                INSERT INTO service_config (service_name, display_name, is_enabled, description) VALUES
                ('electricity', 'Electricity Service', true, 'Electricity bill payment and service management'),
                ('gas', 'Gas Service', true, 'LPG cylinder booking and gas bill management'),
                ('water', 'Water Supply', true, 'Water bill payment and water supply services'),
                ('waste', 'Waste Management', true, 'Solid waste management services'),
                ('property', 'Property Tax', true, 'Property tax payment and assessment'),
                ('complaints', 'Complaint Portal', true, 'Civic complaint registration and tracking')
                ON CONFLICT (service_name) DO NOTHING;
            `);
            console.log("✅ Seeding complete.");
        } else {
            const electricity = res.rows.find(r => r.service_name === 'electricity');
            if (!electricity) {
                console.log("Electricity service missing. Adding it...");
                await pool.query(`
                    INSERT INTO service_config (service_name, display_name, is_enabled, description)
                    VALUES ('electricity', 'Electricity Service', true, 'Electricity bill payment and service management')
                `);
                console.log("✅ Electricity service added.");
            } else if (!electricity.is_enabled) {
                console.log("Electricity service is disabled. Enabling it...");
                await pool.query(`
                    UPDATE service_config SET is_enabled = true WHERE service_name = 'electricity'
                `);
                console.log("✅ Electricity service enabled.");
            } else {
                console.log("✅ Electricity service is already configured and enabled.");
            }
        }
    } catch (err) {
        console.error("❌ Error:", err.message);
    } finally {
        await pool.end();
    }
}

checkAndSeed();
