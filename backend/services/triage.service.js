// ═══════════════════════════════════════════════════════════════
// V4 Intelligent Triage, Offender Registry, and Analytics Service
// ═══════════════════════════════════════════════════════════════

import { pool } from "../config/db.js";
import { decrypt } from "../utils/crypto.js";
import stringSimilarity from "string-similarity";
import { logSecurityIncident } from "./securityMonitoring.js";
import logger from "../utils/logger.js";

// Keywords lists for detection
const CORRUPTION_KEYWORDS = ["corruption", "embezzle", "nepotism", "abuse of power", "authority", "misuse of funds", "siphoned", "extortion", "funds", "divert"];
const PROCUREMENT_KEYWORDS = ["tender", "contract", "bid", "procurement", "collusion", "bidding", "inflated", "vendor", "favoritism", "specification", "kickback"];
const BRIBERY_KEYWORDS = ["bribe", "money", "cash", "demanded", "payment", "commission", "under the table", "payoff", "facilitation", "speed money"];

/**
 * Automatically triages a new whistleblower report.
 */
export async function performAITriage(reportId, category, decryptedDescription, decryptedLocation, hasEvidence, hasRetaliation, fingerprint) {
    try {
        const text = (decryptedDescription || "").toLowerCase();
        
        // 1. Detect categories/patterns
        const fraudIndicators = [];
        if (CORRUPTION_KEYWORDS.some(k => text.includes(k))) fraudIndicators.push("Potential Corruption Pattern");
        if (PROCUREMENT_KEYWORDS.some(k => text.includes(k))) fraudIndicators.push("Procurement Fraud Indicator");
        if (BRIBERY_KEYWORDS.some(k => text.includes(k))) fraudIndicators.push("Bribery Language Detected");

        // 2. Fetch past cases to find similarity and duplicates
        const allCasesRes = await pool.query(
            "SELECT id, anonymous_case_code, description, location, category, created_at, hashed_client_fingerprint FROM anonymous_integrity_reports WHERE id != $1",
            [reportId]
        );

        const similarCases = [];
        let maxSimilarity = 0;
        let duplicateProbability = 0;
        let coordinateRepeat = false;
        let coordinationSpike = false;

        const now = new Date();

        for (const other of allCasesRes.rows) {
            const otherDesc = decrypt(other.description);
            const otherLoc = other.location ? decrypt(other.location) : "";

            // Calculate description similarity
            let similarity = 0;
            if (decryptedDescription && otherDesc) {
                similarity = stringSimilarity.compareTwoStrings(decryptedDescription, otherDesc);
            }

            // Track maximum similarity
            if (similarity > maxSimilarity) {
                maxSimilarity = similarity;
            }

            // If similarity is significant, add to similarCases list
            if (similarity >= 0.4) {
                similarCases.push({
                    id: other.id,
                    caseCode: other.anonymous_case_code,
                    similarity: parseFloat(similarity.toFixed(2))
                });
            }

            // Check if exact same location is repeated
            if (decryptedLocation && otherLoc && decryptedLocation.toLowerCase().trim() === otherLoc.toLowerCase().trim()) {
                coordinateRepeat = true;
            }

            // Coordinated complaints check: same fingerprint or high similarity within 48 hours
            const timeDiffHrs = Math.abs(now - new Date(other.created_at)) / (1000 * 60 * 60);
            if (timeDiffHrs <= 48) {
                if (other.hashed_client_fingerprint === fingerprint || similarity >= 0.75) {
                    coordinationSpike = true;
                }
            }
        }

        duplicateProbability = Math.round(maxSimilarity * 100);
        if (coordinationSpike) {
            fraudIndicators.push("Potential Coordinated Complaint Detected");
        }
        if (coordinateRepeat) {
            fraudIndicators.push("Repeated Location Flagged");
        }

        // 3. Offender and entity extraction
        const accusedOfficials = [];
        const employeeIds = [];
        const contractors = [];

        // Regex helpers
        const officerRegex = /(?:Officer|Mr\.|Ms\.|Mrs\.|Inspector|Director)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/g;
        const empIdRegex = /(?:Employee ID|Emp ID|ID)[:\s]+([A-Z0-9\-]+)/gi;
        const contractorRegex = /(?:Contractor|Vendor)[:\s]+([A-Za-z0-9\-\s]{3,30})/gi;

        let match;
        while ((match = officerRegex.exec(decryptedDescription)) !== null) {
            const name = match[1].trim();
            if (!accusedOfficials.includes(name)) accusedOfficials.push(name);
        }
        while ((match = empIdRegex.exec(decryptedDescription)) !== null) {
            const idVal = match[1].trim();
            if (!employeeIds.includes(idVal)) employeeIds.push(idVal);
        }
        while ((match = contractorRegex.exec(decryptedDescription)) !== null) {
            const contr = match[1].trim();
            if (!contractors.includes(contr)) contractors.push(contr);
        }

        // 4. Update Repeat Offender Watchlist
        const allEntities = [
            ...accusedOfficials.map(val => ({ type: "Officer", value: val })),
            ...employeeIds.map(val => ({ type: "Employee ID", value: val })),
            ...contractors.map(val => ({ type: "Contractor", value: val })),
            { type: "Department", value: category }
        ];

        for (const entity of allEntities) {
            if (!entity.value) continue;
            
            // Query current registry entry
            const check = await pool.query(
                "SELECT * FROM repeat_offender_registry WHERE entity_type = $1 AND entity_value = $2",
                [entity.type, entity.value]
            );

            const caseRefObj = { case_id: reportId, timestamp: now.toISOString() };

            if (check.rows.length > 0) {
                const row = check.rows[0];
                const newCount = row.mention_count + 1;
                
                let caseRefs = Array.isArray(row.case_references) ? row.case_references : [];
                if (!caseRefs.some(c => c.case_id === reportId)) {
                    caseRefs.push(caseRefObj);
                }

                // Determine trend based on weekly counts
                const recentRefs = caseRefs.filter(c => (now - new Date(c.timestamp)) / (1000 * 60 * 60 * 24) <= 30);
                const riskTrend = recentRefs.length >= 3 ? "High Risk" : recentRefs.length >= 2 ? "Increasing" : "Stable";

                await pool.query(
                    `UPDATE repeat_offender_registry 
                     SET mention_count = $1, case_references = $2, risk_trend = $3, updated_at = NOW()
                     WHERE id = $4`,
                    [newCount, JSON.stringify(caseRefs), riskTrend, row.id]
                );

                // If mention count crosses threshold (e.g. 3), trigger watch alert
                if (newCount >= 3) {
                    fraudIndicators.push(`Accused Repeat ${entity.type} Watchlist Triggered`);
                    await logSecurityIncident(
                        "Repeat Offender Watchlist Alert",
                        "High",
                        { entityType: entity.type, entityValue: entity.value, mentions: newCount }
                    );
                }
            } else {
                await pool.query(
                    `INSERT INTO repeat_offender_registry (entity_type, entity_value, mention_count, case_references, risk_trend)
                     VALUES ($1, $2, 1, $3, 'Stable')`,
                    [entity.type, entity.value, JSON.stringify([caseRefObj])]
                );
            }
        }

        // 5. Calculate Whistleblower Protection Score & Level
        // Factors: Retaliation Risk (25), Category/Sensitivity (20), Severity (20), Evidence weight (15), Escalation level (20)
        let protectionScore = 0;
        
        if (hasRetaliation) protectionScore += 25;
        
        const catLower = (category || "").toLowerCase();
        if (catLower.includes("corruption") || catLower.includes("bribe") || catLower.includes("authority")) {
            protectionScore += 20;
        } else {
            protectionScore += 10;
        }

        if (text.includes("crore") || text.includes("lakhs") || text.includes("millions") || text.includes("huge") || text.includes("embezzled") || text.includes("siphoned")) {
            protectionScore += 20;
        } else {
            protectionScore += 10;
        }

        if (hasEvidence) {
            protectionScore += 15;
        }

        // Initial submission starts at Level 1 (+20)
        protectionScore += 20;

        let protectionLevel = "Standard";
        if (protectionScore >= 75) protectionLevel = "Critical Protection";
        else if (protectionScore >= 50) protectionLevel = "High Protection";
        else if (protectionScore >= 30) protectionLevel = "Protected";

        // Recommend priority based on score and triggers
        let recommendedPriority = "Medium";
        if (protectionScore >= 70 || duplicateProbability > 90) recommendedPriority = "Critical";
        else if (protectionScore >= 45) recommendedPriority = "High";
        else if (protectionScore >= 25) recommendedPriority = "Medium";
        else recommendedPriority = "Low";

        // AI Summary Synthesis
        let aiSummary = `Lodged under category [${category}]. `;
        if (accusedOfficials.length > 0) {
            aiSummary += `Accused Official(s): ${accusedOfficials.join(", ")}. `;
        }
        if (fraudIndicators.length > 0) {
            aiSummary += `Detected indicators: ${fraudIndicators.join(", ")}. `;
        } else {
            aiSummary += "No major fraud indicators detected.";
        }

        const triageResults = {
            fraudIndicators,
            similarCases,
            duplicateProbability,
            recommendedPriority,
            aiSummary
        };

        // 6. Save triage results, protection level & legal hold automatically
        const isLegalHold = protectionLevel === "Critical Protection" || protectionLevel === "High Protection";
        
        await pool.query(
            `UPDATE anonymous_integrity_reports 
             SET triage_results = $1, protection_score = $2, protection_level = $3, legal_hold = $4, recommended_priority = $5
             WHERE id = $6`,
            [JSON.stringify(triageResults), protectionScore, protectionLevel, isLegalHold, recommendedPriority, reportId]
        );

        logger.info(`✅ [AI TRIAGE] Completed for Case: ${reportId} (Score: ${protectionScore} | Level: ${protectionLevel} | Priority: ${recommendedPriority})`);
        return triageResults;

    } catch (e) {
        logger.error(`❌ [AI TRIAGE ERROR] Triage execution failed: ${e.message}`);
        return null;
    }
}
