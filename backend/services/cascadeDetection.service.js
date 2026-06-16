import { pool } from "../config/db.js";
import logger from "../utils/logger.js";
import { predictRootCause } from "./rootCausePrediction.service.js";

// Coordinated SLA deadline (72 hours in milliseconds)
const SHARED_SLA_DURATION_MS = 72 * 60 * 60 * 1000;

// Infrastructure department dependency mapping weights
const DEPENDENCY_WEIGHTS = {
    'Water_Roads': 20,
    'Roads_Water': 20,
    'Electricity_Roads': 20,
    'Roads_Electricity': 20,
    'Gas_Roads': 20,
    'Roads_Gas': 20,
    'Water_Electricity': 15,
    'Electricity_Water': 15,
    'Water_Gas': 15,
    'Gas_Water': 15,
    'Gas_Electricity': 10,
    'Electricity_Gas': 10,
};

// Key overlapping words that indicate a shared event
const INFRA_KEYWORDS = ["pipe", "outage", "leak", "excavation", "burst", "dig", "road", "pothole", "spark", "cable", "wire", "drain", "water", "gas", "pressure"];

/**
 * Calculates distance between two coordinates in meters using the Haversine formula
 */
export const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
              
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
};

/**
 * Calculates relationship cascade score (0-100) between two complaints
 */
export const calculateCascadeScore = (complaintA, complaintB) => {
    let score = 0;

    // 1. Geographic Correlation (Max: 55 points)
    // Ward Match
    if (complaintA.ward && complaintB.ward && complaintA.ward === complaintB.ward) {
        score += 25;
    }

    // Exact Geo Radius Match
    if (complaintA.latitude && complaintA.longitude && complaintB.latitude && complaintB.longitude) {
        const dist = calculateHaversineDistance(
            parseFloat(complaintA.latitude), parseFloat(complaintA.longitude),
            parseFloat(complaintB.latitude), parseFloat(complaintB.longitude)
        );

        if (dist <= 100) score += 30;
        else if (dist <= 300) score += 20;
        else if (dist <= 500) score += 10;
    } else {
        // Fallback: Check if subjects/descriptions contain the same locality/sector keyword
        const descA = (complaintA.description || "").toLowerCase();
        const descB = (complaintB.description || "").toLowerCase();
        const sectorMatch = descA.match(/sector\s*\d+|ward\s*\d+/g);
        const sectorMatchB = descB.match(/sector\s*\d+|ward\s*\d+/g);
        
        if (sectorMatch && sectorMatchB && sectorMatch[0] === sectorMatchB[0]) {
            score += 15;
        }
    }

    // 2. Temporal Correlation (Max: 25 points)
    const timeA = new Date(complaintA.created_at).getTime();
    const timeB = new Date(complaintB.created_at).getTime();
    const timeDiffMs = Math.abs(timeA - timeB);
    const timeDiffHours = timeDiffMs / (1000 * 60 * 60);

    if (timeDiffHours <= 2) score += 25;
    else if (timeDiffHours <= 12) score += 20;
    else if (timeDiffHours <= 24) score += 15;
    else if (timeDiffHours <= 48) score += 10;

    // 3. Infrastructure Dependency (Max: 20 points)
    const deptA = complaintA.department || "";
    const deptB = complaintB.department || "";
    if (deptA === deptB) {
        score += 20;
    } else {
        const depKey = `${deptA}_${deptB}`;
        const depKeyRev = `${deptB}_${deptA}`;
        score += DEPENDENCY_WEIGHTS[depKey] || DEPENDENCY_WEIGHTS[depKeyRev] || 0;
    }

    // 4. Keyword Overlap (Max: 10 points)
    const subA = (complaintA.subject || "").toLowerCase();
    const subB = (complaintB.subject || "").toLowerCase();
    const txtA = `${subA} ${(complaintA.description || "").toLowerCase()}`;
    const txtB = `${subB} ${(complaintB.description || "").toLowerCase()}`;
    
    let keywordOverlapCount = 0;
    INFRA_KEYWORDS.forEach(kw => {
        if (txtA.includes(kw) && txtB.includes(kw)) {
            keywordOverlapCount++;
        }
    });

    if (keywordOverlapCount >= 3) score += 10;
    else if (keywordOverlapCount >= 1) score += 5;

    return Math.min(score, 100);
};

/**
 * Checks a newly registered complaint, detects cascade overlaps, and manages clustering
 */
export const checkAndClusterComplaint = async (newComplaintId) => {
    try {
        logger.info(`🔍 [CCI Engine] Analyzing complaint ${newComplaintId} for cascade correlations...`);
        
        // 1. Fetch newly registered complaint details
        const { rows: newCompRows } = await pool.query(
            "SELECT * FROM complaints WHERE id = $1",
            [newComplaintId]
        );
        if (newCompRows.length === 0) return null;
        const newComp = newCompRows[0];

        // 2. Query other open complaints in the same ward within last 48 hours
        const { rows: candidateComplaints } = await pool.query(
            `SELECT * FROM complaints 
             WHERE id != $1 
               AND status NOT IN ('resolved', 'rejected', 'closed')
               AND ward = $2
               AND created_at >= NOW() - INTERVAL '48 hours'
             ORDER BY created_at DESC`,
            [newComp.id, newComp.ward]
        );

        logger.info(`🔍 [CCI Engine] Found ${candidateComplaints.length} candidate complaints in ward ${newComp.ward} within 48h`);

        // 3. Score candidates and filter ones >= 75 threshold
        const matchingComplaints = [];
        for (const candidate of candidateComplaints) {
            const score = calculateCascadeScore(newComp, candidate);
            logger.info(`   - Ticket ${candidate.ticket_number}: Score = ${score}`);
            if (score >= 75) {
                matchingComplaints.push({
                    complaint: candidate,
                    score: score
                });
            }
        }

        if (matchingComplaints.length === 0) {
            logger.info(`   - No cascade correlation detected above threshold (75).`);
            return { detected: false };
        }

        logger.info(`💥 [CCI Engine] Detected cascade correlation with ${matchingComplaints.length} existing tickets!`);

        // 4. Determine if we join an existing cluster or create a new one
        let targetClusterId = null;
        let targetClusterCode = null;

        // Check if any matching complaint is already in an active cluster
        const matchedCompIds = matchingComplaints.map(m => m.complaint.id);
        const { rows: existingClusterMappings } = await pool.query(
            `SELECT cc.*, ic.cluster_code, ic.status
             FROM cluster_complaints cc
             JOIN infrastructure_clusters ic ON cc.cluster_id = ic.id
             WHERE cc.complaint_id = ANY($1) AND ic.status IN ('active', 'in_progress')
             LIMIT 1`,
            [matchedCompIds]
        );

        const client = await pool.connect();
        try {
            await client.query("BEGIN");

            if (existingClusterMappings.length > 0) {
                // Join existing cluster
                targetClusterId = existingClusterMappings[0].cluster_id;
                targetClusterCode = existingClusterMappings[0].cluster_code;
                logger.info(`🔗 [CCI Engine] Adding to existing cluster ${targetClusterCode} (ID: ${targetClusterId})`);

                // Insert mapping for new complaint
                const relationScore = matchingComplaints.find(m => matchedCompIds.includes(m.complaint.id))?.score || 75.00;
                await client.query(
                    `INSERT INTO cluster_complaints (cluster_id, complaint_id, department, relationship_score)
                     VALUES ($1, $2, $3, $4)
                     ON CONFLICT DO NOTHING`,
                    [targetClusterId, newComp.id, newComp.department, relationScore]
                );
            } else {
                // Create a new cluster
                const currentYear = new Date().getFullYear();
                const randomCode = Math.floor(1000 + Math.random() * 9000);
                targetClusterCode = `ARC-${currentYear}-${randomCode}`;
                
                // Derive locality from description if possible (simple regex)
                let locality = "Sector 4"; // Default
                const locMatch = (newComp.description || "").match(/(sector\s*\d+|locality\s*\w+|street\s*\d+)/i);
                if (locMatch) locality = locMatch[0];

                logger.info(`🆕 [CCI Engine] Creating a new cluster ${targetClusterCode}...`);
                const { rows: clusterRows } = await client.query(
                    `INSERT INTO infrastructure_clusters 
                     (id, cluster_code, root_cause_category, ward_id, locality, status, severity)
                     VALUES (uuid_generate_v4(), $1, 'Pending Triage', $2, $3, 'active', 'medium')
                     RETURNING *`,
                    [targetClusterCode, newComp.ward, locality]
                );
                
                targetClusterId = clusterRows[0].id;

                // Add mapping for the new complaint
                await client.query(
                    `INSERT INTO cluster_complaints (cluster_id, complaint_id, department, relationship_score)
                     VALUES ($1, $2, $3, 100.00)`,
                    [targetClusterId, newComp.id, newComp.department]
                );

                // Add mapping for all other matched complaints
                for (const match of matchingComplaints) {
                    await client.query(
                        `INSERT INTO cluster_complaints (cluster_id, complaint_id, department, relationship_score)
                         VALUES ($1, $2, $3, $4)`,
                        [targetClusterId, match.complaint.id, match.complaint.department, match.score]
                    );
                }
            }

            // 5. Gather all complaints currently in this cluster
            const { rows: allClusteredComps } = await client.query(
                `SELECT c.* FROM complaints c
                 JOIN cluster_complaints cc ON c.id = cc.complaint_id
                 WHERE cc.cluster_id = $1`,
                [targetClusterId]
            );

            // 6. Predict Root Cause and Affected Departments
            const prediction = await predictRootCause(allClusteredComps);
            
            // Determine severity based on number of complaints and departments
            let severity = "medium";
            if (allClusteredComps.length >= 4) severity = "critical";
            else if (allClusteredComps.length >= 3) severity = "high";

            // Update cluster info
            await client.query(
                `UPDATE infrastructure_clusters 
                 SET root_cause_category = $1, severity = $2, updated_at = NOW()
                 WHERE id = $3`,
                [prediction.predictedRootCause, severity, targetClusterId]
            );

            // 7. Establish Coordinated SLA deadlines for affected departments
            const slaDeadline = new Date(Date.now() + SHARED_SLA_DURATION_MS);
            
            for (const dept of prediction.affectedDepartments) {
                await client.query(
                    `INSERT INTO cluster_departments (cluster_id, department_name, sla_deadline, completion_status)
                     VALUES ($1, $2, $3, 'pending')
                     ON CONFLICT (cluster_id, department_name) DO NOTHING`,
                    [targetClusterId, dept, slaDeadline]
                );
            }

            // 8. Create a unified notification update message in the chat feed of all complaints in the cluster
            const formattedDepts = prediction.affectedDepartments.join(", ");
            const notificationText = `⚠️ Area Coordinated Event Detected!
This ticket has been linked to a shared infrastructure incident: ${prediction.predictedRootCause} (${targetClusterCode}).
Unified Coordinated Recovery is in progress. Affected departments: ${formattedDepts}.
Coordinated SLA Deadline: ${slaDeadline.toLocaleString('en-IN')}`;

            for (const comp of allClusteredComps) {
                // Ensure message wasn't already posted
                const { rows: existingMsg } = await client.query(
                    "SELECT id FROM messages WHERE complaint_id = $1 AND text LIKE $2",
                    [comp.id, `%${targetClusterCode}%`]
                );
                if (existingMsg.length === 0) {
                    await client.query(
                        `INSERT INTO messages (complaint_id, sender_type, text, created_at)
                         VALUES ($1, 'authority', $2, NOW())`,
                        [comp.id, notificationText]
                    );
                }
            }

            await client.query("COMMIT");

            logger.info(`✅ [CCI Engine] Cluster ${targetClusterCode} updated successfully.`);
            
            return {
                detected: true,
                cluster_id: targetClusterId,
                cluster_code: targetClusterCode,
                root_cause: prediction.predictedRootCause,
                severity: severity,
                message: `We have identified ${allClusteredComps.length - 1} related civic issues in your area. These may be linked to a common infrastructure event (${prediction.predictedRootCause}). Departments are being coordinated through a unified recovery workflow.`
            };

        } catch (txErr) {
            await client.query("ROLLBACK");
            logger.error(`❌ [CCI Engine] Transaction failed: ${txErr.message}`);
            throw txErr;
        } finally {
            client.release();
        }

    } catch (err) {
        logger.error(`❌ [CCI Engine] Cascade clustering error: ${err.message}`);
        return null;
    }
};

/**
 * Automatically evaluates if a department completed all its mapped tickets in the cluster
 */
export const syncClusterCompletionStatus = async (complaintId) => {
    try {
        // Check if complaint is part of a cluster
        const { rows: mappings } = await pool.query(
            "SELECT * FROM cluster_complaints WHERE complaint_id = $1",
            [complaintId]
        );
        if (mappings.length === 0) return;

        const clusterId = mappings[0].cluster_id;
        const dept = mappings[0].department;

        logger.info(`🔄 [CCI Sync] Syncing completion status for cluster ${clusterId}, department: ${dept}`);

        // Get all complaints of this department in the cluster
        const { rows: deptComplaints } = await pool.query(
            `SELECT c.status FROM complaints c
             JOIN cluster_complaints cc ON c.id = cc.complaint_id
             WHERE cc.cluster_id = $1 AND cc.department = $2`,
            [clusterId, dept]
        );

        // If all are resolved or closed, mark department as completed
        const allCompleted = deptComplaints.every(c => c.status === 'resolved' || c.status === 'closed' || c.status === 'rejected');
        
        if (allCompleted) {
            await pool.query(
                `UPDATE cluster_departments 
                 SET completion_status = 'completed'
                 WHERE cluster_id = $1 AND department_name = $2`,
                [clusterId, dept]
            );
            logger.info(`✅ [CCI Sync] Marked department ${dept} as COMPLETED in cluster ${clusterId}`);

            // If all departments in the cluster are completed, mark the cluster as resolved
            const { rows: allDepts } = await pool.query(
                "SELECT completion_status FROM cluster_departments WHERE cluster_id = $1",
                [clusterId]
            );

            const allClusterDeptsDone = allDepts.every(d => d.completion_status === 'completed');
            if (allClusterDeptsDone) {
                await pool.query(
                    `UPDATE infrastructure_clusters 
                     SET status = 'resolved', updated_at = NOW()
                     WHERE id = $1`,
                    [clusterId]
                );
                logger.info(`🎉 [CCI Sync] All departments resolved! Cluster ${clusterId} is RESOLVED`);
            }
        } else {
            // Revert completed status if a ticket was reopened
            await pool.query(
                `UPDATE cluster_departments 
                 SET completion_status = 'pending'
                 WHERE cluster_id = $1 AND department_name = $2`,
                [clusterId, dept]
            );
            await pool.query(
                `UPDATE infrastructure_clusters 
                 SET status = 'in_progress', updated_at = NOW()
                 WHERE id = $1 AND status = 'resolved'`,
                [clusterId]
            );
        }
    } catch (err) {
        logger.error(`❌ [CCI Sync] Error syncing cluster completion: ${err.message}`);
    }
};
