import express from 'express';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

const router = express.Router();

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

/**
 * Phase 3: Zero-Trust File Upload Pipeline
 * Instead of receiving files on the backend (which is a DDoS/Malware risk),
 * we generate a time-limited AWS S3 Pre-signed URL. The frontend uploads
 * the file directly to S3, bypassing our API gateway entirely.
 */
router.post('/generate-presigned-url', async (req, res) => {
    try {
        const { fileName, fileType } = req.body;

        // Basic validation
        if (!fileName || !fileType) {
            return res.status(400).json({ error: 'fileName and fileType are required' });
        }

        // Generate a secure random prefix to prevent file overwrites and guessing
        const securePrefix = crypto.randomBytes(16).toString('hex');
        const s3Key = `uploads/${securePrefix}-${fileName}`;

        const command = new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME || 'suvidha-uploads-quarantine',
            Key: s3Key,
            ContentType: fileType,
        });

        // The URL expires in 5 minutes
        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

        res.json({
            success: true,
            uploadUrl,
            s3Key,
            message: 'Upload file directly to the provided URL using a PUT request.'
        });
    } catch (error) {
        console.error("Presigned URL Error:", error);
        res.status(500).json({ error: 'Failed to generate upload URL' });
    }
});

export default router;
