import { apiClient } from './api/apiClient';

// --- SYSTEM API SERVICE ---
// Handles hardware telemetry, health checks, and kiosk-specific metrics
export const SystemService = {
    /**
     * Sends a heartbeat signal to the backend to indicate the kiosk is online.
     * @param data Details about the physical kiosk status (battery, etc.)
     */
    sendHeartbeat: async (data: {
        terminalId: string;
        batteryLevel: number | null;
        isCharging: boolean;
        timestamp: string;
    }) => {
        try {
            // Using apiClient ensures it points to VITE_API_URL and includes headers
            await apiClient.post('/system/heartbeat', data);
            
            // Note: If you don't actually have a /system/heartbeat route in Express yet,
            // this will still cleanly catch and log an error rather than crashing.
        } catch (err: any) {
            console.warn("⚠️ [System] Heartbeat ping failed:", err.message || err);
        }
    }
};
