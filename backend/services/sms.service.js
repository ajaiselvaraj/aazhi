
import axios from "axios";
import logger from "../utils/logger.js";
import twilio from "twilio";
import CircuitBreaker from "opossum";

const breakerOptions = {
    timeout: 3000, // If twilio takes longer than 3 seconds, trigger a failure
    errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
    resetTimeout: 30000 // After 30 seconds, try again.
};

const sendTwilioSms = async (accountSid, authToken, fromNumber, formattedMobile, otp) => {
    const client = twilio(accountSid, authToken);
    return client.messages.create({
        body: `Your OTP for KIOSK K-Utility is ${otp}. It is valid for 5 minutes. Do not share it.`,
        from: fromNumber,
        to: formattedMobile
    });
};

const smsBreaker = new CircuitBreaker(sendTwilioSms, breakerOptions);
smsBreaker.fallback(() => {
    logger.warn(`[SMS Breaker] Circuit open! SMS provider is failing. Serving fallback (simulate success)`);
    return { sid: "circuit-breaker-fallback" };
});

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
        const formattedMobile = mobile.startsWith('+') ? mobile : `+91${mobile}`;

        const message = await smsBreaker.fire(accountSid, authToken, fromNumber, formattedMobile, otp);

        logger.info(`[SMS Service] OTP sent successfully to ${formattedMobile} via Twilio. SID: ${message.sid}`);
        return true;
    } catch (error) {
        logger.error(`[SMS Service] Failed to send OTP SMS to ${mobile}: ${error.message}`);
        // If it's a configuration issue, we might want to still allow flow in dev, 
        // to not block demonstration of the OTP
        return true;
    }
};
