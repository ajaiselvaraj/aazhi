import emergencyService from "../services/emergency.service.js";
import { emitEmergencyModeChange, emitEmergencyBroadcast } from "../socket.js";
import logger from "../utils/logger.js";

class EmergencyController {
    // PUBLIC API
    async getStatus(req, res) {
        try {
            const status = await emergencyService.getStatus();
            res.status(200).json({ success: true, data: status });
        } catch (error) {
            logger.error(`Error in getStatus: ${error.message}`);
            res.status(500).json({ success: false, message: "Failed to fetch emergency status" });
        }
    }

    async getBroadcasts(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 10;
            const broadcasts = await emergencyService.getBroadcasts(limit);
            res.status(200).json({ success: true, data: broadcasts });
        } catch (error) {
            logger.error(`Error in getBroadcasts: ${error.message}`);
            res.status(500).json({ success: false, message: "Failed to fetch broadcasts" });
        }
    }

    async getReliefCenters(req, res) {
        try {
            const type = req.query.type;
            const centers = await emergencyService.getReliefCenters(type);
            res.status(200).json({ success: true, data: centers });
        } catch (error) {
            logger.error(`Error in getReliefCenters: ${error.message}`);
            res.status(500).json({ success: false, message: "Failed to fetch relief centers" });
        }
    }

    // ADMIN API
    async activateMode(req, res) {
        try {
            const { modeType, message } = req.body;
            const adminId = req.user?.id || null; // Requires admin middleware to populate req.user

            if (!modeType) {
                return res.status(400).json({ success: false, message: "modeType is required" });
            }

            const newMode = await emergencyService.setMode(modeType, message, adminId);
            
            // Emit Socket event globally
            emitEmergencyModeChange({
                mode_type: newMode.mode_type,
                is_active: newMode.is_active,
                message: newMode.emergency_message
            });

            res.status(200).json({ success: true, message: "Emergency mode activated", data: newMode });
        } catch (error) {
            logger.error(`Error in activateMode: ${error.message}`);
            res.status(500).json({ success: false, message: "Failed to activate emergency mode" });
        }
    }

    async deactivateMode(req, res) {
        try {
            const adminId = req.user?.id || null;
            const newMode = await emergencyService.setMode('normal', 'System operating normally', adminId);

            // Emit Socket event globally
            emitEmergencyModeChange({
                mode_type: newMode.mode_type,
                is_active: newMode.is_active,
                message: newMode.emergency_message
            });

            res.status(200).json({ success: true, message: "Emergency mode deactivated", data: newMode });
        } catch (error) {
            logger.error(`Error in deactivateMode: ${error.message}`);
            res.status(500).json({ success: false, message: "Failed to deactivate emergency mode" });
        }
    }

    async addBroadcast(req, res) {
        try {
            const { title, message, severity, type } = req.body;
            const adminId = req.user?.id || null;

            if (!message) {
                return res.status(400).json({ success: false, message: "Message is required" });
            }

            const broadcast = await emergencyService.addBroadcast(title, message, severity, type, adminId);

            // Emit socket event
            emitEmergencyBroadcast({
                id: broadcast.id,
                title: broadcast.title,
                message: broadcast.message,
                severity: broadcast.severity,
                type: broadcast.broadcast_type
            });

            res.status(201).json({ success: true, message: "Broadcast sent", data: broadcast });
        } catch (error) {
            logger.error(`Error in addBroadcast: ${error.message}`);
            res.status(500).json({ success: false, message: "Failed to send broadcast" });
        }
    }

    async addReliefCenter(req, res) {
        try {
            const { centerName, address, ward, phone, emergencyType } = req.body;

            if (!centerName || !address) {
                return res.status(400).json({ success: false, message: "centerName and address are required" });
            }

            const center = await emergencyService.addReliefCenter(centerName, address, ward, phone, emergencyType);
            res.status(201).json({ success: true, message: "Relief center added", data: center });
        } catch (error) {
            logger.error(`Error in addReliefCenter: ${error.message}`);
            res.status(500).json({ success: false, message: "Failed to add relief center" });
        }
    }

    async deleteReliefCenter(req, res) {
        try {
            const { id } = req.params;
            const success = await emergencyService.deleteReliefCenter(id);
            if (!success) {
                return res.status(404).json({ success: false, message: "Relief center not found" });
            }

            // Emit a signal to frontends to refetch data
            emitEmergencyModeChange({ refetchOnly: true });

            res.status(200).json({ success: true, message: "Relief center deleted" });
        } catch (error) {
            logger.error(`Error in deleteReliefCenter: ${error.message}`);
            res.status(500).json({ success: false, message: "Failed to delete relief center" });
        }
    }
}

export default new EmergencyController();
