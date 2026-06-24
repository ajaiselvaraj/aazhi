import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;

// Connect to the default 'postgres' database to create the new one
const pool = new Pool({
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "password",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT) || 5432,
    database: "postgres" // Must connect to an existing database first
});

async function createDatabase() {
    try {
        const client = await pool.connect();
        const dbName = process.env.DB_NAME || "suvidha_kiosk";
        
        console.log(`Checking if database '${dbName}' exists...`);
        const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = '${dbName}'`);
        
        if (res.rowCount === 0) {
            console.log(`Database '${dbName}' does not exist. Creating it...`);
            await client.query(`CREATE DATABASE ${dbName}`);
            console.log(`✅ Database '${dbName}' created successfully!`);
        } else {
            console.log(`Database '${dbName}' already exists.`);
        }
        
        client.release();
    } catch (err) {
        console.error("❌ Error creating database:", err.message);
    } finally {
        await pool.end();
    }
}

createDatabase();
