// ═══════════════════════════════════════════════════════════════
// Secure Object Storage Service (S3/MinIO compatible with GCM & Local Fallback)
// ═══════════════════════════════════════════════════════════════

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { encryptBuffer, decryptBuffer } from "../utils/crypto.js";
import logger from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fallback directory path
const UPLOADS_DIR = path.resolve(__dirname, "..", "uploads", "integrity");
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Check S3 availability
const isS3Configured = !!(
    process.env.INTEGRITY_S3_ACCESS_KEY &&
    process.env.INTEGRITY_S3_SECRET_KEY &&
    process.env.INTEGRITY_S3_BUCKET
);

let s3Client = null;

if (isS3Configured) {
    const s3Config = {
        credentials: {
            accessKeyId: process.env.INTEGRITY_S3_ACCESS_KEY,
            secretAccessKey: process.env.INTEGRITY_S3_SECRET_KEY,
        },
        region: process.env.INTEGRITY_S3_REGION || "us-east-1",
    };

    if (process.env.INTEGRITY_S3_ENDPOINT) {
        s3Config.endpoint = process.env.INTEGRITY_S3_ENDPOINT;
        s3Config.forcePathStyle = true; // Required for MinIO
    }

    s3Client = new S3Client(s3Config);
    logger.info("📡 [Storage Service] Secure S3/MinIO Client initialized.");
} else {
    logger.warn("⚠️  [Storage Service] S3 credentials missing. Falling back to local secure uploads directory.");
}

/**
 * Encrypts and uploads a file buffer to storage.
 * Computes both the checksum (of the encrypted buffer) and the evidence hash (of the original buffer).
 * 
 * @param {Buffer} rawBuffer - Unencrypted file buffer
 * @param {string} filename - Original filename
 * @param {string} mimetype - Content type of the file
 * @returns {Promise<object>} - Upload metadata: { file_id, storage_key, checksum, evidence_hash, encrypted_key_reference }
 */
export const uploadEvidence = async (rawBuffer, filename, mimetype) => {
    try {
        const fileId = crypto.randomUUID();
        const storageKey = `integrity/evidence/${fileId}.enc`;

        // 1. Compute original file SHA-256 evidence hash (for chain of custody)
        const evidenceHash = crypto.createHash("sha256").update(rawBuffer).digest("hex");

        // 2. Encrypt buffer using AES-256-GCM
        const encryptedBuffer = encryptBuffer(rawBuffer);

        // 3. Compute encrypted file SHA-256 checksum (for tamper check)
        const checksum = crypto.createHash("sha256").update(encryptedBuffer).digest("hex");

        // 4. Storing key reference: we can store GCM indicator or a salt indicator
        const encryptedKeyReference = "aes-256-gcm-system-key";

        if (isS3Configured) {
            // S3/MinIO Upload
            const bucket = process.env.INTEGRITY_S3_BUCKET;
            const command = new PutObjectCommand({
                Bucket: bucket,
                Key: storageKey,
                Body: encryptedBuffer,
                ContentType: mimetype,
                Metadata: {
                    fileId,
                    checksum,
                    evidenceHash,
                }
            });
            await s3Client.send(command);
            logger.info(`🔒 [Storage Service] Uploaded ${filename} to S3 bucket ${bucket}. Key: ${storageKey}`);
        } else {
            // Local Secure Storage Fallback
            const filePath = path.join(UPLOADS_DIR, `${fileId}.enc`);
            fs.writeFileSync(filePath, encryptedBuffer);
            logger.info(`🔒 [Storage Service] Local fallback: Saved ${filename} to disk. Path: ${filePath}`);
        }

        return {
            file_id: fileId,
            filename: path.basename(filename),
            mimetype,
            size: rawBuffer.length,
            storage_key: storageKey,
            checksum,
            evidence_hash: evidenceHash,
            encrypted_key_reference: encryptedKeyReference,
        };
    } catch (err) {
        logger.error(`❌ [Storage Service] Upload failed: ${err.message}`);
        throw new Error("Failed to process and upload evidence file securely.");
    }
};

/**
 * Downloads and decrypts a file buffer from storage using the storage key.
 * 
 * @param {string} storageKey - Unique storage path/key of the file
 * @param {string} fileId - The original UUID file ID (used as disk filename in fallback)
 * @returns {Promise<Buffer>} - Decrypted raw file buffer
 */
export const downloadEvidenceFile = async (storageKey, fileId) => {
    try {
        let encryptedBuffer;

        if (isS3Configured) {
            // S3 Download
            const bucket = process.env.INTEGRITY_S3_BUCKET;
            const command = new GetObjectCommand({
                Bucket: bucket,
                Key: storageKey
            });
            const response = await s3Client.send(command);
            
            // Convert stream to Buffer
            const chunks = [];
            for await (const chunk of response.Body) {
                chunks.push(chunk);
            }
            encryptedBuffer = Buffer.concat(chunks);
        } else {
            // Local Storage fallback
            const filePath = path.join(UPLOADS_DIR, `${fileId}.enc`);
            if (!fs.existsSync(filePath)) {
                throw new Error(`Physical file not found at ${filePath}`);
            }
            encryptedBuffer = fs.readFileSync(filePath);
        }

        // Decrypt AES-256-GCM buffer on the fly
        const decryptedBuffer = decryptBuffer(encryptedBuffer);
        return decryptedBuffer;
    } catch (err) {
        logger.error(`❌ [Storage Service] Download/Decrypt failed: ${err.message}`);
        throw new Error("Failed to download and decrypt evidence file.");
    }
};

/**
 * Deletes a file from storage.
 * 
 * @param {string} storageKey - Unique storage key
 * @param {string} fileId - The original UUID file ID
 */
export const deleteEvidenceFile = async (storageKey, fileId) => {
    try {
        if (isS3Configured) {
            const command = new DeleteObjectCommand({
                Bucket: process.env.INTEGRITY_S3_BUCKET,
                Key: storageKey
            });
            await s3Client.send(command);
            logger.info(`🗑️ [Storage Service] Deleted S3 object: ${storageKey}`);
        } else {
            const filePath = path.join(UPLOADS_DIR, `${fileId}.enc`);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                logger.info(`🗑️ [Storage Service] Deleted local fallback file: ${filePath}`);
            }
        }
    } catch (err) {
        logger.error(`❌ [Storage Service] Delete failed: ${err.message}`);
    }
};
