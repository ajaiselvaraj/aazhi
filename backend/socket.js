// ═══════════════════════════════════════════════════════════════
// SUVIDHA KIOSK — Socket.IO Plug-in Layer
// This module initialises Socket.IO on the existing HTTP server.
// It exports helpers that the rest of the app can call to emit
// real-time events WITHOUT changing core business logic.
// ═══════════════════════════════════════════════════════════════

import { Server as SocketIOServer } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import logger from "./utils/logger.js";
import { verifyToken } from "./services/jwt.service.js";
import { isTokenBlacklisted } from "./middleware/tokenBlacklist.js";
import { pool } from "./config/db.js";

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
            origin: allowedOrigins.length > 0 ? allowedOrigins : true,
            methods: ["GET", "POST"],
            credentials: true,
        },
        transports: ["websocket", "polling"],
    });

    // ─── Redis Adapter setup for Horizontal Scaling ───
    try {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        const pubClient = new Redis(redisUrl);
        const subClient = pubClient.duplicate();
        io.adapter(createAdapter(pubClient, subClient));
        logger.info("[Socket.IO] Redis adapter connected successfully.");
    } catch (err) {
        logger.error(`[Socket.IO] Failed to connect Redis adapter: ${err.message}`);
    }

    // ─── Socket.IO Authentication Middleware ───
    io.use(async (socket, next) => {
        try {
            let token = null;
            // 1. Try to get token from socket auth payload
            if (socket.handshake.auth && socket.handshake.auth.token) {
                token = socket.handshake.auth.token;
            } 
            // 2. Try to get token from cookies
            else if (socket.handshake.headers.cookie) {
                const match = socket.handshake.headers.cookie.match(new RegExp('(^| )accessToken=([^;]+)'));
                if (match) token = match[2];
            }

            if (!token) {
                return next(new Error("Authentication error: No token provided."));
            }

            const decoded = verifyToken(token);
            if (!decoded) {
                return next(new Error("Authentication error: Invalid token."));
            }

            const blacklisted = await isTokenBlacklisted(token);
            if (blacklisted) {
                return next(new Error("Authentication error: Session expired or terminated."));
            }

            socket.user = decoded; // Attach user info to socket
            next();
        } catch (err) {
            logger.warn(`[Socket.IO] Authentication failed: ${err.message}`);
            return next(new Error("Authentication error."));
        }
    });

    io.on("connection", (socket) => {
        logger.info(`[Socket.IO] Authenticated Client connected: ${socket.id} (User ID: ${socket.user.id})`);

        // Client subscribes to a specific tracking room (complaint or service request)
        socket.on("track:join", async (id) => {
            if (id) {
                try {
                    // Bypass check for admins and staff
                    if (socket.user.role !== "admin" && socket.user.role !== "staff" && socket.user.role !== "integrity_officer" && socket.user.role !== "executive_oversight") {
                        // Check Complaint ownership
                        const complaintRes = await pool.query("SELECT citizen_id FROM complaints WHERE id = $1", [id]);
                        if (complaintRes.rows.length > 0) {
                            if (complaintRes.rows[0].citizen_id !== socket.user.id) {
                                logger.warn(`[Socket.IO] Unauthorized tracking attempt for complaint ${id} by user ${socket.user.id}`);
                                return;
                            }
                        } else {
                            // If not a complaint, check Service Request ownership
                            const srRes = await pool.query("SELECT citizen_id FROM service_requests WHERE id = $1", [id]);
                            if (srRes.rows.length > 0) {
                                if (srRes.rows[0].citizen_id !== socket.user.id) {
                                    logger.warn(`[Socket.IO] Unauthorized tracking attempt for SR ${id} by user ${socket.user.id}`);
                                    return;
                                }
                            } else {
                                // Record not found
                                return;
                            }
                        }
                    }

                    const room1 = `complaint:${id}`;
                    const room2 = `service_request:${id}`;
                    socket.join(room1);
                    socket.join(room2);
                    logger.info(`[Socket.IO] ${socket.id} (User: ${socket.user.id}) joined tracking rooms for ${id}`);
                    socket.emit("track:joined", { id, room: room1 });
                } catch (err) {
                    logger.error(`[Socket.IO] Error joining tracking room: ${err.message}`);
                }
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

    logger.info("[Socket.IO] Server initialised with JWT Auth.");
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
