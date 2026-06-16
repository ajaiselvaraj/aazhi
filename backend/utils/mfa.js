// ═══════════════════════════════════════════════════════════════
-- Pure JS RFC 6238 TOTP Multi-Factor Authentication Helper
// ═══════════════════════════════════════════════════════════════

import crypto from "crypto";

/**
 * Decodes a base32 encoded string into a buffer.
 */
function base32Decode(base32) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const cleaned = base32.toUpperCase().replace(/=+$/, "");
    const length = cleaned.length;
    let bits = 0;
    let value = 0;
    let index = 0;
    const buffer = Buffer.alloc(Math.floor((length * 5) / 8));

    for (let i = 0; i < length; i++) {
        const val = alphabet.indexOf(cleaned.charAt(i));
        if (val === -1) {
            throw new Error("Invalid base32 character");
        }
        value = (value << 5) | val;
        bits += 5;
        if (bits >= 8) {
            buffer[index++] = (value >> (bits - 8)) & 255;
            bits -= 8;
        }
    }
    return buffer;
}

/**
 * Generates a 6-digit TOTP token using base32 secret and time step offset.
 */
export function generateTOTP(secret, timeOffsetSteps = 0) {
    const key = base32Decode(secret);
    
    // Time step is 30 seconds
    const epoch = Math.floor(Date.now() / 1000);
    const counter = Math.floor(epoch / 30) + timeOffsetSteps;
    
    // Counter to 8-byte buffer
    const buf = Buffer.alloc(8);
    let tmp = counter;
    for (let i = 7; i >= 0; i--) {
        buf[i] = tmp & 0xff;
        tmp = tmp >> 8;
    }
    
    const hmac = crypto.createHmac("sha1", key);
    hmac.update(buf);
    const hmacResult = hmac.digest();
    
    // Dynamic truncation
    const offset = hmacResult[hmacResult.length - 1] & 0xf;
    const code = (
        ((hmacResult[offset] & 0x7f) << 24) |
        ((hmacResult[offset + 1] & 0xff) << 16) |
        ((hmacResult[offset + 2] & 0xff) << 8) |
        (hmacResult[offset + 3] & 0xff)
    ) % 1000000;
    
    // Zero-pad
    return code.toString().padStart(6, "0");
}

/**
 * Verifies a TOTP token against a base32 secret (allowing +/- 1 time step window).
 */
export function verifyTOTP(secret, token) {
    if (!secret || !token) return false;
    const cleanToken = token.trim();
    for (let i = -1; i <= 1; i++) {
        if (generateTOTP(secret, i) === cleanToken) {
            return true;
        }
    }
    return false;
}

/**
 * Generates a random 16-character base32 secret.
 */
export function generateSecret() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const bytes = crypto.randomBytes(10);
    let secret = "";
    for (let i = 0; i < bytes.length; i++) {
        secret += chars[bytes[i] % chars.length];
    }
    return secret;
}
