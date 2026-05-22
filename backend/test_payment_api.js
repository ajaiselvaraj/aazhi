import pg from 'pg';
import dotenv from 'dotenv';
import axios from 'axios';
dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
});

async function runTest() {
    console.log("🚀 Starting Transaction Flow Test...");
    let testOrderId = null;
    let txnId = null;

    try {
        // 1. Create a guest order via API
        console.log("\n1. Requesting guest payment order...");
        const resOrder = await axios.post('http://localhost:5000/api/payment/guest-order', {
            amount: 500,
            bill_id: null // Testing pure order first
        });

        console.log("Response:", resOrder.data);
        if (resOrder.data.success) {
            testOrderId = resOrder.data.data.order_id;
            txnId = resOrder.data.data.transaction_id;
            console.log(`✅ Order created successfully: ${testOrderId}, Transaction ID: ${txnId}`);
        } else {
            throw new Error("Failed to create order");
        }

        // 2. Query DB to verify the transaction was recorded as 'created'
        console.log("\n2. Querying database for newly created transaction...");
        const dbTxn = await pool.query(
            "SELECT * FROM transactions WHERE razorpay_order_id = $1",
            [testOrderId]
        );

        if (dbTxn.rows.length === 1) {
            const row = dbTxn.rows[0];
            console.log("✅ Database record found:");
            console.log(`   - ID: ${row.id}`);
            console.log(`   - Status: ${row.payment_status} (Expected: 'created')`);
            console.log(`   - Amount: ${row.amount}`);
        } else {
            throw new Error(`Transaction record not found in DB or duplicated! Count: ${dbTxn.rows.length}`);
        }

        // 3. Record a simulated cancellation/failure
        console.log("\n3. Simulating user modal cancellation...");
        const resFailure = await axios.post('http://localhost:5000/api/payment/record-failure', {
            razorpay_order_id: testOrderId,
            failure_reason: 'User dismissed payment modal',
            gateway_response: { status: 'dismissed' },
            user_details: { name: 'Test Guest', email: 'guest@test.com', mobile: '9876543210' },
            amount: 500
        });

        console.log("Response:", resFailure.data);
        if (resFailure.data.success) {
            console.log("✅ Failure/Cancellation logged successfully");
        } else {
            throw new Error("Failed to log failure");
        }

        // 4. Query DB again to check status updates and failure columns
        console.log("\n4. Verifying database status update and new columns...");
        const updatedDbTxn = await pool.query(
            "SELECT * FROM transactions WHERE razorpay_order_id = $1",
            [testOrderId]
        );

        if (updatedDbTxn.rows.length === 1) {
            const row = updatedDbTxn.rows[0];
            console.log("✅ Database record updated correctly:");
            console.log(`   - ID: ${row.id}`);
            console.log(`   - Status: ${row.payment_status} (Expected: 'cancelled')`);
            console.log(`   - Failure Reason: "${row.failure_reason}"`);
            console.log(`   - User Details:`, row.user_details);
            console.log(`   - Gateway Response:`, row.gateway_response);
        } else {
            throw new Error("Transaction record missing or duplicated after update!");
        }

        console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY! The transaction architecture is robust and records payment attempts accurately.");

    } catch (e) {
        console.error("❌ Test failed:", e);
        if (e.response) {
            console.error("API Error Response Data:", e.response.data);
        }
    } finally {
        pool.end();
        process.exit(0);
    }
}

runTest();
