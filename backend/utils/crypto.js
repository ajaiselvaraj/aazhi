// ═══════════════════════════════════════════════════════════════
// Government-Grade Security Cryptographic Helpers (AES-256-GCM)
// ═══════════════════════════════════════════════════════════════

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM recommended IV size
const TAG_LENGTH = 16; // Standard authentication tag size

// Helper: Derive a secure 32-byte key from standard environment configurations
const getEncryptionKey = () => {
    const secret = process.env.INTEGRITY_ENCRYPTION_KEY || process.env.JWT_SECRET || "default_super_secure_key_32_bytes_long!!";
    return crypto.createHash("sha256").update(secret).digest();
};

/**
 * Encrypts a text string using AES-256-GCM.
 * Returns the format `iv_hex:auth_tag_hex:ciphertext_hex`
 * 
 * @param {string} text - Raw input text
 * @returns {string} - Encrypted GCM token
 */
export const encrypt = (text) => {
    if (!text) return text;
    try {
        const key = getEncryptionKey();
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
        
        let encrypted = cipher.update(text, "utf8", "hex");
        encrypted += cipher.final("hex");
        
        const authTag = cipher.getAuthTag();
        
        return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
    } catch (err) {
        console.error("AES-GCM Encryption failed:", err.message);
        return text;
    }
};

/**
 * Decrypts a text string formatted as `iv_hex:auth_tag_hex:ciphertext_hex`
 * 
 * @param {string} text - Encrypted GCM token
 * @returns {string} - Decrypted raw text
 */
export const decrypt = (text) => {
    if (!text) return text;
    try {
        const parts = text.split(":");
        if (parts.length < 3) {
            // Revert back-compat: If it has only 2 parts, it was encrypted with CBC
            // We'll return it as is or try to decrypt with CBC if possible, 
            // but since it is a clean setup we can fail gracefully or return text.
            return text;
        }
        
        const ivHex = parts[0];
        const tagHex = parts[1];
        const ciphertextHex = parts[2];
        
        const iv = Buffer.from(ivHex, "hex");
        const tag = Buffer.from(tagHex, "hex");
        const ciphertext = Buffer.from(ciphertextHex, "hex");
        const key = getEncryptionKey();
        
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);
        
        let decrypted = decipher.update(ciphertext, "hex", "utf8");
        decrypted += decipher.final("utf8");
        
        return decrypted;
    } catch (err) {
        console.error("AES-GCM Decryption failed:", err.message);
        return "[Decryption Failed - Tamper Detected]";
    }
};

/**
 * Encrypts a raw binary file buffer using AES-256-GCM.
 * Returns a concatenated buffer of: [IV (12B)][AuthTag (16B)][Ciphertext]
 * 
 * @param {Buffer} buffer - File buffer
 * @returns {Buffer} - Encrypted buffer
 */
export const encryptBuffer = (buffer) => {
    try {
        const key = getEncryptionKey();
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
        
        const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
        const authTag = cipher.getAuthTag();
        
        return Buffer.concat([iv, authTag, ciphertext]);
    } catch (err) {
        console.error("Buffer GCM encryption failed:", err.message);
        return buffer;
    }
};

/**
 * Decrypts a binary file buffer encrypted with AES-256-GCM.
 * Expects the buffer layout: [IV (12B)][AuthTag (16B)][Ciphertext]
 * 
 * @param {Buffer} buffer - Encrypted file buffer
 * @returns {Buffer} - Decrypted raw file buffer
 */
export const decryptBuffer = (buffer) => {
    try {
        if (buffer.length <= IV_LENGTH + TAG_LENGTH) return buffer;
        
        const iv = buffer.subarray(0, IV_LENGTH);
        const tag = buffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
        const ciphertext = buffer.subarray(IV_LENGTH + TAG_LENGTH);
        const key = getEncryptionKey();
        
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);
        
        return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    } catch (err) {
        console.error("Buffer GCM decryption failed:", err.message);
        return buffer;
    }
};

/**
 * Computes a standard SHA-256 state hash of any object or string.
 * Used for creating audit state records in the Cryptographic Ledger.
 * 
 * @param {object|string} state - State payload
 * @returns {string} - 64-character lowercase hex string
 */
export function computeStateHash(state) {
    const canonical = typeof state === "string" ? state : JSON.stringify(state || {});
    return crypto.createHash("sha256").update(canonical).digest("hex");
}
