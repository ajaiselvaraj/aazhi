

import crypto from "crypto";
import { pool } from "../config/db.js";
import logger from "../utils/logger.js";
import { sendOtpSms } from "./sms.service.js";
import otpGenerator from "otp-generator";

/**
 * Generate a random 6-digit OTP
 */
const generateSixDigitOtp = () => {
    return otpGenerator.generate(6, { 
        upperCaseAlphabets: false, 
        specialChars: false, 
        lowerCaseAlphabets: false, 
        digits: true 
    });
};

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
 * Generate, Store, and Send OTP to mobile
 */
export const requestOtp = async (mobile) => {
    // 1. Rate Limiting Check
    await checkOtpRateLimit(mobile);

    // 2. Generate OTP
    const otpCode = generateSixDigitOtp();
    // Expiry time calculation (5 minutes from now)
    const expiryTime = new Date(Date.now() + 5 * 60 * 1000);

    // 3. Store in DB
    const insertQuery = `
        INSERT INTO otp_table (mobile, otp, expiry)
        VALUES ($1, $2, $3)
        RETURNING id
    `;
    await pool.query(insertQuery, [mobile, otpCode, expiryTime]);

    // 4. Send via SMS Service
    await sendOtpSms(mobile, otpCode);

    return { mobile, expiry: expiryTime };
};

/**
 * Validates the OTP submitted by the user. If valid, fetches or registers the citizen.
 */
export const confirmOtp = async (mobile, providedOtp) => {
    // 1. Fetch the latest OTP for the given mobile
    const query = `
        SELECT * FROM otp_table
        WHERE mobile = $1 
        ORDER BY created_at DESC
        LIMIT 1
    `;
    const result = await pool.query(query, [mobile]);

    if (result.rows.length === 0) {
        throw new Error("OTP not found or expired.");
    }

    const { otp, expiry } = result.rows[0];

    // 2. Validate Expiry
    if (new Date() > new Date(expiry)) {
        throw new Error("OTP has expired. Please request a new one.");
    }

    // 3. Match the OTP code (Development Mode Bypass: Accept ANY OTP)
    const isDev = process.env.NODE_ENV === "development";
    
    if (otp !== providedOtp && !isDev) {
        throw new Error("Invalid OTP code.");
    }

    if (isDev) {
        logger.info(`🛡️ [Auth Dev] Bypassing OTP check for ${mobile}. Accepted provided OTP: ${providedOtp}`);
    }

    // 4. Mark OTP as used (by deleting ALL OTPs for this mobile to prevent reuse/spam)
    await pool.query(`DELETE FROM otp_table WHERE mobile = $1`, [mobile]);

    // 5. Fetch or Create Citizen
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
