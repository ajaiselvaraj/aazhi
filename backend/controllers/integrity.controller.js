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
import { logSecurityIncident } from "../services/securityMonitoring.js";
import { getDisasterRecoveryStatus } from "../services/disasterRecovery.js";

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
            mediaFiles,
            retaliationRisk
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
                
                // Log security incident (Feature 4)
                await pool.query(`
                    INSERT INTO security_incidents (incident_type, severity, details)
                    VALUES ($1, $2, $3)
                `, ["CAPTCHA abuse", "Medium", JSON.stringify({ fingerprint, attempts: currentFails })]);

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
            
            // Log security incident (Feature 4)
            await pool.query(`
                INSERT INTO security_incidents (incident_type, severity, details)
                VALUES ($1, $2, $3)
            `, ["Unauthorized access attempts", "High", JSON.stringify({ event: "EXCESSIVE_SUBMISSIONS", fingerprint, count: reportsInPastHour })]);

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

        // Calculate risk scoring factors (Feature 5)
        const hasEvidence = savedMediaFiles.length > 0;
        const hasMultipleFiles = savedMediaFiles.length > 1;
        const hasRetaliation = !!retaliationRisk;

        const deptCheck = await pool.query(
            "SELECT COUNT(*) FROM anonymous_integrity_reports WHERE category = $1 AND created_at >= NOW() - INTERVAL '30 days'",
            [category]
        );
        const repeatCount = parseInt(deptCheck.rows[0].count, 10);

        let riskScore = 0;
        const normalizedCategory = (category || "").toLowerCase();
        if (normalizedCategory.includes("corruption") || normalizedCategory.includes("bribery") || normalizedCategory.includes("authority") || normalizedCategory.includes("misconduct")) {
            riskScore += 40;
        }
        if (normalizedCategory.includes("fraud") || normalizedCategory.includes("fake") || normalizedCategory.includes("financial") || normalizedCategory.includes("meter")) {
            riskScore += 35;
        }
        if (hasEvidence) riskScore += 15;
        if (hasMultipleFiles) riskScore += 10;
        if (repeatCount > 1) riskScore += 20;
        if (hasRetaliation) riskScore += 25; // Witness protection retaliation risk

        let riskLevel = "Low";
        if (riskScore <= 25) riskLevel = "Low";
        else if (riskScore <= 50) riskLevel = "Medium";
        else if (riskScore <= 75) riskLevel = "High";
        else riskLevel = "Critical";

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
                hashed_client_fingerprint,
                risk_score,
                risk_level,
                retaliation_risk
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
            fingerprint,
            riskScore,
            riskLevel,
            hasRetaliation
        ];

        const result = await pool.query(insertSql, params);
        const newReport = result.rows[0];
        const reportId = newReport.id;

        // Log to digital evidence chain of custody (Feature 3)
        for (const file of savedMediaFiles) {
            await pool.query(`
                INSERT INTO evidence_chain (evidence_id, report_id, action, checksum_after)
                VALUES ($1, $2, 'Upload', $3)
            `, [file.id, reportId, file.hash || null]);
        }

        // V4: Automatically execute AI Triage, Protection Index and Watchlist registration
        try {
            const { performAITriage } = await import("../services/triage.service.js");
            await performAITriage(
                reportId,
                category,
                description,
                location,
                savedMediaFiles.length > 0,
                retaliationRisk,
                fingerprint
            );
        } catch (triageErr) {
            logger.error(`[Integrity Controller] V4 Triage failed: ${triageErr.message}`);
        }

        // 8. Write to tamper-evident ledger (cryptographic audit chain)
        const userAgent = req.headers["user-agent"] || "Kiosk";
        const finalState = {
            id: reportId,
            anonymous_case_code: caseCode,
            category,
            status: "Submitted",
            media_files: savedMediaFiles
        };

        await logIntegrityAudit(
            null,
            "anonymous",
            reportId,
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
const trackingFailures = new Map(); // key: ip, value: { count, lockoutUntil }

export const trackReport = async (req, res) => {
    try {
        const { caseCode } = req.params;
        if (!caseCode) {
            return fail(res, "Case code is required.", 400);
        }

        const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
        const now = Date.now();
        const record = trackingFailures.get(ip) || { count: 0, lockoutUntil: 0 };

        if (record.lockoutUntil > now) {
            const cooldownMins = Math.ceil((record.lockoutUntil - now) / 60000);
            return fail(res, `Too many invalid tracking attempts. Please wait ${cooldownMins} minute(s) before trying again.`, 429);
        }

        const sql = `
            SELECT category, status, created_at
            FROM anonymous_integrity_reports
            WHERE anonymous_case_code = $1
            LIMIT 1
        `;

        const result = await pool.query(sql, [caseCode.trim()]);
        if (result.rows.length === 0) {
            record.count += 1;
            if (record.count >= 5) {
                record.lockoutUntil = now + 15 * 60 * 1000; // 15 minutes lockout
                trackingFailures.set(ip, record);
                
                // Generate security incident (Feature 4 & 8)
                await logSecurityIncident(
                    "Tracking endpoint brute-force attempts",
                    "High",
                    { ip, attempts: record.count, userAgent: req.headers["user-agent"] }
                );
                
                // Log to audit chain
                await logIntegrityAudit(
                    null,
                    "anonymous",
                    crypto.randomUUID(),
                    "SECURITY_EVENT",
                    ip,
                    req.headers["user-agent"] || "Unknown",
                    null,
                    { event: "TRACKING_BRUTE_FORCE", ip },
                    { message: "IP locked out due to repeated invalid case code attempts." }
                );
                
                return fail(res, "Too many invalid tracking attempts. You have been temporarily locked out.", 429);
            }
            trackingFailures.set(ip, record);
            return fail(res, "No anonymous report found matching this case code.", 404);
        }

        // Success - reset count
        record.count = 0;
        trackingFailures.set(ip, record);

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
        if (req.user.role !== "integrity_officer" && req.user.role !== "oversight_auditor") {
            return fail(res, "Forbidden. Authorized role required.", 403);
        }

        const sql = `
            SELECT id, anonymous_case_code, category, description, location, incident_date, media_files, created_at, status, integrity_notes, assigned_officer, audit_log, retaliation_risk, risk_score, risk_level, escalation_level, triage_results, protection_score, protection_level
            FROM anonymous_integrity_reports
            ORDER BY created_at DESC
        `;

        const result = await pool.query(sql);

        // Decrypt text fields and apply witness protection redactions
        const reports = [];
        for (const r of result.rows) {
            let desc = decrypt(r.description);
            let loc = r.location ? decrypt(r.location) : null;
            let notes = r.integrity_notes ? decrypt(r.integrity_notes) : null;

            // Feature 6: Witness Protection Mode
            if (r.retaliation_risk) {
                // Check if requesting officer is assigned to this case
                const collabsRes = await pool.query(
                    "SELECT 1 FROM integrity_case_assignments WHERE report_id = $1 AND officer_id = $2",
                    [r.id, req.user.id]
                );
                const isAssigned = collabsRes.rows.length > 0;
                
                // Hide department/location if not assigned
                if (!isAssigned && req.user.role !== "oversight_auditor") {
                    loc = "[RESTRICTED - WITNESS PROTECTION]";
                }
            }

            reports.push({
                ...r,
                description: desc,
                location: loc,
                integrity_notes: notes
            });
        }

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

        // Feature 2: Four-Eyes Approval Workflow
        const sensitiveStatuses = ["Closed", "Archived", "Investigation Complete"];
        if (sensitiveStatuses.includes(status)) {
            const actionType = status === "Closed" ? "Close Case" : status === "Archived" ? "Archive Case" : "Mark Investigation Complete";
            const approvalCheck = await pool.query(
                `SELECT * FROM approval_requests 
                 WHERE report_id = $1 AND action_type = $2 AND status = 'Approved'
                 LIMIT 1`,
                [id, actionType]
            );
            if (approvalCheck.rows.length === 0) {
                return fail(res, `Four-Eyes Enforcement: Performing '${actionType}' requires supervisor approval. Please create an approval request first.`, 403);
            }
        }

        // Velocity monitoring on rapid status modifications (Feature 4)
        const modifyKey = `status_modify:${id}`;
        const lastModify = globalCaptchaFailures.get(modifyKey) || 0;
        const now = Date.now();
        if (now - lastModify < 5000) { // status changed within 5 seconds
            await logSecurityIncident("Rapid status modifications", "Medium", { reportId: id, ip: req.ip });
        }
        globalCaptchaFailures.set(modifyKey, now);

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
        if (req.user.role !== "integrity_officer" && req.user.role !== "oversight_auditor") {
            return fail(res, "Forbidden. Authorized role required.", 403);
        }

        const { id, fileId } = req.params;

        // Fetch report
        const checkSql = `SELECT * FROM anonymous_integrity_reports WHERE id = $1`;
        const result = await pool.query(checkSql, [id]);
        if (result.rows.length === 0) {
            return fail(res, "Integrity report not found.", 404);
        }

        const currentReport = result.rows[0];

        // Feature 6: Witness Protection Mode
        if (currentReport.retaliation_risk) {
            // Check if there is an approved approval request for exporting/downloading this case's evidence
            const approvalCheck = await pool.query(
                `SELECT * FROM approval_requests 
                 WHERE report_id = $1 AND action_type = 'Export Evidence' AND status = 'Approved'
                 LIMIT 1`,
                [id]
            );
            if (approvalCheck.rows.length === 0) {
                return fail(res, "Forbidden. Exporting evidence for Witness Protection cases requires supervisor approval.", 403);
            }
        }

        const files = currentReport.media_files || [];
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
            
            // Log security incident (Feature 4)
            await logSecurityIncident("Excessive evidence downloads", "High", { officerId, count: recentDownloads.length });

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

        // 3. Log to digital evidence chain of custody (Feature 3)
        await pool.query(`
            INSERT INTO evidence_chain (evidence_id, report_id, action, performed_by, checksum_before, checksum_after)
            VALUES ($1, $2, 'Download', $3, $4, $5)
        `, [fileId, id, officerId, fileMetadata.hash || null, fileMetadata.hash || null]);

        // 4. Secure Evidence Watermarking (Feature 10)
        const { watermarkBuffer } = await import("../utils/watermarker.js");
        const watermarked = watermarkBuffer(
            decryptedBuffer,
            fileMetadata.mimetype,
            currentReport.anonymous_case_code,
            req.user.name || "Integrity Officer"
        );

        // Log audit event for export
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
            { action: "Evidence downloaded with watermark.", fileId, filename: fileMetadata.filename }
        );

        // Send watermarked file to browser
        res.setHeader("Content-Type", fileMetadata.mimetype);
        res.setHeader("Content-Disposition", `attachment; filename="${fileMetadata.filename}"`);
        res.setHeader("Content-Length", watermarked.length);
        
        return res.end(watermarked);

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

// ═══════════════════════════════════════════════════════════════
// V3 ENTERPRISE-GRADE WHISTLEBLOWER PLATFORM ENHANCEMENTS
// ═══════════════════════════════════════════════════════════════

// MFA SETUP ENROLLMENT
export const setupMfa = async (req, res) => {
    try {
        if (req.user.role !== "integrity_officer") {
            return fail(res, "Forbidden. Integrity Officer role required.", 403);
        }

        const { generateSecret } = await import("../utils/mfa.js");
        const secret = generateSecret();

        // Save secret temporarily (we enable mfa only after verification)
        await pool.query(
            "UPDATE officer_accounts SET mfa_secret = $1, mfa_enabled = FALSE WHERE id = $2",
            [secret, req.user.id]
        );

        return success(res, "MFA setup initialized.", { secret, qrCodeUrl: `otpauth://totp/AAZHI:${req.user.name}?secret=${secret}&issuer=AAZHI` }, 200);
    } catch (err) {
        logger.error(`[MFA Setup Error]: ${err.message}`);
        return serverError(res, "Failed to setup MFA.", 500);
    }
};

// MFA VERIFY AND ENABLE
export const verifyAndEnableMfa = async (req, res) => {
    try {
        if (req.user.role !== "integrity_officer") {
            return fail(res, "Forbidden. Integrity Officer role required.", 403);
        }

        const { code } = req.body;
        if (!code) {
            return fail(res, "Verification code is required.", 400);
        }

        const officerRes = await pool.query("SELECT mfa_secret FROM officer_accounts WHERE id = $1", [req.user.id]);
        if (officerRes.rows.length === 0 || !officerRes.rows[0].mfa_secret) {
            return fail(res, "MFA Setup has not been initialized.", 400);
        }

        const { verifyTOTP } = await import("../utils/mfa.js");
        const isValid = verifyTOTP(officerRes.rows[0].mfa_secret, code);

        if (!isValid) {
            await logSecurityIncident("Failed MFA", "High", { username: req.user.name, officerId: req.user.id });
            return fail(res, "Invalid verification code.", 400);
        }

        await pool.query("UPDATE officer_accounts SET mfa_enabled = TRUE WHERE id = $1", [req.user.id]);

        return success(res, "MFA successfully enabled for account.", null, 200);
    } catch (err) {
        logger.error(`[MFA Verification Error]: ${err.message}`);
        return serverError(res, "Failed to verify MFA code.", 500);
    }
};

// CASE COLLABORATORS (Feature 1)
export const getAssignments = async (req, res) => {
    try {
        if (req.user.role !== "integrity_officer" && req.user.role !== "oversight_auditor") {
            return fail(res, "Forbidden. Authorized role required.", 403);
        }

        const { id } = req.params;
        const sql = `
            SELECT a.id, a.role, a.assigned_at, o.username as officer_name, o.id as officer_id
            FROM integrity_case_assignments a
            JOIN officer_accounts o ON a.officer_id = o.id
            WHERE a.report_id = $1
            ORDER BY a.assigned_at ASC
        `;
        const result = await pool.query(sql, [id]);
        return success(res, "Case assignments retrieved.", result.rows, 200);
    } catch (err) {
        logger.error(`[Get Assignments Error]: ${err.message}`);
        return serverError(res, "Failed to load case assignments.", 500);
    }
};

export const createAssignment = async (req, res) => {
    try {
        if (req.user.role !== "integrity_officer") {
            return fail(res, "Forbidden. Integrity Officer role required.", 403);
        }

        const { id } = req.params;
        const { officerId, role } = req.body;

        if (!officerId || !role) {
            return fail(res, "Officer ID and Role are required.", 400);
        }

        // Fetch report
        const checkReport = await pool.query("SELECT * FROM anonymous_integrity_reports WHERE id = $1", [id]);
        if (checkReport.rows.length === 0) {
            return fail(res, "Report not found.", 404);
        }

        const report = checkReport.rows[0];

        // Witness Protection: Require supervisor approval before assignment (Feature 6)
        if (report.retaliation_risk) {
            const approvalCheck = await pool.query(
                `SELECT * FROM approval_requests 
                 WHERE report_id = $1 AND action_type = 'Case Assignment' AND status = 'Approved'
                 LIMIT 1`,
                [id]
            );
            if (approvalCheck.rows.length === 0) {
                return fail(res, "Forbidden. Assigning collaborators to retaliation-risk cases requires supervisor approval first.", 403);
            }
        }

        // Check if assignment already exists
        const exists = await pool.query(
            "SELECT id FROM integrity_case_assignments WHERE report_id = $1 AND officer_id = $2",
            [id, officerId]
        );

        let result;
        if (exists.rows.length > 0) {
            result = await pool.query(
                `UPDATE integrity_case_assignments 
                 SET role = $1, assigned_by = $2 
                 WHERE id = $3 
                 RETURNING *`,
                [role, req.user.id, exists.rows[0].id]
            );
        } else {
            result = await pool.query(
                `INSERT INTO integrity_case_assignments (report_id, officer_id, role, assigned_by)
                 VALUES ($1, $2, $3, $4)
                 RETURNING *`,
                [id, officerId, role, req.user.id]
            );
        }

        // Add to audit logs inside anonymous_integrity_reports
        const prevAuditLog = Array.isArray(report.audit_log) ? report.audit_log : [];
        const updatedAuditLog = [
            ...prevAuditLog,
            {
                action: `Collaborator assigned: ${role}.`,
                officer: req.user.name || "Integrity Officer",
                timestamp: new Date().toISOString()
            }
        ];
        await pool.query(
            "UPDATE anonymous_integrity_reports SET audit_log = $1 WHERE id = $2",
            [JSON.stringify(updatedAuditLog), id]
        );

        // Log to cryptographic audit chain
        await logIntegrityAudit(
            req.user.id,
            req.user.role,
            id,
            "DATA_EDIT",
            req.ip || "127.0.0.1",
            req.headers["user-agent"] || "AdminPortal",
            null,
            { event: "ASSIGN_COLLABORATOR", officerId, role },
            { message: `Assigned collaborator with role: ${role}` }
        );

        return success(res, "Collaborator assigned successfully.", result.rows[0], 200);
    } catch (err) {
        logger.error(`[Create Assignment Error]: ${err.message}`);
        return serverError(res, "Failed to assign collaborator.", 500);
    }
};

export const deleteAssignment = async (req, res) => {
    try {
        if (req.user.role !== "integrity_officer") {
            return fail(res, "Forbidden. Integrity Officer role required.", 403);
        }

        const { id, assignmentId } = req.params;
        const result = await pool.query(
            "DELETE FROM integrity_case_assignments WHERE id = $1 AND report_id = $2 RETURNING *",
            [assignmentId, id]
        );

        if (result.rows.length === 0) {
            return fail(res, "Assignment not found.", 404);
        }

        return success(res, "Collaborator removed successfully.", null, 200);
    } catch (err) {
        logger.error(`[Delete Assignment Error]: ${err.message}`);
        return serverError(res, "Failed to remove collaborator.", 500);
    }
};

// FOUR-EYES APPROVAL WORKFLOW (Feature 2)
export const getApprovals = async (req, res) => {
    try {
        if (req.user.role !== "integrity_officer" && req.user.role !== "oversight_auditor") {
            return fail(res, "Forbidden. Authorized role required.", 403);
        }

        const { id } = req.params;
        let result;
        if (id === 'all') {
            result = await pool.query(
                `SELECT a.*, o.username as requester_name, r.anonymous_case_code 
                 FROM approval_requests a
                 JOIN officer_accounts o ON a.requested_by = o.id
                 JOIN anonymous_integrity_reports r ON a.report_id = r.id
                 ORDER BY a.created_at DESC`
            );
        } else {
            result = await pool.query(
                `SELECT a.*, o.username as requester_name 
                 FROM approval_requests a
                 JOIN officer_accounts o ON a.requested_by = o.id
                 WHERE a.report_id = $1 
                 ORDER BY a.created_at DESC`,
                [id]
            );
        }
        return success(res, "Approval requests retrieved.", result.rows, 200);
    } catch (err) {
        logger.error(`[Get Approvals Error]: ${err.message}`);
        return serverError(res, "Failed to load approvals.", 500);
    }
};

export const createApprovalRequest = async (req, res) => {
    try {
        if (req.user.role !== "integrity_officer") {
            return fail(res, "Forbidden. Integrity Officer role required.", 403);
        }

        const { id } = req.params;
        const { action_type } = req.body;

        if (!action_type) {
            return fail(res, "Action type is required.", 400);
        }

        const checkReport = await pool.query("SELECT * FROM anonymous_integrity_reports WHERE id = $1", [id]);
        if (checkReport.rows.length === 0) {
            return fail(res, "Report not found.", 404);
        }

        const result = await pool.query(
            `INSERT INTO approval_requests (report_id, action_type, requested_by)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [id, action_type, req.user.id]
        );

        return success(res, "Approval request submitted successfully.", result.rows[0], 201);
    } catch (err) {
        logger.error(`[Create Approval Error]: ${err.message}`);
        return serverError(res, "Failed to submit approval request.", 500);
    }
};

export const updateApprovalRequest = async (req, res) => {
    try {
        if (req.user.role !== "integrity_officer") {
            return fail(res, "Forbidden. Integrity Officer role required.", 403);
        }

        const { approvalId } = req.params;
        const { status } = req.body; // 'Approved' or 'Rejected'

        if (!status || !["Approved", "Rejected"].includes(status)) {
            return fail(res, "Status must be 'Approved' or 'Rejected'.", 400);
        }

        const checkReq = await pool.query("SELECT * FROM approval_requests WHERE id = $1", [approvalId]);
        if (checkReq.rows.length === 0) {
            return fail(res, "Approval request not found.", 404);
        }

        const approvalRequest = checkReq.rows[0];

        // Rule: Requestor cannot approve their own action
        if (approvalRequest.requested_by === req.user.id) {
            return fail(res, "Four-Eyes Enforcement: You cannot approve/reject your own request.", 403);
        }

        const result = await pool.query(
            `UPDATE approval_requests 
             SET status = $1, approved_by = $2, approved_at = NOW() 
             WHERE id = $3 
             RETURNING *`,
            [status, req.user.id, approvalId]
        );

        const reportId = approvalRequest.report_id;

        // If approved, trigger auto-execution of status changes
        if (status === "Approved") {
            const reportRes = await pool.query("SELECT * FROM anonymous_integrity_reports WHERE id = $1", [reportId]);
            const report = reportRes.rows[0];
            const prevAuditLog = Array.isArray(report.audit_log) ? report.audit_log : [];

            if (approvalRequest.action_type === "Close Case") {
                const updatedAuditLog = [
                    ...prevAuditLog,
                    {
                        action: `Case Closed via approved Four-Eyes Workflow.`,
                        officer: req.user.name || "Integrity Officer",
                        timestamp: new Date().toISOString()
                    }
                ];
                await pool.query(
                    "UPDATE anonymous_integrity_reports SET status = 'Closed', audit_log = $1 WHERE id = $2",
                    [JSON.stringify(updatedAuditLog), reportId]
                );
            } else if (approvalRequest.action_type === "Mark Investigation Complete") {
                const updatedAuditLog = [
                    ...prevAuditLog,
                    {
                        action: `Investigation marked complete via approved Four-Eyes Workflow.`,
                        officer: req.user.name || "Integrity Officer",
                        timestamp: new Date().toISOString()
                    }
                ];
                await pool.query(
                    "UPDATE anonymous_integrity_reports SET status = 'Closed', audit_log = $1 WHERE id = $2",
                    [JSON.stringify(updatedAuditLog), reportId]
                );
            } else if (approvalRequest.action_type === "Escalation Reversal") {
                const updatedAuditLog = [
                    ...prevAuditLog,
                    {
                        action: `Escalation level reset to Level 1.`,
                        officer: req.user.name || "Integrity Officer",
                        timestamp: new Date().toISOString()
                    }
                ];
                await pool.query(
                    "UPDATE anonymous_integrity_reports SET escalation_level = 'Level 1: Integrity Officer', audit_log = $1 WHERE id = $2",
                    [JSON.stringify(updatedAuditLog), reportId]
                );
            }
        }

        // Log approval to cryptographic audit chain
        await logIntegrityAudit(
            req.user.id,
            req.user.role,
            reportId,
            status === "Approved" ? "APPROVAL" : "REJECTION",
            req.ip || "127.0.0.1",
            req.headers["user-agent"] || "AdminPortal",
            null,
            { event: `APPROVAL_${status.toUpperCase()}`, action: approvalRequest.action_type },
            { message: `Four-Eyes workflow action ${status.toLowerCase()} by supervisor.` }
        );

        return success(res, `Request successfully ${status.toLowerCase()}.`, result.rows[0], 200);
    } catch (err) {
        logger.error(`[Update Approval Error]: ${err.message}`);
        return serverError(res, "Failed to resolve approval request.", 500);
    }
};

// EVIDENCE CHAIN (Feature 3)
export const getEvidenceChain = async (req, res) => {
    try {
        if (req.user.role !== "integrity_officer" && req.user.role !== "oversight_auditor") {
            return fail(res, "Forbidden. Authorized role required.", 403);
        }

        const { id } = req.params;
        const result = await pool.query(
            `SELECT e.*, o.username as performed_by_name 
             FROM evidence_chain e
             LEFT JOIN officer_accounts o ON e.performed_by = o.id
             WHERE e.report_id = $1 
             ORDER BY e.timestamp DESC`,
            [id]
        );
        return success(res, "Evidence chain timeline retrieved.", result.rows, 200);
    } catch (err) {
        logger.error(`[Get Evidence Chain Error]: ${err.message}`);
        return serverError(res, "Failed to retrieve evidence chain.", 500);
    }
};

// SECURITY INCIDENTS (Feature 4)
export const getSecurityIncidents = async (req, res) => {
    try {
        if (req.user.role !== "integrity_officer" && req.user.role !== "oversight_auditor") {
            return fail(res, "Forbidden. Authorized role required.", 403);
        }

        const result = await pool.query(
            "SELECT * FROM security_incidents ORDER BY created_at DESC"
        );
        return success(res, "Security incidents list retrieved.", result.rows, 200);
    } catch (err) {
        logger.error(`[Get Incidents Error]: ${err.message}`);
        return serverError(res, "Failed to retrieve security incidents.", 500);
    }
};

export const resolveSecurityIncident = async (req, res) => {
    try {
        if (req.user.role !== "integrity_officer") {
            return fail(res, "Forbidden. Integrity Officer role required.", 403);
        }

        const { id } = req.params;
        const result = await pool.query(
            "UPDATE security_incidents SET resolved = TRUE WHERE id = $1 RETURNING *",
            [id]
        );

        if (result.rows.length === 0) {
            return fail(res, "Incident not found.", 404);
        }

        return success(res, "Security incident resolved.", result.rows[0], 200);
    } catch (err) {
        logger.error(`[Resolve Incident Error]: ${err.message}`);
        return serverError(res, "Failed to resolve security incident.", 500);
    }
};

// CASE ESCALATIONS (Feature 7)
export const getEscalations = async (req, res) => {
    try {
        if (req.user.role !== "integrity_officer" && req.user.role !== "oversight_auditor") {
            return fail(res, "Forbidden. Authorized role required.", 403);
        }

        const { id } = req.params;
        const result = await pool.query(
            "SELECT * FROM case_escalations WHERE report_id = $1 ORDER BY created_at ASC",
            [id]
        );
        return success(res, "Case escalations retrieved.", result.rows, 200);
    } catch (err) {
        logger.error(`[Get Escalations Error]: ${err.message}`);
        return serverError(res, "Failed to retrieve escalations.", 500);
    }
};

export const escalateReport = async (req, res) => {
    try {
        if (req.user.role !== "integrity_officer") {
            return fail(res, "Forbidden. Integrity Officer role required.", 403);
        }

        const { id } = req.params;
        const { escalated_to, reason } = req.body;

        if (!escalated_to || !reason) {
            return fail(res, "Escalated to level and reason are required.", 400);
        }

        const check = await pool.query("SELECT * FROM anonymous_integrity_reports WHERE id = $1", [id]);
        if (check.rows.length === 0) {
            return fail(res, "Report not found.", 404);
        }

        const currentReport = check.rows[0];
        const fromLevel = currentReport.escalation_level || "Level 1: Integrity Officer";

        // Create escalation log
        await pool.query(
            `INSERT INTO case_escalations (report_id, escalated_from, escalated_to, reason)
             VALUES ($1, $2, $3, $4)`,
            [id, fromLevel, escalated_to, reason]
        );

        // Update report escalation level
        const prevAuditLog = Array.isArray(currentReport.audit_log) ? currentReport.audit_log : [];
        const updatedAuditLog = [
            ...prevAuditLog,
            {
                action: `Case escalated from ${fromLevel} to ${escalated_to}. Reason: ${reason}`,
                officer: req.user.name || "Integrity Officer",
                timestamp: new Date().toISOString()
            }
        ];

        await pool.query(
            `UPDATE anonymous_integrity_reports 
             SET escalation_level = $1, audit_log = $2 
             WHERE id = $3`,
            [escalated_to, JSON.stringify(updatedAuditLog), id]
        );

        // Log to audit chain
        await logIntegrityAudit(
            req.user.id,
            req.user.role,
            id,
            "STATUS_CHANGE",
            req.ip || "127.0.0.1",
            req.headers["user-agent"] || "AdminPortal",
            null,
            { event: "ESCALATION", escalated_to },
            { message: `Report escalated to ${escalated_to}` }
        );

        return success(res, "Report escalated successfully.", { escalation_level: escalated_to }, 200);
    } catch (err) {
        logger.error(`[Escalate Report Error]: ${err.message}`);
        return serverError(res, "Failed to escalate report.", 500);
    }
};

// DISASTER RECOVERY STATUS (Feature 12)
export const getDRStatus = async (req, res) => {
    try {
        if (req.user.role !== "integrity_officer" && req.user.role !== "oversight_auditor") {
            return fail(res, "Forbidden. Authorized role required.", 403);
        }

        const status = getDisasterRecoveryStatus();
        return success(res, "Disaster recovery monitoring status retrieved.", status, 200);
    } catch (err) {
        logger.error(`[DR Status Error]: ${err.message}`);
        return serverError(res, "Failed to load disaster recovery status.", 500);
    }
};

// GOVERNANCE REPORTING MODULE (Feature 13)
export const getGovernanceReport = async (req, res) => {
    try {
        if (req.user.role !== "integrity_officer" && req.user.role !== "oversight_auditor") {
            return fail(res, "Forbidden. Authorized role required.", 403);
        }

        const format = req.query.format || "csv";

        // Query database to aggregate governance stats
        const totalSql = `SELECT COUNT(*) FROM anonymous_integrity_reports`;
        const categorySql = `SELECT category, COUNT(*) FROM anonymous_integrity_reports GROUP BY category`;
        const statusSql = `SELECT status, COUNT(*) FROM anonymous_integrity_reports GROUP BY status`;
        const escalationsSql = `SELECT COUNT(*) FROM case_escalations`;
        const incidentsSql = `SELECT COUNT(*) FROM security_incidents`;
        const resolvedTimeSql = `
            SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_seconds
            FROM anonymous_integrity_reports
            WHERE status = 'Closed'
        `;

        const [totalRes, catRes, statusRes, escRes, incRes, resTimeRes] = await Promise.all([
            pool.query(totalSql),
            pool.query(categorySql),
            pool.query(statusSql),
            pool.query(escalationsSql),
            pool.query(incidentsSql),
            pool.query(resolvedTimeSql)
        ]);

        const totalReports = totalRes.rows[0].count;
        const escalations = escRes.rows[0].count;
        const securityIncidents = incRes.rows[0].count;
        const avgSeconds = resTimeRes.rows[0].avg_seconds || 0;
        const avgResTime = avgSeconds > 0 ? `${Math.round(avgSeconds / 3600)} Hours` : "N/A";

        let corruptionCount = 0;
        let fraudCount = 0;
        catRes.rows.forEach(r => {
            const cat = r.category.toLowerCase();
            if (cat.includes("corruption") || cat.includes("bribery")) corruptionCount += parseInt(r.count, 10);
            if (cat.includes("fraud") || cat.includes("fake")) fraudCount += parseInt(r.count, 10);
        });

        let openCount = 0;
        let closedCount = 0;
        statusRes.rows.forEach(r => {
            if (r.status === "Closed") closedCount += parseInt(r.count, 10);
            else openCount += parseInt(r.count, 10);
        });

        const reportData = {
            generationDate: new Date().toISOString(),
            totalReports,
            corruptionCount,
            fraudCount,
            avgResolutionTime: avgResTime,
            openInvestigations: openCount,
            closedInvestigations: closedCount,
            escalatedInvestigations: escalations,
            securityIncidents
        };

        if (format === "csv" || format === "excel") {
            const csvRows = [
                ["AAZHI GOVERNANCE REPORT", "METRIC VALUES"],
                ["Total Whistleblower Reports Received", reportData.totalReports],
                ["Corruption Complaints", reportData.corruptionCount],
                ["Fraud Complaints", reportData.fraudCount],
                ["Average Resolution Time", reportData.avgResolutionTime],
                ["Open Investigations", reportData.openInvestigations],
                ["Closed Investigations", reportData.closedInvestigations],
                ["Escalated Cases", reportData.escalatedInvestigations],
                ["Security Incidents Detected", reportData.securityIncidents],
                ["Report Export Timestamp", reportData.generationDate]
            ];

            const csvContent = csvRows.map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
            
            res.setHeader("Content-Type", format === "csv" ? "text/csv" : "application/vnd.ms-excel");
            res.setHeader("Content-Disposition", `attachment; filename="aazhi_governance_report_${Date.now()}.${format === 'csv' ? 'csv' : 'xls'}"`);
            return res.send(csvContent);
        } else if (format === "pdf") {
            const PDFDocument = (await import("pdfkit")).default;
            const doc = new PDFDocument({ margin: 50 });
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename="aazhi_governance_report_${Date.now()}.pdf"`);
            doc.pipe(res);

            // Title
            doc.fontSize(20).text("AAZHI Civic Integrity Oversight", { align: "center" });
            doc.fontSize(16).text("Monthly Whistleblower Governance Report", { align: "center" });
            doc.moveDown(2);

            // Details
            doc.fontSize(12).text(`Report Generated On: ${new Date().toLocaleString()}`);
            doc.moveDown(1);
            doc.rect(50, doc.y, 500, 1).fill("#cccccc");
            doc.moveDown(1);

            // Metrics table
            const metrics = [
                ["Total Whistleblower Reports Received", reportData.totalReports],
                ["Corruption Complaints", reportData.corruptionCount],
                ["Fraud Complaints", reportData.fraudCount],
                ["Average Resolution Time", reportData.avgResolutionTime],
                ["Open Investigations", reportData.openInvestigations],
                ["Closed Investigations", reportData.closedInvestigations],
                ["Escalated Cases", reportData.escalatedInvestigations],
                ["Security Incidents Detected", reportData.securityIncidents]
            ];

            metrics.forEach(([label, val]) => {
                doc.fontSize(12).fillColor("#333333").text(label, 60, doc.y, { continued: true });
                doc.text(val.toString(), { align: "right" });
                doc.moveDown(0.5);
            });

            doc.moveDown(2);
            doc.fontSize(10).fillColor("#ff5555").text("CONFIDENTIALITY WARNING: For authorized Integrity Officer review only.", { align: "center" });

            doc.end();
            return;
        } else {
            return fail(res, "Unsupported export format.", 400);
        }

    } catch (err) {
        logger.error(`[Governance Report Error]: ${err.message}`);
        return serverError(res, "Failed to generate governance report.", 500);
    }
};



// ─── V4 PUBLIC TRANSPARENCY PORTAL ───
export const getPublicTransparencyMetrics = async (req, res) => {
    try {
        const totalSql = `SELECT COUNT(*) FROM anonymous_integrity_reports`;
        const closedSql = `SELECT COUNT(*) FROM anonymous_integrity_reports WHERE status = 'Closed'`;
        const activeSql = `SELECT COUNT(*) FROM anonymous_integrity_reports WHERE status NOT IN ('Submitted', 'Closed')`;
        const resTimeSql = `
            SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) AS avg_seconds 
            FROM anonymous_integrity_reports 
            WHERE status = 'Closed'
        `;
        const departmentSql = `
            SELECT category as department, COUNT(*) as count 
            FROM anonymous_integrity_reports 
            GROUP BY category
        `;

        const [totalRes, closedRes, activeRes, resTimeRes, deptRes] = await Promise.all([
            pool.query(totalSql),
            pool.query(closedSql),
            pool.query(activeSql),
            pool.query(resTimeSql),
            pool.query(departmentSql)
        ]);

        const avgSeconds = parseFloat(resTimeRes.rows[0].avg_seconds || 0);
        const avgDays = avgSeconds > 0 ? parseFloat((avgSeconds / 86400).toFixed(1)) : 0;

        return success(res, "Transparency data retrieved.", {
            totalReports: parseInt(totalRes.rows[0].count, 10),
            closedCases: parseInt(closedRes.rows[0].count, 10),
            activeInvestigations: parseInt(activeRes.rows[0].count, 10),
            averageResolutionDays: avgDays || 4.2, // fallback for demo
            departmentStats: deptRes.rows.map(r => ({
                department: r.department,
                count: parseInt(r.count, 10)
            }))
        }, 200);
    } catch (err) {
        logger.error(`[Transparency API Error]: ${err.message}`);
        return serverError(res, "Failed to load transparency metrics.", 500);
    }
};

// ─── V4 CASE-LEVEL AI TRIAGE RESULTS ───
export const getAITriageResults = async (req, res) => {
    try {
        if (req.user.role !== "integrity_officer" && req.user.role !== "oversight_auditor") {
            return fail(res, "Forbidden. Integrity role required.", 403);
        }

        const { id } = req.params;
        const check = await pool.query(
            "SELECT triage_results, protection_score, protection_level, risk_score, risk_level FROM anonymous_integrity_reports WHERE id = $1",
            [id]
        );

        if (check.rows.length === 0) {
            return fail(res, "Report not found.", 404);
        }

        const report = check.rows[0];
        let triage = report.triage_results;
        
        // If empty, return a fallback object
        if (!triage || Object.keys(triage).length === 0) {
            triage = {
                fraudIndicators: ["No indicators generated"],
                similarCases: [],
                duplicateProbability: 0,
                recommendedPriority: "Medium",
                aiSummary: "Triage results pending."
            };
        }

        return success(res, "Triage results loaded.", {
            ...triage,
            protectionScore: report.protection_score || 0,
            protectionLevel: report.protection_level || "Standard",
            riskScore: report.risk_score || 0,
            riskLevel: report.risk_level || "Low"
        }, 200);
    } catch (err) {
        logger.error(`[Triage API Error]: ${err.message}`);
        return serverError(res, "Failed to retrieve case triage analysis.", 500);
    }
};

// ─── V4 REPEAT OFFENDER REGISTRY ───
export const getWatchlist = async (req, res) => {
    try {
        if (req.user.role !== "integrity_officer" && req.user.role !== "oversight_auditor" && req.user.role !== "executive_oversight") {
            return fail(res, "Forbidden. Authorized role required.", 403);
        }

        const result = await pool.query(
            "SELECT id, entity_type, entity_value, mention_count, risk_trend, updated_at FROM repeat_offender_registry ORDER BY mention_count DESC, updated_at DESC"
        );

        return success(res, "Watchlist registry retrieved.", result.rows, 200);
    } catch (err) {
        logger.error(`[Watchlist Registry Error]: ${err.message}`);
        return serverError(res, "Failed to retrieve repeat offender registry.", 500);
    }
};

// ─── V4 EVIDENCE INTELLIGENCE PANEL ───
export const getEvidenceIntelligence = async (req, res) => {
    try {
        if (req.user.role !== "integrity_officer" && req.user.role !== "oversight_auditor") {
            return fail(res, "Forbidden. Integrity role required.", 403);
        }

        const { id } = req.params;
        const check = await pool.query("SELECT media_files FROM anonymous_integrity_reports WHERE id = $1", [id]);

        if (check.rows.length === 0) {
            return fail(res, "Report not found.", 404);
        }

        const mediaFiles = check.rows[0].media_files || [];
        const analysis = [];

        // Compare each file upload with all other files in DB
        for (const file of mediaFiles) {
            const anomalies = [];
            const duplicates = [];

            // 1. Metadata Anomaly Check (e.g. if it is an image but has size/name anomaly)
            if (file.mimetype && file.mimetype.startsWith("image/")) {
                // Check if name is simple numeric/WhatsApp format (could be stripped exif)
                if (file.filename && /^\d+(_\d+)*\..*$/.test(file.filename)) {
                    anomalies.push("Device Metadata Stripped (Whatsapp/Social Media transfer)");
                }
            }

            // 2. Query other cases to find matching hashes (duplicates) or filenames
            if (file.hash) {
                const dupCheck = await pool.query(
                    `SELECT r.id, r.anonymous_case_code, r.created_at, r.category
                     FROM anonymous_integrity_reports r,
                          jsonb_to_recordset(r.media_files) as file(id text, hash text)
                     WHERE file.hash = $1 AND r.id != $2`,
                    [file.hash, id]
                );

                dupCheck.rows.forEach(r => {
                    duplicates.push({
                        caseId: r.id,
                        caseCode: r.anonymous_case_code,
                        date: r.created_at,
                        category: r.category
                    });
                });
            }

            analysis.push({
                fileId: file.id,
                filename: file.filename,
                mimetype: file.mimetype,
                size: file.size,
                anomalies,
                duplicates
            });
        }

        return success(res, "Evidence intelligence loaded.", analysis, 200);
    } catch (err) {
        logger.error(`[Evidence Intelligence Error]: ${err.message}`);
        return serverError(res, "Failed to analyze evidence integrity.", 500);
    }
};

// ─── V4 EXECUTIVE ANALYTICS PANEL ───
export const getExecutiveAnalytics = async (req, res) => {
    try {
        if (req.user.role !== "integrity_officer" && req.user.role !== "oversight_auditor" && req.user.role !== "executive_oversight") {
            return fail(res, "Forbidden. Authorized role required.", 403);
        }

        // 1. Aggregations (complaints by month, category, and district/region)
        const totalReportsRes = await pool.query("SELECT COUNT(*) FROM anonymous_integrity_reports");
        const categoryRes = await pool.query(
            "SELECT category, COUNT(*), AVG(risk_score) as avg_risk FROM anonymous_integrity_reports GROUP BY category"
        );
        const districtRes = await pool.query(
            "SELECT COALESCE(district, 'Central District') as region, COUNT(*), AVG(risk_score) as avg_risk FROM anonymous_integrity_reports GROUP BY district"
        );
        const monthlyRes = await pool.query(
            `SELECT TO_CHAR(created_at, 'Mon') as month, COUNT(*) as count 
             FROM anonymous_integrity_reports 
             WHERE created_at >= NOW() - INTERVAL '6 months'
             GROUP BY TO_CHAR(created_at, 'Mon'), DATE_TRUNC('month', created_at)
             ORDER BY DATE_TRUNC('month', created_at)`
        );

        // 2. Map coordinates for heatmap (Mock coordinates for regions)
        const COORDINATES_MAP = {
            "Central District": { lat: 13.0827, lng: 80.2707 },
            "North District": { lat: 13.1500, lng: 80.2000 },
            "South District": { lat: 12.9800, lng: 80.2200 },
            "East District": { lat: 13.0400, lng: 80.2800 },
            "West District": { lat: 13.0600, lng: 80.1800 }
        };

        const heatmapData = districtRes.rows.map(r => {
            const coords = COORDINATES_MAP[r.region] || COORDINATES_MAP["Central District"];
            return {
                district: r.region,
                lat: coords.lat,
                lng: coords.lng,
                intensity: parseInt(r.count, 10),
                avgRisk: Math.round(parseFloat(r.avg_risk || 0))
            };
        });

        // 3. Early Warning Alerts (emergence detection)
        const earlyWarningAlerts = [];
        const currentWeekCountRes = await pool.query(
            "SELECT COUNT(*) FROM anonymous_integrity_reports WHERE created_at >= NOW() - INTERVAL '7 days'"
        );
        const currentWeekCount = parseInt(currentWeekCountRes.rows[0].count, 10);
        
        // Spike check: general increase
        if (currentWeekCount >= 4) {
            earlyWarningAlerts.push({
                severity: "Critical Alert",
                description: `Emerging cluster: ${currentWeekCount} new reports submitted in the past 7 days across multiple districts.`,
                date: new Date().toISOString()
            });
        } else if (currentWeekCount >= 2) {
            earlyWarningAlerts.push({
                severity: "Warning",
                description: `Emerging activity: ${currentWeekCount} complaints filed this week. Spot checks recommended.`,
                date: new Date().toISOString()
            });
        }

        // Sector check: category spikes
        categoryRes.rows.forEach(c => {
            if (parseInt(c.count, 10) >= 3) {
                earlyWarningAlerts.push({
                    severity: "Warning",
                    description: `Category spike: Multiple reports submitted regarding ${c.category} sector.`,
                    date: new Date().toISOString()
                });
            }
        });

        // Repeat offenders alerts (from offender registry counts)
        const offenderRes = await pool.query("SELECT * FROM repeat_offender_registry WHERE mention_count >= 3");
        offenderRes.rows.forEach(o => {
            earlyWarningAlerts.push({
                severity: "Critical Alert",
                description: `Watchlist violation: Target ${o.entity_type} "${o.entity_value}" crossed threshold with ${o.mention_count} mentions.`,
                date: o.updated_at
            });
        });

        // If no alerts generated, provide advisory
        if (earlyWarningAlerts.length === 0) {
            earlyWarningAlerts.push({
                severity: "Advisory",
                description: "Normal status. Complaint trends and offender watchlists are within baseline parameters.",
                date: new Date().toISOString()
            });
        }

        // 4. Strategic Risk Forecasting (Projecting based on regression / monthly trends)
        const trends = monthlyRes.rows.map(r => parseInt(r.count, 10));
        let m = 0.5, c = 1.0; // simple baseline linear regression defaults
        
        if (trends.length > 1) {
            // Compute simple slope m
            const xMean = (trends.length - 1) / 2;
            const yMean = trends.reduce((a,b)=>a+b, 0) / trends.length;
            let num = 0, den = 0;
            for (let i = 0; i < trends.length; i++) {
                num += (i - xMean) * (trends[i] - yMean);
                den += Math.pow(i - xMean, 2);
            }
            m = den !== 0 ? num / den : 0.5;
            c = yMean - m * xMean;
        }

        // Calculate projections
        const nextMonthX = trends.length;
        const forecast30 = Math.max(1, Math.round(m * nextMonthX + c));
        const forecast90 = Math.max(2, Math.round((m * nextMonthX + c) + (m * (nextMonthX + 1) + c) + (m * (nextMonthX + 2) + c)));
        const forecastAnnual = Math.max(5, Math.round((m * 12) + c) * 6);

        // 5. Performance SLAs & Metrics
        const resolvedCasesRes = await pool.query(
            "SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at)))/86400 as avg_days FROM anonymous_integrity_reports WHERE status = 'Closed'"
        );
        const backlogRes = await pool.query(
            "SELECT COUNT(*) FROM anonymous_integrity_reports WHERE status != 'Closed' AND created_at < NOW() - INTERVAL '15 days'"
        );
        const escalationsCount = await pool.query("SELECT COUNT(*) FROM case_escalations");
        const approvalRes = await pool.query(
            "SELECT AVG(EXTRACT(EPOCH FROM (approved_at - created_at)))/3600 as avg_hrs FROM approval_requests WHERE approved_at IS NOT NULL"
        );
        const workloadRes = await pool.query(
            "SELECT assigned_officer, COUNT(*) as count FROM anonymous_integrity_reports WHERE status != 'Closed' AND assigned_officer IS NOT NULL GROUP BY assigned_officer"
        );

        return success(res, "Executive analytics compiled.", {
            heatmapData,
            complaintsByDepartment: categoryRes.rows.map(r => ({ department: r.category, count: parseInt(r.count, 10), risk: Math.round(parseFloat(r.avg_risk || 0)) })),
            complaintsByDistrict: districtRes.rows.map(r => ({ district: r.region, count: parseInt(r.count, 10), risk: Math.round(parseFloat(r.avg_risk || 0)) })),
            complaintsByMonth: monthlyRes.rows.map(r => ({ name: r.month, reports: parseInt(r.count, 10) })),
            earlyWarningAlerts,
            forecast: {
                forecast30,
                forecast90,
                forecastAnnual,
                atRiskDepartments: categoryRes.rows.filter(c => parseFloat(c.avg_risk) > 50).map(c => c.category),
                atRiskRegions: districtRes.rows.filter(d => parseFloat(d.avg_risk) > 50).map(d => d.region)
            },
            slaPerformance: {
                avgResolutionDays: parseFloat(parseFloat(resolvedCasesRes.rows[0].avg_days || 4.2).toFixed(1)),
                backlogCount: parseInt(backlogRes.rows[0].count, 10),
                escalationFrequency: parseInt(escalationsCount.rows[0].count, 10),
                avgApprovalTurnaroundHours: parseFloat(parseFloat(approvalRes.rows[0].avg_hrs || 2.4).toFixed(1)),
                officerWorkload: workloadRes.rows.map(w => ({ officer: w.assigned_officer, cases: parseInt(w.count, 10) }))
            }
        }, 200);

    } catch (err) {
        logger.error(`[Executive Analytics Error]: ${err.message}`);
        return serverError(res, "Failed to load executive intelligence analytics.", 500);
    }
};

// ─── V4 COMPLIANCE & AUDIT EXPORT ───
export const getCompliancePackage = async (req, res) => {
    try {
        if (req.user.role !== "integrity_officer" && req.user.role !== "oversight_auditor" && req.user.role !== "executive_oversight") {
            return fail(res, "Forbidden. Authorized role required.", 403);
        }

        const { format } = req.query;

        // Gather Audits
        const auditCountRes = await pool.query("SELECT COUNT(*) FROM audit_chain_entries");
        const auditTamperRes = await pool.query("SELECT COUNT(*) FROM audit_chain_verification WHERE chain_link_valid = false");
        const isChainSecure = parseInt(auditTamperRes.rows[0].count, 10) === 0;

        // Gather Evidence Chain
        const evidenceRes = await pool.query(
            "SELECT e.evidence_id, e.action, e.timestamp, e.checksum_before, e.checksum_after, r.anonymous_case_code FROM evidence_chain e LEFT JOIN anonymous_integrity_reports r ON e.report_id = r.id ORDER BY e.timestamp DESC LIMIT 30"
        );

        // Gather Security Incidents
        const incidentRes = await pool.query("SELECT * FROM security_incidents ORDER BY created_at DESC LIMIT 30");

        // Compile Governance metrics
        const totalReportsRes = await pool.query("SELECT COUNT(*) FROM anonymous_integrity_reports");
        const statusRes = await pool.query("SELECT status, COUNT(*) FROM anonymous_integrity_reports GROUP BY status");
        
        const complianceData = {
            timestamp: new Date().toISOString(),
            auditChain: {
                totalEntries: parseInt(auditCountRes.rows[0].count, 10),
                isSecure: isChainSecure,
                status: isChainSecure ? "SECURE & VERIFIED (Zero Tamper Signatures)" : "TAMPER DETECTED"
            },
            evidenceChain: evidenceRes.rows,
            securityIncidents: incidentRes.rows,
            governance: {
                totalReports: parseInt(totalReportsRes.rows[0].count, 10),
                statusCounts: statusRes.rows.map(r => ({ status: r.status, count: parseInt(r.count, 10) }))
            }
        };

        if (format === "csv" || format === "excel") {
            let csv = "AAZHI COMPLIANCE CERTIFICATION RECORD\n";
            csv += `Generated On,${complianceData.timestamp}\n`;
            csv += `Audit Ledger Status,${complianceData.auditChain.status}\n`;
            csv += `Total Audit Entries,${complianceData.auditChain.totalEntries}\n\n`;

            csv += "EVIDENCE CHAIN TRACKING (LATEST 30)\n";
            csv += "Case Code,Evidence ID,Action,Timestamp,Checksum Before,Checksum After\n";
            complianceData.evidenceChain.forEach(e => {
                csv += `"${e.anonymous_case_code || 'N/A'}","${e.evidence_id}","${e.action}","${e.timestamp}","${e.checksum_before || ''}","${e.checksum_after || ''}"\n`;
            });

            csv += "\nSECURITY MONITORING LOGS (LATEST 30)\n";
            csv += "Incident Type,Severity,Created At,Resolved Status\n";
            complianceData.securityIncidents.forEach(i => {
                csv += `"${i.incident_type}","${i.severity}","${i.created_at}","${i.resolved ? 'Resolved' : 'Active'}"\n`;
            });

            res.setHeader("Content-Type", format === "csv" ? "text/csv" : "application/vnd.ms-excel");
            res.setHeader("Content-Disposition", `attachment; filename="aazhi_compliance_audit_${Date.now()}.${format === 'csv' ? 'csv' : 'xls'}"`);
            return res.send(csv);

        } else if (format === "pdf") {
            const PDFDocument = (await import("pdfkit")).default;
            const doc = new PDFDocument({ margin: 50 });
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename="aazhi_compliance_audit_${Date.now()}.pdf"`);
            doc.pipe(res);

            // Title
            doc.fontSize(20).text("AAZHI Compliance & Audit Certification", { align: "center" });
            doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`, { align: "center" });
            doc.moveDown(2);

            // Cryptographic ledger status card
            doc.fontSize(14).text("1. Cryptographic Ledger Chain Integrity Status");
            doc.rect(50, doc.y, 500, 70).stroke();
            doc.fontSize(11).text(`Ledger Verification: ${complianceData.auditChain.status}`, 60, doc.y + 10);
            doc.text(`Total Tamper-Evident Entries: ${complianceData.auditChain.totalEntries}`);
            doc.text(`Chain Status: ${complianceData.auditChain.isSecure ? 'VALIDATED' : 'WARNING - CHECK LOGS'}`);
            doc.moveDown(3);

            // Governance
            doc.fontSize(14).text("2. Report Governance Aggregation");
            doc.fontSize(11).text(`Total Integrity Cases Received: ${complianceData.governance.totalReports}`);
            complianceData.governance.statusCounts.forEach(s => {
                doc.text(` - Status [${s.status}]: ${s.count}`);
            });
            doc.moveDown(2);

            // Evidence
            doc.fontSize(14).text("3. Evidence Custody Logs Summary");
            doc.fontSize(10);
            complianceData.evidenceChain.slice(0, 10).forEach(e => {
                doc.text(`Case: ${e.anonymous_case_code || 'N/A'} | Action: ${e.action} | File: ${e.evidence_id.substring(0, 8)}... | ${new Date(e.timestamp).toLocaleDateString()}`);
            });
            doc.moveDown(2);

            // Security
            doc.fontSize(14).text("4. Security System Incidents");
            doc.fontSize(10);
            complianceData.securityIncidents.slice(0, 10).forEach(i => {
                doc.text(`Incident: ${i.incident_type} | Severity: ${i.severity} | Date: ${new Date(i.created_at).toLocaleDateString()} | ${i.resolved ? 'RESOLVED' : 'ACTIVE'}`);
            });

            doc.end();
            return;
        } else {
            return fail(res, "Unsupported compliance format.", 400);
        }
    } catch (err) {
        logger.error(`[Compliance Package Error]: ${err.message}`);
        return serverError(res, "Failed to compile compliance package.", 500);
    }
};

export const getActiveOfficers = async (req, res) => {
    try {
        if (req.user.role !== "integrity_officer" && req.user.role !== "oversight_auditor") {
            return fail(res, "Forbidden. Authorized role required.", 403);
        }

        const result = await pool.query(
            "SELECT id, username, department, role FROM officer_accounts ORDER BY username ASC"
        );

        return success(res, "Active officers retrieved successfully.", result.rows, 200);
    } catch (err) {
        logger.error(`[Get Active Officers Error]: ${err.message}`);
        return serverError(res, "Failed to retrieve active officers list.", 500);
    }
};



