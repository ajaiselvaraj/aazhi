// ═══════════════════════════════════════════════════════════════
// Ticket Number Generator
// Format: TKT-YYYYMMDD-XXXX (matching frontend convention)
// ═══════════════════════════════════════════════════════════════

let counter = 0;

export const generateTicketNumber = (prefix = "TKT") => {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
    counter = (counter + 1) % 10000;
    const seq = String(counter).padStart(4, "0");
    const random = String(Math.floor(Math.random() * 9000) + 1000);
    return `${prefix}-${date}-${random}${seq.slice(-2)}`;
};

export const generateReceiptNumber = () => {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, "");
    const random = String(Math.floor(Math.random() * 900000) + 100000);
    return `RCT-${date}-${random}`;
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
    const random = String(Math.floor(Math.random() * 90000) + 10000);
    return `${prefix}-${date}-${random}`;
};

// Mask Aadhaar for secure display: 1234 5678 9012 → XXXX XXXX 9012
export const maskAadhaar = (aadhaar) => {
    if (!aadhaar || aadhaar.length < 12) return "XXXX XXXX XXXX";
    const clean = aadhaar.replace(/\s/g, "");
    return `XXXX XXXX ${clean.slice(-4)}`;
};
