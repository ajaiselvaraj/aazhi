import { getAllAlerts, deleteAlert, createAlert } from './services/alert.service.js';
import { pool } from './config/db.js';

async function run() {
    try {
        console.log("Ensuring start_date and is_notice columns exist...");
        await pool.query(`ALTER TABLE alerts ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ NOT NULL DEFAULT NOW();`);
        await pool.query(`ALTER TABLE alerts ADD COLUMN IF NOT EXISTS is_notice BOOLEAN NOT NULL DEFAULT FALSE;`);
        
        console.log("Fetching existing alerts...");
        const alerts = await getAllAlerts();
        
        // Find and delete "Testing DB fix" or similar mock data
        for (const alert of alerts) {
            console.log(`Deleting alert/notice ID ${alert.id}: ${alert.title}`);
            await deleteAlert(alert.id);
        }
        
        // Add new mock alerts
        const expiryDate = new Date('2026-07-01T23:59:59Z').toISOString();
        const startDate = new Date().toISOString();
        
        const mockAlerts = [
            {
                title: "Monsoon Health & Sanitation Camp",
                message: "Free health checkups and sanitation drives will be conducted across all wards.",
                type: "Health",
                severity: "Info",
                priority: 3,
                ward: "Global",
                start_date: startDate,
                expires_at: expiryDate,
                created_by: null,
                is_notice: false
            },
            {
                title: "Transformer Blowout",
                message: "A major transformer blowout has occurred. Power restoration is underway.",
                type: "Power",
                severity: "Critical",
                priority: 1,
                ward: "Ward 4",
                start_date: startDate,
                expires_at: expiryDate,
                created_by: null,
                is_notice: false
            },
            {
                title: "Water Pipe Burst",
                message: "Emergency water pipe repair is ongoing. Water supply will be disrupted for 6 hours.",
                type: "Water",
                severity: "Warning",
                priority: 2,
                ward: "Ward 3",
                start_date: startDate,
                expires_at: expiryDate,
                created_by: null,
                is_notice: false
            },
            {
                title: "Road Blocked",
                message: "Main arterial road blocked due to fallen trees. Please use alternative routes.",
                type: "Road",
                severity: "Warning",
                priority: 2,
                ward: "Central Area",
                start_date: startDate,
                expires_at: expiryDate,
                created_by: null,
                is_notice: false
            },
            {
                title: "Sanitation Delay",
                message: "Garbage collection will be delayed by 1 day due to vehicle shortage.",
                type: "Civic",
                severity: "Info",
                priority: 3,
                ward: "Global",
                start_date: startDate,
                expires_at: expiryDate,
                created_by: null,
                is_notice: false
            }
        ];
        
        const mockNotices = [
            {
                title: "Property Tax Final Due Date",
                message: "Please pay your property tax before the final due date to avoid penalties.",
                type: "Tax",
                severity: "Warning",
                priority: 1,
                ward: "Global",
                start_date: startDate,
                expires_at: expiryDate,
                created_by: null,
                is_notice: true
            },
            {
                title: "Dengue Awareness Campaign",
                message: "Learn how to prevent dengue by eliminating stagnant water around your homes.",
                type: "Health",
                severity: "Info",
                priority: 2,
                ward: "Global",
                start_date: startDate,
                expires_at: expiryDate,
                created_by: null,
                is_notice: true
            },
            {
                title: "Municipal Recruitment Drive",
                message: "We are hiring for various municipal roles. Apply online.",
                type: "Jobs",
                severity: "Info",
                priority: 2,
                ward: "Global",
                start_date: startDate,
                expires_at: expiryDate,
                created_by: null,
                is_notice: true
            },
            {
                title: "Smart Electricity Meter Installation",
                message: "Smart meters will be installed in all households starting next week. Ensure availability.",
                type: "Event",
                severity: "Info",
                priority: 2,
                ward: "Global",
                start_date: startDate,
                expires_at: expiryDate,
                created_by: null,
                is_notice: true
            },
            {
                title: "Water Connection Amnesty Scheme",
                message: "Regularize your unauthorized water connections without penalty until the end of the month.",
                type: "Tax",
                severity: "Info",
                priority: 2,
                ward: "Global",
                start_date: startDate,
                expires_at: expiryDate,
                created_by: null,
                is_notice: true
            }
        ];

        for (const alert of mockAlerts) {
            console.log(`Creating alert: ${alert.title}`);
            await createAlert(alert);
        }

        for (const notice of mockNotices) {
            console.log(`Creating notice: ${notice.title}`);
            await createAlert(notice);
        }

        console.log("Successfully updated alerts and notices.");
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

run();
