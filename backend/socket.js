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

        // Client subscribes to a specific tracking room (complaint or service request)
        socket.on("track:join", (id) => {
            if (id) {
                const room1 = `complaint:${id}`;
                const room2 = `service_request:${id}`;
                socket.join(room1);
                socket.join(room2);
                logger.info(`[Socket.IO] ${socket.id} joined tracking rooms for ${id}`);
                socket.emit("track:joined", { id, room: room1 });
            }
        });

        // Client leaves the tracking room
        socket.on("track:leave", (id) => {
            if (id) {
                const room1 = `complaint:${id}`;
                const room2 = `service_request:${id}`;
                socket.leave(room1);
                socket.leave(room2);
                logger.info(`[Socket.IO] ${socket.id} left tracking rooms for ${id}`);
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
 * Emit a service request status update to all clients tracking that request.
 */
export function emitServiceRequestStatusUpdate(requestId, payload) {
    if (!io) return;
    const room = `service_request:${requestId}`;
    // Also emit complaint:statusUpdated for compatibility with the frontend tracker client
    io.to(room).emit("serviceRequest:statusUpdated", {
        requestId,
        timestamp: new Date().toISOString(),
        ...payload,
    });
    io.to(room).emit("complaint:statusUpdated", {
        complaintId: requestId,
        timestamp: new Date().toISOString(),
        ...payload,
    });
    logger.info(`[Socket.IO] Emitted status updates to room ${room}`);
}

/**
 * Emit a service request timeline event.
 */
export function emitServiceRequestTimelineUpdate(requestId, payload) {
    if (!io) return;
    const room = `service_request:${requestId}`;
    io.to(room).emit("serviceRequest:timelineUpdated", {
        requestId,
        timestamp: new Date().toISOString(),
        ...payload,
    });
    io.to(room).emit("complaint:timelineUpdated", {
        complaintId: requestId,
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
