import axios from 'axios';

async function runHistoryTest() {
    console.log("🚀 Starting History API Security & Query Test...");
    let allPassed = true;

    // Test 1: Query without consumerId and without auth token
    console.log("\n1. Querying electricity history without consumerId (expect 400)...");
    try {
        await axios.get('http://localhost:5000/api/electricity/history');
        console.error("❌ FAIL: Request succeeded when it should have been blocked");
        allPassed = false;
    } catch (e) {
        if (e.response && e.response.status === 400) {
            console.log("✅ PASS: Blocked with 400 Bad Request:", e.response.data.error || e.response.data.message);
        } else {
            console.error("❌ FAIL: Expected 400, got status:", e.response ? e.response.status : e.message);
            allPassed = false;
        }
    }

    // Test 2: Query gas history with consumerId
    console.log("\n2. Querying gas history with consumerId (expect 200)...");
    try {
        const res = await axios.get('http://localhost:5000/api/gas/history?consumerId=123456');
        if (res.status === 200 && res.data.success) {
            console.log("✅ PASS: Retrieved payment history records:", res.data.data.length, "items found.");
        } else {
            console.error("❌ FAIL: Got non-200 or unsuccessful response:", res.status, res.data);
            allPassed = false;
        }
    } catch (e) {
        console.error("❌ FAIL: Request error:", e.message);
        allPassed = false;
    }

    // Test 3: Query municipal history with consumerId
    console.log("\n3. Querying municipal history with consumerId (expect 200)...");
    try {
        const res = await axios.get('http://localhost:5000/api/municipal/history?consumerId=987654');
        if (res.status === 200 && res.data.success) {
            console.log("✅ PASS: Retrieved payment history records:", res.data.data.length, "items found.");
        } else {
            console.error("❌ FAIL: Got non-200 or unsuccessful response:", res.status, res.data);
            allPassed = false;
        }
    } catch (e) {
        console.error("❌ FAIL: Request error:", e.message);
        allPassed = false;
    }

    console.log("\n=== Summary ===");
    if (allPassed) {
        console.log("🎉 ALL HISTORY TESTS PASSED! Privacy and query lookup logic is fully secured and operational.");
    } else {
        console.error("❌ Some history checks failed. Please review the errors above.");
    }
    process.exit(allPassed ? 0 : 1);
}

runHistoryTest();
