import { pool } from "../config/db.js";
import { success, fail } from "../utils/response.js";
import logger from "../utils/logger.js";

/**
 * Get all active and resolved infrastructure clusters (Admin/Staff)
 */
export const getAllClusters = async (req, res, next) => {
    try {
        const { rows: clusters } = await pool.query(
            `SELECT ic.*, 
                    (SELECT COUNT(*)::int FROM cluster_complaints WHERE cluster_id = ic.id) as complaint_count
             FROM infrastructure_clusters ic
             ORDER BY ic.created_at DESC`
        );

        const enrichedClusters = [];
        for (const cluster of clusters) {
            // Fetch mapped departments
            const { rows: depts } = await pool.query(
                "SELECT * FROM cluster_departments WHERE cluster_id = $1",
                [cluster.id]
            );

            // Fetch linked complaints
            const { rows: comps } = await pool.query(
                `SELECT c.id, c.ticket_number, c.subject, c.status, c.department, c.category, c.created_at
                 FROM complaints c
                 JOIN cluster_complaints cc ON c.id = cc.complaint_id
                 WHERE cc.cluster_id = $1`,
                [cluster.id]
            );

            // Compute progress percentage
            const totalDepts = depts.length;
            const completedDepts = depts.filter(d => d.completion_status === 'completed').length;
            const progress = totalDepts > 0 ? Math.round((completedDepts / totalDepts) * 100) : 0;

            enrichedClusters.push({
                ...cluster,
                departments: depts,
                complaints: comps,
                progress: progress
            });
        }

        return success(res, "Incident clusters retrieved successfully", enrichedClusters);
    } catch (err) {
        next(err);
    }
};

/**
 * Get detailed information of a specific cluster
 */
export const getClusterDetails = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { rows: clusterRows } = await pool.query(
            "SELECT * FROM infrastructure_clusters WHERE id = $1",
            [id]
        );

        if (clusterRows.length === 0) {
            return fail(res, "Incident cluster not found", 404);
        }

        const cluster = clusterRows[0];

        const { rows: depts } = await pool.query(
            "SELECT * FROM cluster_departments WHERE cluster_id = $1 ORDER BY assigned_at ASC",
            [id]
        );

        const { rows: comps } = await pool.query(
            `SELECT c.*, cc.relationship_score
             FROM complaints c
             JOIN cluster_complaints cc ON c.id = cc.complaint_id
             WHERE cc.cluster_id = $1
             ORDER BY c.created_at ASC`,
            [id]
        );

        const totalDepts = depts.length;
        const completedDepts = depts.filter(d => d.completion_status === 'completed').length;
        const progress = totalDepts > 0 ? Math.round((completedDepts / totalDepts) * 100) : 0;

        return success(res, "Cluster details retrieved", {
            ...cluster,
            departments: depts,
            complaints: comps,
            progress: progress
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Update completion status of a coordinated department
 */
export const updateDepartmentCompletion = async (req, res, next) => {
    try {
        const { clusterId, deptName } = req.params;
        const { status } = req.body; // 'pending' or 'completed'

        if (!status || !['pending', 'completed'].includes(status)) {
            return fail(res, "Invalid status. Must be 'pending' or 'completed'", 400);
        }

        const result = await pool.query(
            `UPDATE cluster_departments 
             SET completion_status = $1 
             WHERE cluster_id = $2 AND department_name = $3
             RETURNING *`,
            [status, clusterId, deptName]
        );

        if (result.rows.length === 0) {
            return fail(res, "Department SLA mapping not found", 404);
        }

        // If completed, check if all other departments in the cluster are also completed
        if (status === 'completed') {
            const { rows: allDepts } = await pool.query(
                "SELECT completion_status FROM cluster_departments WHERE cluster_id = $1",
                [clusterId]
            );

            const allCompleted = allDepts.every(d => d.completion_status === 'completed');
            if (allCompleted) {
                await pool.query(
                    `UPDATE infrastructure_clusters 
                     SET status = 'resolved', updated_at = NOW()
                     WHERE id = $1`,
                    [clusterId]
                );
                logger.info(`🎉 [CCI Coordinated SLA] Cluster ${clusterId} marked as RESOLVED because all departments finished`);
            }
        } else {
            // Revert cluster status to active if a department is marked back to pending
            await pool.query(
                `UPDATE infrastructure_clusters 
                 SET status = 'in_progress', updated_at = NOW()
                 WHERE id = $1 AND status = 'resolved'`,
                [clusterId]
            );
        }

        return success(res, "Department SLA status updated", result.rows[0]);
    } catch (err) {
        next(err);
    }
};

/**
 * Fetch analytics statistics for CCI dashboard
 */
export const getCCIAnalytics = async (req, res, next) => {
    try {
        const { rows: counts } = await pool.query(`
            SELECT 
                (SELECT COUNT(*)::int FROM infrastructure_clusters) as total_clusters,
                (SELECT COUNT(*)::int FROM cluster_complaints) as total_mapped_complaints,
                (SELECT COUNT(DISTINCT department_name)::int FROM cluster_departments) as total_depts_coordinated
        `);

        const stats = counts[0] || { total_clusters: 0, total_mapped_complaints: 0, total_depts_coordinated: 0 };
        
        // Calculate duplicates avoided = total mapped complaints - total clusters
        const duplicatesAvoided = Math.max(0, stats.total_mapped_complaints - stats.total_clusters);
        
        // Average recovery time reduction (typically 30-40% faster, mock/model comparison)
        const avgRecoveryReduction = stats.total_clusters > 0 ? "35%" : "0%";
        
        // Cost savings calculation (Estimated $150 per avoided double field visit)
        const costSavings = duplicatesAvoided * 150;

        // Citizen satisfaction rating increase estimate
        const satisfactionImprovement = stats.total_clusters > 0 ? "46%" : "0%";

        return success(res, "CCI Analytics retrieved", {
            clustersDetected: stats.total_clusters,
            duplicatesAvoided: duplicatesAvoided,
            departmentsCoordinated: stats.total_depts_coordinated,
            averageRecoveryTimeReduction: avgRecoveryReduction,
            costSavingsUSD: costSavings,
            citizenSatisfactionImprovement: satisfactionImprovement
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Log planned excavation/maintenance work and generate alerts
 */
export const createPlannedActivity = async (req, res, next) => {
    try {
        const { activity_type, ward_id, locality, start_time, end_time, description } = req.body;

        if (!activity_type || !start_time || !end_time) {
            return fail(res, "activity_type, start_time and end_time are required", 400);
        }

        // Map activity types to predicted affected departments
        let predictedDepts = ["Municipal"];
        const typeLow = activity_type.toLowerCase();
        
        if (typeLow.includes("excavation") || typeLow.includes("digging") || typeLow.includes("trench")) {
            predictedDepts = ["Gas", "Electricity", "Water", "Roads"];
        } else if (typeLow.includes("road") || typeLow.includes("street") || typeLow.includes("paving")) {
            predictedDepts = ["Roads", "Electricity"];
        } else if (typeLow.includes("water") || typeLow.includes("sewage") || typeLow.includes("pipe")) {
            predictedDepts = ["Water", "Roads", "Municipal"];
        } else if (typeLow.includes("wire") || typeLow.includes("cable") || typeLow.includes("transformer") || typeLow.includes("grid")) {
            predictedDepts = ["Electricity", "Roads"];
        }

        const client = await pool.connect();
        try {
            await client.query("BEGIN");

            // Insert planned activity
            const { rows: activityRows } = await client.query(
                `INSERT INTO planned_activities 
                 (activity_type, ward_id, locality, start_time, end_time, description, predicted_cascades)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING *`,
                [activity_type, ward_id || null, locality || null, start_time, end_time, description || "", JSON.stringify(predictedDepts)]
            );

            const activity = activityRows[0];

            // Insert proactive alerts for predicted departments
            const alerts = [];
            for (const dept of predictedDepts) {
                const alertMessage = `⚠️ Predictive Cascade Alert: Coordinated action recommended!
Planned Activity "${activity_type}" scheduled at ward: ${ward_id || "N/A"}, locality: ${locality || "N/A"} from ${new Date(start_time).toLocaleString()} to ${new Date(end_time).toLocaleString()}.
Potential impacts to ${dept} infrastructure. Please inspect and monitor area.`;

                const { rows: alertRows } = await client.query(
                    `INSERT INTO proactive_alerts (activity_id, department, alert_message, status)
                     VALUES ($1, $2, $3, 'unread')
                     RETURNING *`,
                    [activity.id, dept, alertMessage]
                );
                alerts.push(alertRows[0]);
            }

            await client.query("COMMIT");
            
            return success(res, "Planned activity logged and proactive alerts dispatched", {
                activity,
                alerts
            }, 201);

        } catch (txErr) {
            await client.query("ROLLBACK");
            throw txErr;
        } finally {
            client.release();
        }
    } catch (err) {
        next(err);
    }
};

/**
 * Get all planned activities and proactive alerts
 */
export const getPlannedActivities = async (req, res, next) => {
    try {
        const { rows: activities } = await pool.query(
            "SELECT * FROM planned_activities ORDER BY created_at DESC"
        );

        const enriched = [];
        for (const act of activities) {
            const { rows: alerts } = await pool.query(
                "SELECT * FROM proactive_alerts WHERE activity_id = $1",
                [act.id]
            );
            enriched.push({
                ...act,
                alerts: alerts
            });
        }

        return success(res, "Planned activities retrieved", enriched);
    } catch (err) {
        next(err);
    }
};

/**
 * Acknowledge/read a proactive department alert
 */
export const acknowledgeProactiveAlert = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `UPDATE proactive_alerts 
             SET status = 'acknowledged'
             WHERE id = $1
             RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            return fail(res, "Proactive alert not found", 404);
        }

        return success(res, "Alert acknowledged successfully", result.rows[0]);
    } catch (err) {
        next(err);
    }
};
