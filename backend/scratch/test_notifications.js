import 'dotenv/config';
import { pool } from '../config/db.js';
import { retryFailedNotification } from '../services/notification.service.js';

const BASE_URL = 'http://127.0.0.1:5000/api';

async function main() {
    console.log("=== 📢 STARTING STATUS SUBSCRIPTION INTEGRATION TESTS ===\n");

    const testPhone = "+919999988888";
    let complaintId = null;
    let ticketNumber = null;

    try {
        // Step 1: Clean up any old test data
        console.log("🧹 Cleaning up old test records...");
        await pool.query("DELETE FROM notification_logs WHERE phone_number = $1", [testPhone]);
        await pool.query("DELETE FROM complaints WHERE notification_phone = $1", [testPhone]);

        // Step 2: Register a new complaint with BOTH channels enabled via debug route
        console.log("\n1️⃣ Registering a new complaint with notifications...");
        const registerPayload = {
            category: "municipal",
            department: "Municipal Administration",
            subject: "Broken streetlight test",
            description: "The streetlight near ward 3 has been broken for 3 days and needs immediate replacement.",
            ward: "Ward 3",
            priority: "high",
            notification_enabled: true,
            notification_channel: "BOTH",
            notification_phone: testPhone,
            phone: testPhone
        };

        const regRes = await fetch(`${BASE_URL}/complaints/debug`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(registerPayload)
        });

        if (!regRes.ok) {
            const errText = await regRes.text();
            throw new Error(`Failed to register complaint via debug route: ${errText}`);
        }

        const regData = await regRes.json();
        complaintId = regData.data.id;
        ticketNumber = regData.data.ticket_number;
        console.log(`✅ Complaint created successfully! ID: ${complaintId}, Ticket: ${ticketNumber}`);

        // Step 3: Check database for registration logs (BOTH channels should yield SMS & WHATSAPP logs)
        console.log("\n2️⃣ Verifying registration notification logs in DB...");
        // Give database a tiny fraction of a second to complete async dispatch if any
        await new Promise(r => setTimeout(r, 1000));

        const { rows: regLogs } = await pool.query(
            "SELECT * FROM notification_logs WHERE complaint_id = $1 ORDER BY created_at ASC",
            [complaintId]
        );

        console.log(`🔍 Found ${regLogs.length} log(s) for the registered status.`);
        for (const log of regLogs) {
            console.log(`   - Channel: ${log.channel}, Status Sent: ${log.status_sent}, Delivery Status: ${log.delivery_status}, Error: ${log.error_message || 'None'}`);
        }

        if (regLogs.length < 2) {
            throw new Error(`Expected at least 2 logs (SMS and WHATSAPP for BOTH) but found ${regLogs.length}`);
        }

        // Step 4: Perform status changes and verify updates are logged
        const testStatuses = ['under_review', 'in_progress', 'field_team_assigned', 'resolved', 'closed'];
        console.log(`\n3️⃣ Simulating complaint status transitions: ${testStatuses.join(' ➡️  ')}`);

        for (const status of testStatuses) {
            console.log(`🔄 Updating complaint status to: "${status}"...`);
            const updateRes = await fetch(`${BASE_URL}/complaints/debug/${complaintId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, notes: `Status changed to ${status} by integration test` })
            });

            if (!updateRes.ok) {
                const errText = await updateRes.text();
                throw new Error(`Failed to update status to ${status}: ${errText}`);
            }

            await new Promise(r => setTimeout(r, 1000));
        }

        // Verify all status changes logged properly
        const { rows: allLogs } = await pool.query(
            "SELECT * FROM notification_logs WHERE complaint_id = $1 ORDER BY created_at ASC",
            [complaintId]
        );

        console.log(`\n📊 Total notification logs created: ${allLogs.length}`);
        if (allLogs.length !== 12) { // 2 logs for registration + 2 logs for each of 5 statuses = 12 total
            console.log(`⚠️ Expected 12 logs total, found ${allLogs.length}. Let's list all:`);
        }

        for (const log of allLogs) {
            console.log(`   - Status Sent: ${log.status_sent.padEnd(20)} | Channel: ${log.channel.padEnd(8)} | Delivery: ${log.delivery_status.padEnd(8)} | Body: "${log.message_body}"`);
        }

        // Step 5: Test Background Retry Sweep logic
        console.log("\n4️⃣ Testing Background Retry Sweep logic...");
        // Find a failed log to test retry on
        const failedLog = allLogs.find(log => log.delivery_status === 'failed');
        if (!failedLog) {
            console.log("ℹ️ No failed logs found (all messages sent successfully or skipped). We will force-create a failed log to test retry sweep.");
            // Create a custom failed log
            const { rows: forcedLogs } = await pool.query(
                `INSERT INTO notification_logs 
                 (complaint_id, phone_number, channel, status_sent, message_body, delivery_status, error_message, retry_count)
                 VALUES ($1, $2, 'SMS', 'retry_test', 'Force fail test message body', 'failed', 'Simulated twilio error', 0)
                 RETURNING *`,
                [complaintId, testPhone]
            );
            
            console.log(`   Simulating retry sweep on forced failed log ID: ${forcedLogs[0].id}`);
            console.log(`   Current retry_count: ${forcedLogs[0].retry_count}`);

            console.log("   Running retryFailedNotification()...");
            await retryFailedNotification();

            const { rows: checkedLogs } = await pool.query(
                "SELECT * FROM notification_logs WHERE id = $1",
                [forcedLogs[0].id]
            );
            console.log(`   After sweep, retry_count: ${checkedLogs[0].retry_count}, status: ${checkedLogs[0].delivery_status}, error: ${checkedLogs[0].error_message}`);
            
            if (checkedLogs[0].retry_count === 1) {
                console.log("✅ Retry counter successfully incremented!");
            } else {
                throw new Error(`Expected retry count to be 1, but got ${checkedLogs[0].retry_count}`);
            }
        } else {
            console.log(`   Simulating retry sweep on failed log ID: ${failedLog.id}`);
            console.log(`   Current retry_count: ${failedLog.retry_count}`);

            console.log("   Running retryFailedNotification()...");
            await retryFailedNotification();

            const { rows: checkedLogs } = await pool.query(
                "SELECT * FROM notification_logs WHERE id = $1",
                [failedLog.id]
            );
            console.log(`   After sweep, retry_count: ${checkedLogs[0].retry_count}, status: ${checkedLogs[0].delivery_status}, error: ${checkedLogs[0].error_message}`);
            
            if (checkedLogs[0].retry_count > failedLog.retry_count) {
                console.log("✅ Retry counter successfully incremented!");
            } else {
                throw new Error(`Expected retry count to increase, but got ${checkedLogs[0].retry_count}`);
            }
        }

        console.log("\n🎉 ALL TESTS COMPLETED SUCCESSFULLY! 🎉");

    } catch (err) {
        console.error("\n❌ TEST FAILED:", err.message);
        process.exitCode = 1;
    } finally {
        // Cleanup test data
        console.log("\n🧹 Cleaning up test records from database...");
        if (complaintId) {
            await pool.query("DELETE FROM notification_logs WHERE complaint_id = $1", [complaintId]);
            await pool.query("DELETE FROM complaints WHERE id = $1", [complaintId]);
            console.log("✅ Database cleanup finished.");
        }
        await pool.end();
        process.exit();
    }
}

main();
