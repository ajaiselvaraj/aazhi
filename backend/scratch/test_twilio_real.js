import twilio from 'twilio';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = 'VA2d62a4efb8e7eee642947a3cb56b8205';

if (!accountSid || !authToken || !verifyServiceSid) {
    console.error('Missing credentials');
    process.exit(1);
}

const client = twilio(accountSid, authToken);

async function testCheck() {
    try {
        const check = await client.verify.v2.services(verifyServiceSid)
            .verificationChecks
            .create({ to: '+919999999999', code: '123456' });
        console.log('Verification check result:', check.sid, check.status, check.valid);
    } catch (err) {
        console.error('Error checking verification:', err.message, err.status, err.code);
    }
}

testCheck();
