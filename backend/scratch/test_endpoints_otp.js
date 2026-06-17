import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
    console.log('=== Starting OTP API Endpoint Tests ===\n');

    // Test 1: Verify mock OTP '123' or '123456' is rejected
    console.log('Test 1: Verifying a random/mock OTP is rejected...');
    try {
        const response = await axios.post(`${BASE_URL}/auth/verify-otp`, {
            mobile: '9999999999',
            otp: '123456'
        });
        console.error('❌ FAIL: Expected verification to fail, but it succeeded!', response.data);
    } catch (err) {
        if (err.response) {
            console.log(`✅ PASS: Server rejected mock OTP with status: ${err.response.status}`);
            console.log(`   Message: "${err.response.data.message}"`);
            if (err.response.data.message === "Invalid OTP. Please enter the OTP sent to your mobile number." ||
                err.response.data.message === "OTP has expired. Please request a new one.") {
                console.log('✅ PASS: Failure message is correct.');
            } else {
                console.error(`❌ FAIL: Unexpected error message: "${err.response.data.message}"`);
            }
        } else {
            console.error('❌ FAIL: Network/connection error:', err.message);
        }
    }

    console.log('\nTest 2: Verifying send-otp with an invalid mobile number...');
    try {
        await axios.post(`${BASE_URL}/auth/send-otp`, {
            mobile: '123'
        });
        console.error('❌ FAIL: Expected validation to fail for short mobile number.');
    } catch (err) {
        if (err.response && err.response.status === 400) {
            console.log(`✅ PASS: Correctly rejected invalid mobile number with status 400`);
            console.log(`   Message: "${err.response.data.message}"`);
        } else {
            console.error('❌ FAIL:', err.message);
        }
    }

    console.log('\nTest 3: Verifying send-otp with a valid format number (trial account constraint)...');
    try {
        const response = await axios.post(`${BASE_URL}/auth/send-otp`, {
            mobile: '9999999999'
        });
        console.log('Response:', response.data);
    } catch (err) {
        if (err.response) {
            console.log(`ℹ️ NOTE: send-otp failed as expected due to Twilio trial account restriction.`);
            console.log(`   Status: ${err.response.status}`);
            console.log(`   Message: "${err.response.data.message}"`);
            if (err.response.data.message.includes('phone number is unverified') || err.response.data.message.includes('Twilio API Failure')) {
                console.log('✅ PASS: Handled Twilio API trial limitations correctly.');
            } else {
                console.error('❌ FAIL: Unexpected message content.');
            }
        } else {
            console.error('❌ FAIL:', err.message);
        }
    }
}

runTests();
