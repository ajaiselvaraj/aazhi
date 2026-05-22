// ═══════════════════════════════════════════════════════════════
// Ticket Number Generator
// Format: TKT-YYYYMMDD-XXXX (matching frontend convention)
// ═══════════════════════════════════════════════════════════════

import crypto from "crypto";

export const generateTicketNumber = (prefix = "TKT") => {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
    const secureHash = crypto.randomBytes(4).toString("hex").toUpperCase();
    return `${prefix}-${date}-${secureHash}`;
};

export const generateReceiptNumber = () => {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, "");
    const secureHash = crypto.randomBytes(4).toString("hex").toUpperCase();
    return `RCT-${date}-${secureHash}`;
};

export const generateBillNumber = (serviceType) => {
    const prefix = {
        electricity: "ELEC",
        gas: "GAS",
        water: "WTR",
        property: "PROP",
        waste: "WST",
    }[serviceType] || "BILL";

    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, "");
    const secureHash = crypto.randomBytes(4).toString("hex").toUpperCase();
    return `${prefix}-${date}-${secureHash}`;
};

// Mask Aadhaar for secure display: 1234 5678 9012 → XXXX XXXX 9012
export const maskAadhaar = (aadhaar) => {
    if (!aadhaar || aadhaar.length < 12) return "XXXX XXXX XXXX";
    const clean = aadhaar.replace(/\s/g, "");
    return `XXXX XXXX ${clean.slice(-4)}`;
};

export const isValidUuid = (uuid) => {
    if (typeof uuid !== "string") return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
};

export const generateDeterministicUuid = (seed) => {
    if (!seed) return crypto.randomUUID();
    const hash = crypto.createHash("md5").update(String(seed)).digest("hex");
    return [
        hash.slice(0, 8),
        hash.slice(8, 12),
        "3" + hash.slice(12, 16),
        "a" + hash.slice(16, 20),
        hash.slice(20, 32)
    ].join("-");
};

