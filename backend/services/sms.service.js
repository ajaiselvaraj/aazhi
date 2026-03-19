
import axios from "axios";
import logger from "../utils/logger.js";

import twilio from "twilio";

export const sendOtpSms = async (mobile, otp) => {
    try {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const fromNumber = process.env.TWILIO_PHONE_NUMBER;

        if (
            !accountSid || accountSid.includes("YOUR") ||
            !authToken || authToken.includes("YOUR") ||
            !fromNumber || fromNumber.includes("YOUR")
        ) {
            logger.warn(`[SMS Service] Twilio credentials not configured. Dummy logging OTP ${otp} to mobile ${mobile}`);
            return true;
        }

        logger.info(`[SMS Service] Sending OTP to ${mobile} via Twilio`);

        const client = twilio(accountSid, authToken);
        const formattedMobile = mobile.startsWith('+') ? mobile : `+91${mobile}`;

        const message = await client.messages.create({
            body: `Your OTP for KIOSK K-Utility is ${otp}. It is valid for 5 minutes. Do not share it.`,
            from: fromNumber,
            to: formattedMobile
        });

        logger.info(`[SMS Service] OTP sent successfully to ${formattedMobile} via Twilio. SID: ${message.sid}`);
        return true;
    } catch (error) {
        logger.error(`[SMS Service] Failed to send OTP SMS to ${mobile}: ${error.message}`);
        // If it's a configuration issue, we might want to still allow flow in dev, 
        // but for production-ready, we should throw.
        throw error;
    }
};
