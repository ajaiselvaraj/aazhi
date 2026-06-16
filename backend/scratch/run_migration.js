import { initializeAuthTables } from "../utils/db-setup.js";

async function main() {
    console.log("Starting migration run...");
    await initializeAuthTables();
    console.log("Migration run finished.");
    process.exit(0);
}
main();
