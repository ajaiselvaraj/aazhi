// ═══════════════════════════════════════════════════════════════
// Anonymous Civic Whistleblower Controller - Government-Grade
// ═══════════════════════════════════════════════════════════════

import { pool } from "../config/db.js";
import { success, fail, error as serverError } from "../utils/response.js";
import logger from "../utils/logger.js";
import { encrypt, decrypt } from "../utils/crypto.js";
import { stripJpegExif } from "../utils/exifStripper.js";
import { scanFileBuffer } from "../utils/malwareScanner.js";
import { logIntegrityAudit } from "../utils/auditChain.js";
import { uploadEvidence, downloadEvidenceFile, deleteEvidenceFile } from "../services/storage.service.js";
import crypto from "crypto";
import cron from "node-cron";

// Helper: Generates a 16-character cryptographically secure base32 case code (CIV-XXXX-XXXX-XXXX)
function createCaseCode() {
    const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // Unambiguous base32
    const buffer = crypto.randomBytes(12);
    let parts = ["CIV"];
    for (let block = 0; block < 3; block++) {
        let str = "";
        for (let i = 0; i < 4; i++) {
            str += chars[buffer[block * 4 + i] % chars.length];
        }
        parts.push(str);
    }
    return parts.join("-");
}

// Helper: Computes a privacy-preserving SHA-256 client fingerprint using a rotating daily salt
function getClientFingerprint(req) {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    const dailyDate = new Date().toISOString().substring(0, 10); // rotates daily (UTC)
    const secretKey = process.env.INTEGRITY_ENCRYPTION_KEY || process.env.JWT_SECRET || "rotating_salt_base_key";
    
    // Rotating salt
    const dailySalt = crypto.createHash("sha256").update(secretKey + dailyDate).digest("hex");
    
    // Hash IP with daily salt
    return crypto.createHash("sha256").update(ip + dailySalt).digest("hex");
}

// CAPTCHA helper functions
const globalCaptchaFailures = new Map();

function createCaptcha() {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const answer = num1 + num2;
    const question = `What is ${num1} + ${num2}?`;
    
    const expiry = Date.now() + 5 * 60 * 1000; // 5 minutes validity
    const captchaId = encrypt(`${answer}:${expiry}`);
    
    return { captchaId, question };
}

function verifyCaptcha(captchaId, answer) {
    try {
        const decrypted = decrypt(captchaId);
        if (decrypted === "[Decryption Failed - Tamper Detected]" || decrypted === "[Decryption Failed]" || !decrypted) {
            return { valid: false, message: "Invalid CAPTCHA token." };
        }
        
        const [correctAnswer, expiry] = decrypted.split(":");
        if (Date.now() > parseInt(expiry, 10)) {
            return { valid: false, message: "CAPTCHA expired. Please try again." };
        }
        
        if (parseInt(answer, 10) !== parseInt(correctAnswer, 10)) {
            return { valid: false, message: "Incorrect CAPTCHA answer." };
        }
        
        return { valid: true };
    } catch (err) {
        return { valid: false, message: "CAPTCHA validation error." };
    }
}

/**
 * Public: Fetch a new mathematical CAPTCHA challenge
 * Route: GET /api/integrity/captcha
 */
export const getCaptcha = async (req, res) => {
    try {
        const captcha = createCaptcha();
        return success(res, "CAPTCHA generated successfully", captcha, 200);
    } catch (error) {
        logger.error(`[Integrity Controller] Captcha generation error: ${error.message}`);
        return serverError(res, "Failed to generate CAPTCHA.", 500);
    }
};

/**
 * Public: Submit a new anonymous whistleblower report
 * Route: POST /api/integrity/report
 */
export const lodgeReport = async (req, res) => {
    try {
        const {
            category,
            description,
            location,
            incidentDate,
            captchaId,
            captchaAnswer,
            mediaFiles
        } = req.body;

        // 1. Basic validation
        if (!category || !description) {
            return fail(res, "Incident category and description are required.", 400);
        }

        if (!captchaId || !captchaAnswer) {
            return fail(res, "CAPTCHA answers are required.", 400);
        }

        // 2. Validate CAPTCHA
        const captchaCheck = verifyCaptcha(captchaId, captchaAnswer);
        if (!captchaCheck.valid) {
            const fingerprint = getClientFingerprint(req);
            const failKey = `captcha:${fingerprint}`;
            const currentFails = (globalCaptchaFailures.get(failKey) || 0) + 1;
            globalCaptchaFailures.set(failKey, currentFails);
            
            if (currentFails >= 5) {
                logger.warn(`[Integrity Monitoring] Repeated CAPTCHA failures from fingerprint: ${fingerprint}`);
                await logIntegrityAudit(
                    null,
                    "anonymous",
                    crypto.randomUUID(),
                    "SECURITY_EVENT",
                    req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1",
                    req.headers["user-agent"] || "Kiosk",
                    null,
                    { event: "REPEATED_CAPTCHA_FAILURES", attempts: currentFails },
                    { message: "Abuse detection: Client failed CAPTCHA multiple times." }
                );
                globalCaptchaFailures.set(failKey, 0); // Reset trigger
            }
            return fail(res, captchaCheck.message, 400);
        }

        // 3. Rate limiting and IP Fingerprint Abuse Protection (Max 5 reports/hour)
        const fingerprint = getClientFingerprint(req);
        const rateSql = `
            SELECT COUNT(*) 
            FROM anonymous_integrity_reports 
            WHERE hashed_client_fingerprint = $1 
              AND created_at >= NOW() - INTERVAL '1 hour'
        `;
        const rateCheck = await pool.query(rateSql, [fingerprint]);
        const reportsInPastHour = parseInt(rateCheck.rows[0].count, 10);
        const hourlyLimit = parseInt(process.env.INTEGRITY_MAX_REPORTS_PER_HOUR || "5", 10);
        
        if (reportsInPastHour >= hourlyLimit) {
            logger.warn(`[Integrity Monitoring] Velocity limit exceeded for client fingerprint ${fingerprint}`);
            await logIntegrityAudit(
                null,
                "anonymous",
                crypto.randomUUID(),
                "SECURITY_EVENT",
                req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1",
                req.headers["user-agent"] || "Kiosk",
                null,
                { event: "EXCESSIVE_SUBMISSIONS", fingerprint, count: reportsInPastHour },
                { message: `Abuse prevention: Fingerprint hit hourly submission cap.` }
            );
            return fail(res, `Abuse Prevention: Maximum of ${hourlyLimit} submissions per hour allowed.`, 429);
        }

        // 4. Process uploads securely via encrypted storage service
        const savedMediaFiles = [];
        if (mediaFiles && Array.isArray(mediaFiles)) {
            for (const file of mediaFiles) {
                const { filename, mimetype, data } = file;
                if (!filename || !mimetype || !data) continue;

                // Decode base64
                const fileBuffer = Buffer.from(data, "base64");

                // Validate size (max 5MB)
                const fileSizeMB = fileBuffer.length / (1024 * 1024);
                if (fileSizeMB > 5) {
                    return fail(res, `File "${filename}" exceeds 5MB size limit.`, 400);
                }

                // Malware scanner
                const scan = scanFileBuffer(fileBuffer, mimetype, filename);
                if (!scan.safe) {
                    logger.warn(`[Integrity Monitoring] Malware scan block for file: ${filename}`);
                    await logIntegrityAudit(
                        null,
                        "anonymous",
                        crypto.randomUUID(),
                        "SECURITY_EVENT",
                        req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1",
                        req.headers["user-agent"] || "Kiosk",
                        null,
                        { event: "MALWARE_DETECTION", filename, reason: scan.reason },
                        { message: `Blocked file containing potential script or invalid headers.` }
                    );
                    return fail(res, `Security Block: ${scan.reason}`, 400);
                }

                // Image EXIF stripping
                let sanitizedBuffer = fileBuffer;
                if (mimetype.startsWith("image/")) {
                    sanitizedBuffer = stripJpegExif(fileBuffer);
                }

                // Upload to object storage (which handles GCM encryption, checksums, and hashes)
                const uploadMeta = await uploadEvidence(sanitizedBuffer, filename, mimetype);
                savedMediaFiles.push(uploadMeta);
            }
        }

        // 5. Generate globally unique 16-character Case Code (CIV-XXXX-XXXX-XXXX)
        let caseCode = "";
        let attempts = 0;
        while (attempts < 10) {
            caseCode = createCaseCode();
            const check = await pool.query("SELECT id FROM anonymous_integrity_reports WHERE anonymous_case_code = $1", [caseCode]);
            if (check.rows.length === 0) break;
            attempts++;
        }

        // 6. Encrypt sensitive fields using GCM
        const encryptedDescription = encrypt(description);
        const encryptedLocation = location ? encrypt(location) : null;
        
        // Setup initial audit log
        const initialAudit = [{
            action: "Report lodged anonymously.",
            officer: "System",
            timestamp: new Date().toISOString()
        }];

        // 7. Save report to database (including fingerprint for 24-hr abuse check)
        const insertSql = `
            INSERT INTO anonymous_integrity_reports (
                anonymous_case_code,
                category,
                description,
                location,
                incident_date,
                media_files,
                status,
                audit_log,
                hashed_client_fingerprint
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, created_at
        `;

        const params = [
            caseCode,
            category,
            encryptedDescription,
            encryptedLocation,
            incidentDate || null,
            JSON.stringify(savedMediaFiles),
            "Submitted",
            JSON.stringify(initialAudit),
            fingerprint
        ];

        const result = await pool.query(insertSql, params);
        const newReport = result.rows[0];

        // 8. Write to tamper-evident ledger (cryptographic audit chain)
        const userAgent = req.headers["user-agent"] || "Kiosk";
        const finalState = {
            id: newReport.id,
            anonymous_case_code: caseCode,
            category,
            status: "Submitted",
            media_files: savedMediaFiles
        };

        await logIntegrityAudit(
            null,
            "anonymous",
            newReport.id,
            "CREATE",
            req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1",
            userAgent,
            null,
            finalState,
            { action: "Anonymous submission lodged." }
        );

        logger.info(`[Integrity Controller] Anonymous report submitted successfully. Case code: ${caseCode}`);

        return success(res, "Your anonymous report has been securely submitted.", {
            caseCode
        }, 201);

    } catch (error) {
        logger.error(`[Integrity Controller] Submission error: ${error.message}`);
        return serverError(res, "Failed to submit anonymous report.", 500);
    }
};

/**
 * Public: Track progress using Case Code
 * Route: GET /api/integrity/track/:caseCode
 */
export const trackReport = async (req, res) => {
    try {
        const { caseCode } = req.params;
        if (!caseCode) {
            return fail(res, "Case code is required.", 400);
        }

        const sql = `
            SELECT category, status, created_at
            FROM anonymous_integrity_reports
            WHERE anonymous_case_code = $1
            LIMIT 1
        `;

        const result = await pool.query(sql, [caseCode.trim()]);
        if (result.rows.length === 0) {
            return fail(res, "No anonymous report found matching this case code.", 404);
        }

        // Return strictly category, status, and created_at. NO details or notes!
        return success(res, "Case code status retrieved.", result.rows[0], 200);
    } catch (error) {
        logger.error(`[Integrity Controller] Public tracking error: ${error.message}`);
        return serverError(res, "Failed to track anonymous report status.", 500);
    }
};

/**
 * Integrity Officer: Get queue of all reports (decrypted)
 * Route: GET /api/integrity/reports
 */
export const getReports = async (req, res) => {
    try {
        // Enforce role check
        if (req.user.role !== "integrity_officer") {
            return fail(res, "Forbidden. Integrity Officer role required.", 403);
        }

        const sql = `
            SELECT id, anonymous_case_code, category, description, location, incident_date, media_files, created_at, status, integrity_notes, assigned_officer, audit_log
            FROM anonymous_integrity_reports
            ORDER BY created_at DESC
        `;

        const result = await pool.query(sql);

        // Decrypt text fields for administrative view
        const reports = result.rows.map(r => {
            return {
                ...r,
                description: decrypt(r.description),
                location: r.location ? decrypt(r.location) : null,
                integrity_notes: r.integrity_notes ? decrypt(r.integrity_notes) : null
            };
        });

        return success(res, "Integrity reports queue retrieved.", reports, 200);
    } catch (error) {
        logger.error(`[Integrity Controller] Get reports queue error: ${error.message}`);
        return serverError(res, "Failed to retrieve reports queue.", 500);
    }
};

/**
 * Integrity Officer: Update report status
 * Route: PUT /api/integrity/reports/:id/status
 */
export const updateStatus = async (req, res) => {
    try {
        if (req.user.role !== "integrity_officer") {
            return fail(res, "Forbidden. Integrity Officer role required.", 403);
        }

        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return fail(res, "New status is required.", 400);
        }

        // 1. Fetch current record state
        const getSql = `SELECT * FROM anonymous_integrity_reports WHERE id = $1`;
        const checkResult = await pool.query(getSql, [id]);
        if (checkResult.rows.length === 0) {
            return fail(res, "Report not found.", 404);
        }

        const currentReport = checkResult.rows[0];
        const prevAuditLog = Array.isArray(currentReport.audit_log) ? currentReport.audit_log : [];

        // 2. Prepare updated audit log array
        const updatedAuditLog = [
            ...prevAuditLog,
            {
                action: `Status updated from ${currentReport.status} to ${status}.`,
                officer: req.user.name || "Integrity Officer",
                timestamp: new Date().toISOString()
            }
        ];

        // 3. Update database
        const updateSql = `
            UPDATE anonymous_integrity_reports
            SET status = $1,
                audit_log = $2,
                updated_at = NOW()
            WHERE id = $3
            RETURNING *
        `;

        const result = await pool.query(updateSql, [status, JSON.stringify(updatedAuditLog), id]);
        const updatedReport = result.rows[0];

        // 4. Write to tamper-evident ledger (cryptographic audit chain)
        const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
        const userAgent = req.headers["user-agent"] || "AdminPortal";
        
        await logIntegrityAudit(
            req.user.id,
            req.user.role,
            id,
            "STATUS_CHANGE",
            ip,
            userAgent,
            { id, status: currentReport.status },
            { id, status: updatedReport.status },
            { action: `Status updated to ${status}` }
        );

        return success(res, "Report status updated successfully.", {
            id,
            status: updatedReport.status,
            audit_log: updatedAuditLog
        }, 200);

    } catch (error) {
        logger.error(`[Integrity Controller] Update status error: ${error.message}`);
        return serverError(res, "Failed to update status.", 500);
    }
};

/**
 * Integrity Officer: Update notes and assign officer
 * Route: PUT /api/integrity/reports/:id/notes
 */
export const updateNotes = async (req, res) => {
    try {
        if (req.user.role !== "integrity_officer") {
            return fail(res, "Forbidden. Integrity Officer role required.", 403);
        }

        const { id } = req.params;
        const { notes, assignedOfficer } = req.body;

        // Fetch current record state
        const getSql = `SELECT * FROM anonymous_integrity_reports WHERE id = $1`;
        const checkResult = await pool.query(getSql, [id]);
        if (checkResult.rows.length === 0) {
            return fail(res, "Report not found.", 404);
        }

        const currentReport = checkResult.rows[0];
        const prevAuditLog = Array.isArray(currentReport.audit_log) ? currentReport.audit_log : [];

        // Encrypt notes
        const encryptedNotes = notes ? encrypt(notes) : currentReport.integrity_notes;

        // Build status messages for record audit_log
        const auditEntries = [];
        if (notes && notes !== decrypt(currentReport.integrity_notes)) {
            auditEntries.push({
                action: "Investigation notes updated.",
                officer: req.user.name || "Integrity Officer",
                timestamp: new Date().toISOString()
            });
        }
        if (assignedOfficer && assignedOfficer !== currentReport.assigned_officer) {
            auditEntries.push({
                action: `Assigned officer updated to ${assignedOfficer}.`,
                officer: req.user.name || "Integrity Officer",
                timestamp: new Date().toISOString()
            });
        }

        const updatedAuditLog = [...prevAuditLog, ...auditEntries];

        const updateSql = `
            UPDATE anonymous_integrity_reports
            SET integrity_notes = $1,
                assigned_officer = COALESCE($2, assigned_officer),
                audit_log = $3,
                updated_at = NOW()
            WHERE id = $4
            RETURNING *
        `;

        const result = await pool.query(updateSql, [encryptedNotes, assignedOfficer || currentReport.assigned_officer, JSON.stringify(updatedAuditLog), id]);
        const updatedReport = result.rows[0];

        // Cryptographic audit chain logging
        const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
        const userAgent = req.headers["user-agent"] || "AdminPortal";
        
        await logIntegrityAudit(
            req.user.id,
            req.user.role,
            id,
            "DATA_EDIT",
            ip,
            userAgent,
            { id, assigned_officer: currentReport.assigned_officer },
            { id, assigned_officer: updatedReport.assigned_officer },
            { action: "Investigation notes or assignment updated." }
        );

        return success(res, "Report notes and assignment updated.", {
            id,
            assignedOfficer: updatedReport.assigned_officer,
            notes: decrypt(updatedReport.integrity_notes),
            audit_log: updatedAuditLog
        }, 200);

    } catch (error) {
        logger.error(`[Integrity Controller] Update notes error: ${error.message}`);
        return serverError(res, "Failed to update investigation notes.", 500);
    }
};

// Keep track of download timestamps per officer for velocity monitoring
const globalDownloadTracking = new Map();

/**
 * Integrity Officer: Download and decrypt evidence attachment on-the-fly
 * Route: GET /api/integrity/reports/:id/evidence/:fileId
 */
export const downloadEvidence = async (req, res) => {
    try {
        if (req.user.role !== "integrity_officer") {
            return fail(res, "Forbidden. Integrity Officer role required.", 403);
        }

        const { id, fileId } = req.params;

        // Fetch report
        const checkSql = `SELECT media_files FROM anonymous_integrity_reports WHERE id = $1`;
        const result = await pool.query(checkSql, [id]);
        if (result.rows.length === 0) {
            return fail(res, "Integrity report not found.", 404);
        }

        const files = result.rows[0].media_files || [];
        const fileMetadata = files.find(f => f.id === fileId);

        if (!fileMetadata) {
            return fail(res, "Requested file attachment not found on this report.", 404);
        }

        // 1. Download & Decrypt evidence buffer via the Storage Service
        const decryptedBuffer = await downloadEvidenceFile(fileMetadata.storage_key, fileId);

        // 2. Velocity monitoring: check download rate per officer (limit e.g. 5 downloads per minute)
        const officerId = req.user.id;
        const now = Date.now();
        const downloads = globalDownloadTracking.get(officerId) || [];
        const recentDownloads = downloads.filter(t => now - t < 60 * 1000);
        recentDownloads.push(now);
        globalDownloadTracking.set(officerId, recentDownloads);

        if (recentDownloads.length > 5) {
            logger.warn(`[Integrity Monitoring] Velocity spike: ${recentDownloads.length} downloads by officer ${officerId}`);
            await logIntegrityAudit(
                officerId,
                req.user.role,
                id,
                "SECURITY_EVENT",
                req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1",
                req.headers["user-agent"] || "AdminPortal",
                null,
                { event: "DOWNLOAD_SPIKE", officerId, count: recentDownloads.length },
                { message: `Download spike detected: Officer triggered velocity check.` }
            );
        }

        // 3. Log chain of custody download event
        const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
        const userAgent = req.headers["user-agent"] || "AdminPortal";
        await logIntegrityAudit(
            officerId,
            req.user.role,
            id,
            "EXPORT",
            ip,
            userAgent,
            null,
            { fileId, filename: fileMetadata.filename },
            { action: "Evidence downloaded.", fileId, filename: fileMetadata.filename }
        );

        // 4. Send decrypted file to browser
        res.setHeader("Content-Type", fileMetadata.mimetype);
        res.setHeader("Content-Disposition", `attachment; filename="${fileMetadata.filename}"`);
        res.setHeader("Content-Length", decryptedBuffer.length);
        
        return res.end(decryptedBuffer);

    } catch (error) {
        logger.error(`[Integrity Controller] Evidence download error: ${error.message}`);
        return serverError(res, "Failed to download and decrypt evidence file.", 500);
    }
};

/**
 * Integrity Officer: Get metrics for Integrity Dashboard
 * Route: GET /api/integrity/metrics
 */
export const getMetrics = async (req, res) => {
    try {
        if (req.user.role !== "integrity_officer") {
            return fail(res, "Forbidden. Integrity Officer role required.", 403);
        }

        // Gather metrics
        const totalSql = `SELECT COUNT(*) FROM anonymous_integrity_reports`;
        const statusSql = `
            SELECT status, COUNT(*)
            FROM anonymous_integrity_reports
            GROUP BY status
        `;
        const categorySql = `
            SELECT category, COUNT(*)
            FROM anonymous_integrity_reports
            GROUP BY category
        `;
        const monthlySql = `
            SELECT TO_CHAR(created_at, 'Mon') as month, COUNT(*) as count
            FROM anonymous_integrity_reports
            WHERE created_at >= NOW() - INTERVAL '6 months'
            GROUP BY TO_CHAR(created_at, 'Mon'), DATE_TRUNC('month', created_at)
            ORDER BY DATE_TRUNC('month', created_at)
        `;

        const [totalRes, statusRes, catRes, monthlyRes] = await Promise.all([
            pool.query(totalSql),
            pool.query(statusSql),
            pool.query(categorySql),
            pool.query(monthlySql)
        ]);

        const total = parseInt(totalRes.rows[0].count, 10);
        
        // Map status counts
        const statusCounts = {
            "Submitted": 0,
            "Under Review": 0,
            "Evidence Verification": 0,
            "Investigation Started": 0,
            "Action Initiated": 0,
            "Closed": 0
        };
        statusRes.rows.forEach(r => {
            statusCounts[r.status] = parseInt(r.count, 10);
        });

        // Map category distribution
        const categoryDistribution = catRes.rows.map(r => ({
            name: r.category,
            value: parseInt(r.count, 10)
        }));

        // Map monthly trends
        const monthlyTrends = monthlyRes.rows.map(r => ({
            name: r.month,
            reports: parseInt(r.count, 10)
        }));

        return success(res, "Integrity metrics loaded.", {
            totalReports: total,
            statusCounts,
            categoryDistribution,
            monthlyTrends
        }, 200);

    } catch (error) {
        logger.error(`[Integrity Controller] Get metrics error: ${error.message}`);
        return serverError(res, "Failed to load integrity metrics.", 500);
    }
};

/**
 * Integrity Officer: Fetch decrypted conversation history
 * Route: GET /api/integrity/reports/:id/messages
 */
export const getOfficerMessages = async (req, res) => {
    try {
        if (req.user.role !== "integrity_officer") {
            return fail(res, "Forbidden. Integrity Officer role required.", 403);
        }
        const { id } = req.params;
        
        // Confirm report exists
        const check = await pool.query("SELECT id FROM anonymous_integrity_reports WHERE id = $1", [id]);
        if (check.rows.length === 0) {
            return fail(res, "Report not found.", 404);
        }

        const messagesRes = await pool.query(
            "SELECT id, sender_type, message, created_at FROM integrity_case_messages WHERE case_id = $1 ORDER BY created_at ASC",
            [id]
        );

        const messages = messagesRes.rows.map(m => ({
            id: m.id,
            sender_type: m.sender_type,
            message: decrypt(m.message),
            created_at: m.created_at
        }));

        // Log audit event for Accessing messages
        const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
        const userAgent = req.headers["user-agent"] || "AdminPortal";
        await logIntegrityAudit(
            req.user.id,
            req.user.role,
            id,
            "EXPORT",
            ip,
            userAgent,
            null,
            { event: "ACCESS_MESSAGES" },
            { action: "Officer accessed message history." }
        );

        return success(res, "Messages retrieved successfully.", messages, 200);
    } catch (error) {
        logger.error(`[Integrity Controller] Get officer messages error: ${error.message}`);
        return serverError(res, "Failed to retrieve messages.", 500);
    }
};

/**
 * Integrity Officer: Post clarification request message
 * Route: POST /api/integrity/reports/:id/messages
 */
export const postOfficerMessage = async (req, res) => {
    try {
        if (req.user.role !== "integrity_officer") {
            return fail(res, "Forbidden. Integrity Officer role required.", 403);
        }
        const { id } = req.params;
        const { message } = req.body;

        if (!message || message.trim() === "") {
            return fail(res, "Message content is required.", 400);
        }

        // Confirm report exists
        const check = await pool.query("SELECT id FROM anonymous_integrity_reports WHERE id = $1", [id]);
        if (check.rows.length === 0) {
            return fail(res, "Report not found.", 404);
        }

        const encryptedMsg = encrypt(message.trim());

        const insertRes = await pool.query(
            `INSERT INTO integrity_case_messages (case_id, sender_type, message)
             VALUES ($1, 'officer', $2)
             RETURNING id, sender_type, created_at`,
            [id, encryptedMsg]
        );

        const newMsg = insertRes.rows[0];

        // Audit the messaging event
        const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
        const userAgent = req.headers["user-agent"] || "AdminPortal";
        await logIntegrityAudit(
            req.user.id,
            req.user.role,
            id,
            "DATA_EDIT",
            ip,
            userAgent,
            null,
            { event: "SEND_MESSAGE", messageId: newMsg.id },
            { action: "Officer posted message." }
        );

        return success(res, "Message posted successfully.", {
            id: newMsg.id,
            sender_type: newMsg.sender_type,
            message: message.trim(),
            created_at: newMsg.created_at
        }, 201);
    } catch (error) {
        logger.error(`[Integrity Controller] Post officer message error: ${error.message}`);
        return serverError(res, "Failed to post message.", 500);
    }
};

/**
 * Citizen: Fetch decrypted conversation history using case code
 * Route: GET /api/integrity/track/:caseCode/messages
 */
export const getCitizenMessages = async (req, res) => {
    try {
        const { caseCode } = req.params;
        if (!caseCode) {
            return fail(res, "Case code is required.", 400);
        }

        // Confirm report exists by case code
        const reportRes = await pool.query(
            "SELECT id FROM anonymous_integrity_reports WHERE anonymous_case_code = $1 LIMIT 1",
            [caseCode.trim()]
        );
        if (reportRes.rows.length === 0) {
            return fail(res, "No report found matching this case code.", 404);
        }

        const caseId = reportRes.rows[0].id;

        const messagesRes = await pool.query(
            "SELECT id, sender_type, message, created_at FROM integrity_case_messages WHERE case_id = $1 ORDER BY created_at ASC",
            [caseId]
        );

        const messages = messagesRes.rows.map(m => ({
            id: m.id,
            sender_type: m.sender_type,
            message: decrypt(m.message),
            created_at: m.created_at
        }));

        // Log audit event for citizen accessing messages
        const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
        const userAgent = req.headers["user-agent"] || "Kiosk";
        await logIntegrityAudit(
            null,
            "anonymous",
            caseId,
            "EXPORT",
            ip,
            userAgent,
            null,
            { event: "CITIZEN_ACCESS_MESSAGES", caseCode },
            { action: "Citizen tracked message history." }
        );

        return success(res, "Messages retrieved successfully.", messages, 200);
    } catch (error) {
        logger.error(`[Integrity Controller] Get citizen messages error: ${error.message}`);
        return serverError(res, "Failed to retrieve messages.", 500);
    }
};

/**
 * Citizen: Post clarifying reply using case code
 * Route: POST /api/integrity/track/:caseCode/messages
 */
export const postCitizenMessage = async (req, res) => {
    try {
        const { caseCode } = req.params;
        const { message } = req.body;

        if (!caseCode) {
            return fail(res, "Case code is required.", 400);
        }
        if (!message || message.trim() === "") {
            return fail(res, "Message content is required.", 400);
        }

        // Confirm report exists by case code
        const reportRes = await pool.query(
            "SELECT id FROM anonymous_integrity_reports WHERE anonymous_case_code = $1 LIMIT 1",
            [caseCode.trim()]
        );
        if (reportRes.rows.length === 0) {
            return fail(res, "No report found matching this case code.", 404);
        }

        const caseId = reportRes.rows[0].id;
        const encryptedMsg = encrypt(message.trim());

        const insertRes = await pool.query(
            `INSERT INTO integrity_case_messages (case_id, sender_type, message)
             VALUES ($1, 'citizen', $2)
             RETURNING id, sender_type, created_at`,
            [caseId, encryptedMsg]
        );

        const newMsg = insertRes.rows[0];

        // Audit the messaging event
        const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
        const userAgent = req.headers["user-agent"] || "Kiosk";
        await logIntegrityAudit(
            null,
            "anonymous",
            caseId,
            "DATA_EDIT",
            ip,
            userAgent,
            null,
            { event: "CITIZEN_SEND_MESSAGE", messageId: newMsg.id, caseCode },
            { action: "Citizen posted message." }
        );

        return success(res, "Message posted successfully.", {
            id: newMsg.id,
            sender_type: newMsg.sender_type,
            message: message.trim(),
            created_at: newMsg.created_at
        }, 201);
    } catch (error) {
        logger.error(`[Integrity Controller] Post citizen message error: ${error.message}`);
        return serverError(res, "Failed to post message.", 500);
    }
};

// ═══════════════════════════════════════════════════════════════
// BACKGROUND CRON JOBS — Security and Compliance Purging
// ═══════════════════════════════════════════════════════════════

// 1. Hourly IP Fingerprint Purge: Wipes hashed_client_fingerprint columns after 24 hours
cron.schedule("0 * * * *", async () => {
    try {
        logger.info("📡 [Cron Job] Running hourly fingerprint cleanup...");
        const sql = `
            UPDATE anonymous_integrity_reports
            SET hashed_client_fingerprint = NULL
            WHERE created_at < NOW() - INTERVAL '24 hours'
              AND hashed_client_fingerprint IS NOT NULL
        `;
        const res = await pool.query(sql);
        if (res.rowCount > 0) {
            logger.info(`🧹 [Cron Job] Wiped fingerprints for ${res.rowCount} reports.`);
        }
    } catch (err) {
        logger.error(`❌ [Cron Job Error] Hourly fingerprint purge failed: ${err.message}`);
    }
});

// 2. Daily Retention Purge: Deletes reports & storage items older than INTEGRITY_RETENTION_YEARS (Default: 7)
// Runs daily at 01:00 AM UTC
cron.schedule("0 1 * * *", async () => {
    try {
        const retentionYears = parseInt(process.env.INTEGRITY_RETENTION_YEARS || "7", 10);
        logger.info(`📡 [Cron Job] Running daily retention purge (Retention: ${retentionYears} years)...`);

        const cutoffDate = new Date();
        cutoffDate.setFullYear(cutoffDate.getFullYear() - retentionYears);

        // Fetch reports older than cutoff that aren't flagged as legal_hold
        const fetchSql = `
            SELECT id, media_files
            FROM anonymous_integrity_reports
            WHERE created_at < $1
              AND legal_hold = FALSE
        `;
        const res = await pool.query(fetchSql, [cutoffDate]);
        if (res.rows.length === 0) {
            logger.info("🧹 [Cron Job] No reports exceed the compliance retention period.");
            return;
        }

        const idsToDelete = res.rows.map(r => r.id);
        
        // Purge files from S3/local-fallback
        for (const report of res.rows) {
            const files = report.media_files || [];
            for (const file of files) {
                if (file.storage_key && file.file_id) {
                    await deleteEvidenceFile(file.storage_key, file.file_id);
                }
            }
        }

        // Delete reports from database (message records cascade delete)
        const deleteSql = `
            DELETE FROM anonymous_integrity_reports
            WHERE id = ANY($1::UUID[])
        `;
        await pool.query(deleteSql, [idsToDelete]);
        logger.info(`🧹 [Cron Job] Retention purge complete. Deleted ${idsToDelete.length} reports and associated media.`);
    } catch (err) {
        logger.error(`❌ [Cron Job Error] Daily retention purge failed: ${err.message}`);
    }
});
