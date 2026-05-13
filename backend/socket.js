// ═══════════════════════════════════════════════════════════════
// SUVIDHA KIOSK — Socket.IO Plug-in Layer
// This module initialises Socket.IO on the existing HTTP server.
// It exports helpers that the rest of the app can call to emit
// real-time events WITHOUT changing core business logic.
// ═══════════════════════════════════════════════════════════════

import { Server as SocketIOServer } from "socket.io";
import logger from "./utils/logger.js";

let io = null;

/**
 * Attach Socket.IO to an existing http.Server instance.
 * Call this once from server.js AFTER app.listen().
 */
export function initSocketIO(httpServer, allowedOrigins = []) {
    io = new SocketIOServer(httpServer, {
        cors: {
            // Allow all origins in local/kiosk mode so phones on same WiFi can connect.
            // In production, restrict by setting FRONTEND_URL env var.
            origin: allowedOrigins.length > 0 ? true : true,
            methods: ["GET", "POST"],
            credentials: true,
        },
        transports: ["websocket", "polling"],
    });

    io.on("connection", (socket) => {
        logger.info(`[Socket.IO] Client connected: ${socket.id}`);

        // Client subscribes to a specific complaint room
        socket.on("track:join", (complaintId) => {
            if (complaintId) {
                const room = `complaint:${complaintId}`;
                socket.join(room);
                logger.info(`[Socket.IO] ${socket.id} joined room ${room}`);
                socket.emit("track:joined", { complaintId, room });
            }
        });

        // Client leaves a complaint room
        socket.on("track:leave", (complaintId) => {
            if (complaintId) {
                const room = `complaint:${complaintId}`;
                socket.leave(room);
                logger.info(`[Socket.IO] ${socket.id} left room ${room}`);
            }
        });

        socket.on("disconnect", (reason) => {
            logger.info(`[Socket.IO] Client disconnected: ${socket.id} (${reason})`);
        });
    });

    logger.info("[Socket.IO] Server initialised and attached to HTTP server.");
    return io;
}

/**
 * Emit a complaint status update to all clients tracking that complaint.
 * Called from complaint.controller.js after a status change.
 */
export function emitComplaintStatusUpdate(complaintId, payload) {
    if (!io) return;
    const room = `complaint:${complaintId}`;
    io.to(room).emit("complaint:statusUpdated", {
        complaintId,
        timestamp: new Date().toISOString(),
        ...payload,
    });
    logger.info(`[Socket.IO] Emitted complaint:statusUpdated to room ${room}`);
}

/**
 * Emit a timeline event (new stage added / note updated).
 */
export function emitComplaintTimelineUpdate(complaintId, payload) {
    if (!io) return;
    const room = `complaint:${complaintId}`;
    io.to(room).emit("complaint:timelineUpdated", {
        complaintId,
        timestamp: new Date().toISOString(),
        ...payload,
    });
}

/**
 * Generic broadcast to a specific complaint room.
 */
export function emitToComplaintRoom(complaintId, event, payload) {
    if (!io) return;
    const room = `complaint:${complaintId}`;
    io.to(room).emit(event, { complaintId, ...payload });
}

export function getIO() {
    return io;
}
