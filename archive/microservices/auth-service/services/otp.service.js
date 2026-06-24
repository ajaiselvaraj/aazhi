

import crypto from "crypto";
import { pool } from "../config/db.js";
import logger from "../utils/logger.js";
import twilio from "twilio";

/**
 * Check if the user is spamming OTPs (e.g., more than 3 per 10 minutes)
 */
export const checkOtpRateLimit = async (mobile) => {
    const timeWindowLimit = "10 minutes";
    const maxRequests = 3;

    const query = `
        SELECT COUNT(*) 
        FROM otp_table 
        WHERE mobile = $1 
        AND created_at >= NOW() - INTERVAL '${timeWindowLimit}'
    `;
    const result = await pool.query(query, [mobile]);
    const attempts = parseInt(result.rows[0].count, 10);

    if (attempts >= maxRequests) {
        throw new Error("Too many OTP requests. Please try again after 10 minutes.");
    }
    return true;
};

/**
 * Request OTP via Twilio Verify
 */
export const requestOtp = async (mobile) => {
    // 1. Rate Limiting Check
    await checkOtpRateLimit(mobile);

    // 2. Request Twilio Verify to send the OTP
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    if (!accountSid || !authToken || !verifyServiceSid) {
        logger.error(`[OTP Service] Twilio is not fully configured. Missing credentials/verify service SID.`);
        throw new Error("Twilio API Failure: Twilio is not configured.");
    }

    const client = twilio(accountSid, authToken);
    const formattedMobile = mobile.startsWith('+') ? mobile : `+91${mobile}`;

    try {
        logger.info(`[OTP Service] Sending Twilio Verify OTP to ${formattedMobile}`);
        await client.verify.v2.services(verifyServiceSid)
            .verifications
            .create({ to: formattedMobile, channel: 'sms' });
    } catch (error) {
        logger.error(`[OTP Service] Twilio Verify failed to send OTP to ${mobile}: ${error.message}`);
        throw new Error(`Twilio API Failure: ${error.message}`);
    }

    const expiryTime = new Date(Date.now() + 5 * 60 * 1000);

    // 3. Store a placeholder in DB for local rate-limiting
    const insertQuery = `
        INSERT INTO otp_table (mobile, otp, expiry)
        VALUES ($1, $2, $3)
    `;
    await pool.query(insertQuery, [mobile, 'TWILIO', expiryTime]);

    return { mobile, expiry: expiryTime };
};

/**
 * Validates the OTP submitted by the user via Twilio Verify. If valid, fetches or registers the citizen.
 */
export const confirmOtp = async (mobile, providedOtp) => {
    // 1. Validate against Twilio Verify API
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    if (!accountSid || !authToken || !verifyServiceSid) {
        logger.error(`[OTP Service] Twilio is not fully configured. Missing credentials/verify service SID.`);
        throw new Error("Twilio API Failure: Twilio is not configured.");
    }

    const client = twilio(accountSid, authToken);
    const formattedMobile = mobile.startsWith('+') ? mobile : `+91${mobile}`;

    let verificationCheck;
    try {
        logger.info(`[OTP Service] Verifying Twilio OTP for ${formattedMobile}`);
        verificationCheck = await client.verify.v2.services(verifyServiceSid)
            .verificationChecks
            .create({ to: formattedMobile, code: providedOtp });
    } catch (error) {
        logger.error(`[OTP Service] Twilio Verify check failed for ${mobile}: ${error.message}`);
        if (error.status === 404 || error.code === 20404) {
            throw new Error("OTP has expired. Please request a new one.");
        }
        if (error.code === 60200) {
            throw new Error("Invalid OTP. Please enter the OTP sent to your mobile number.");
        }
        throw new Error(`Twilio API Failure: ${error.message}`);
    }

    if (!verificationCheck || verificationCheck.status !== 'approved') {
        throw new Error("Invalid OTP. Please enter the OTP sent to your mobile number.");
    }

    // 2. Mark OTP as used (by deleting ALL OTPs for this mobile to prevent reuse/spam)
    await pool.query(`DELETE FROM otp_table WHERE mobile = $1`, [mobile]);

    // 3. Fetch or Create Citizen
    let citizen;
    const citizenRes = await pool.query(`SELECT * FROM citizens WHERE mobile = $1 LIMIT 1`, [mobile]);
    
    if (citizenRes.rows.length > 0) {
        citizen = citizenRes.rows[0];
    } else {
        // Create new citizen record
        const insertCitizen = `
            INSERT INTO citizens (mobile)
            VALUES ($1)
            RETURNING *
        `;
        const newCitizenRes = await pool.query(insertCitizen, [mobile]);
        citizen = newCitizenRes.rows[0];
        logger.info(`[Citizen Service] Registered new citizen: ${mobile}`);
    }

    return citizen;
};
