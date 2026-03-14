// ═══════════════════════════════════════════════════════════════
// Winston Logger — Structured compliance-friendly logging
// ═══════════════════════════════════════════════════════════════

import winston from "winston";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logDir = path.join(__dirname, "..", "logs");

const logFormat = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: logFormat,
    defaultMeta: { service: "suvidha-kiosk" },
    transports: [
        // Console output with color in development
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ timestamp, level, message, ...meta }) => {
                    const metaStr = Object.keys(meta).length > 1
                        ? `\n  ${JSON.stringify(meta, null, 2)}`
                        : "";
                    return `[${timestamp}] ${level}: ${message}${metaStr}`;
                })
            ),
        }),

        // All logs to combined file
        new winston.transports.File({
            filename: path.join(logDir, "combined.log"),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),

        // Error logs separate
        new winston.transports.File({
            filename: path.join(logDir, "error.log"),
            level: "error",
            maxsize: 5242880,
            maxFiles: 5,
        }),

        // Audit logs separate  
        new winston.transports.File({
            filename: path.join(logDir, "audit.log"),
            level: "info",
            maxsize: 10485760, // 10MB
            maxFiles: 10,
        }),
    ],
});

export default logger;
