import twilio from "twilio";

// Twilio Config
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhone = process.env.TWILIO_PHONE_NUMBER;
const fromWhatsApp = process.env.TWILIO_WHATSAPP_NUMBER || "+14155238886";

const getClient = () => {
    if (!accountSid || !authToken) {
        throw new Error("Twilio credentials are missing in environmental config.");
    }
    return twilio(accountSid, authToken);
};

export const formatPhoneNumber = (phone) => {
    let cleanPhone = phone.trim();
    if (!cleanPhone.startsWith("+")) {
        // Assume Indian country code if prefix missing
        cleanPhone = `+91${cleanPhone}`;
    }
    return cleanPhone;
};

export const sendSMS = async (to, body) => {
    const client = getClient();
    const formattedTo = formatPhoneNumber(to);
    if (!fromPhone) {
        throw new Error("TWILIO_PHONE_NUMBER is not configured.");
    }
    return await client.messages.create({
        body,
        from: fromPhone,
        to: formattedTo
    });
};

export const sendWhatsApp = async (to, body) => {
    const client = getClient();
    const formattedTo = formatPhoneNumber(to);
    return await client.messages.create({
        body,
        from: `whatsapp:${fromWhatsApp}`,
        to: `whatsapp:${formattedTo}`
    });
};
