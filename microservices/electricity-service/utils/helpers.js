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
