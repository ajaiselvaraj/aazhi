import { pool } from "../config/db.js";

class EmergencyService {
    async getStatus() {
        const query = `
            SELECT id, mode_type, is_active, emergency_message, activated_at 
            FROM system_modes 
            ORDER BY created_at DESC 
            LIMIT 1
        `;
        const result = await pool.query(query);
        return result.rows[0];
    }

    async getBroadcasts(limit = 10) {
        const query = `
            SELECT id, title, message, severity, broadcast_type, created_at 
            FROM emergency_broadcasts 
            ORDER BY created_at DESC 
            LIMIT $1
        `;
        const result = await pool.query(query, [limit]);
        return result.rows;
    }

    async getReliefCenters(emergencyType) {
        let query = `
            SELECT id, center_name, address, ward, phone, emergency_type, is_active 
            FROM relief_centers 
            WHERE is_active = true
        `;
        const params = [];
        if (emergencyType) {
            query += ` AND emergency_type = $1`;
            params.push(emergencyType);
        }
        query += ` ORDER BY created_at DESC`;
        
        const result = await pool.query(query, params);
        return result.rows;
    }

    async setMode(modeType, message, adminId) {
        // Deactivate all modes first (though there's only one active mode at a time conceptually, 
        // the design says we insert a new record to keep history)
        const query = `
            INSERT INTO system_modes (mode_type, is_active, emergency_message, activated_by, activated_at)
            VALUES ($1, $2, $3, $4, NOW())
            RETURNING id, mode_type, is_active, emergency_message, activated_at
        `;
        const result = await pool.query(query, [modeType, modeType !== 'normal', message, adminId]);
        return result.rows[0];
    }

    async addBroadcast(title, message, severity, type, adminId) {
        const query = `
            INSERT INTO emergency_broadcasts (title, message, severity, broadcast_type, created_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, title, message, severity, broadcast_type, created_at
        `;
        const result = await pool.query(query, [title, message, severity, type, adminId]);
        return result.rows[0];
    }

    async addReliefCenter(centerName, address, ward, phone, type) {
        const query = `
            INSERT INTO relief_centers (center_name, address, ward, phone, emergency_type, is_active)
            VALUES ($1, $2, $3, $4, $5, true)
            RETURNING id, center_name, address, ward, phone, emergency_type, is_active
        `;
        const result = await pool.query(query, [centerName, address, ward, phone, type]);
        return result.rows[0];
    }

    async deleteReliefCenter(id) {
        const query = `DELETE FROM relief_centers WHERE id = $1 RETURNING id`;
        const result = await pool.query(query, [id]);
        return result.rowCount > 0;
    }
}

export default new EmergencyService();
