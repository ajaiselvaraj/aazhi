import Joi from "joi";

// ─── Reusable Strict Password Schema ──────────────────────
const securePassword = Joi.string()
    .min(12).max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/)
    .message("Password must be 12+ chars, with at least one uppercase, one lowercase, one number, and one special character")
    .required();

// ─── Auth Schemas ─────────────────────────────────────────
export const registerSchema = Joi.object({
    name: Joi.string().min(2).max(100).required()
        .messages({ "string.empty": "Name is required" }),
    mobile: Joi.string().pattern(/^[6-9]\d{9}$/).required()
        .messages({ "string.pattern.base": "Valid 10-digit Indian mobile number required" }),
    email: Joi.string().email().allow("", null),
    aadhaar: Joi.string().pattern(/^\d{12}$/).required()
        .messages({ "string.pattern.base": "Aadhaar must be 12 digits" }),
    password: securePassword,
    address: Joi.string().max(500).allow("", null),
    ward: Joi.string().max(10).allow("", null),
    zone: Joi.string().max(50).allow("", null),
});

export const loginSchema = Joi.object({
    mobile: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
    password: Joi.string().max(128).required(), // Max length prevents Bcrypt CPU-exhaustion DoS
});

export const adminLoginSchema = Joi.object({
    mobile: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
    password: Joi.string().max(128).required(),
});

// ─── Bill Schemas ─────────────────────────────────────────
export const createBillSchema = Joi.object({
    account_id: Joi.string().uuid().required(),
    citizen_id: Joi.string().uuid().required(),
    service_type: Joi.string().valid("electricity", "gas", "water", "property", "waste").required(),
    amount: Joi.number().positive().required(),
    tax_amount: Joi.number().min(0).default(0),
    units_consumed: Joi.number().min(0).allow(null),
    reading_current: Joi.number().min(0).allow(null),
    reading_previous: Joi.number().min(0).allow(null),
    billing_month: Joi.string().max(10).allow(null),
    billing_year: Joi.string().max(4).allow(null),
    billing_cycle: Joi.string().max(20).allow(null),
    due_date: Joi.date().required(),
});

// ─── Payment Schemas ──────────────────────────────────────
export const createOrderSchema = Joi.object({
    bill_id: Joi.string().uuid().required(),
    amount: Joi.number().positive().required(),
});

export const verifyPaymentSchema = Joi.object({
    razorpay_order_id: Joi.string().required(),
    razorpay_payment_id: Joi.string().required(),
    razorpay_signature: Joi.string().required(),
});

// ─── Complaint Schemas ────────────────────────────────────
export const createComplaintSchema = Joi.object({
    category: Joi.string().required(),
    issue_category: Joi.string().allow("", null),
    department: Joi.string().required(),
    subject: Joi.string().min(5).max(200).required(),
    description: Joi.string().min(10).max(2000).required(),
    ward: Joi.string().max(10).allow("", null),
    priority: Joi.string().valid("low", "medium", "high", "critical").default("medium"),
});

export const updateComplaintStatusSchema = Joi.object({
    status: Joi.string().valid(
        "submitted", "acknowledged", "assigned", "in_progress",
        "resolved", "closed", "reopened", "rejected"
    ).required(),
    notes: Joi.string().max(1000).allow("", null),
    assigned_to: Joi.string().uuid().allow(null),
    resolution_note: Joi.string().max(2000).allow("", null),
});

// ─── Service Request Schemas ──────────────────────────────
export const createServiceRequestSchema = Joi.object({
    request_type: Joi.string().required(),
    department: Joi.string().required(),
    description: Joi.string().min(10).max(2000).required(),
    ward: Joi.string().max(10).allow("", null),
    phone: Joi.string().pattern(/^[6-9]\d{9}$/).allow("", null),
    metadata: Joi.object().allow(null),
});

export const updateServiceRequestStatusSchema = Joi.object({
    status: Joi.string().valid(
        "submitted", "under_review", "verification",
        "approval_pending", "completed", "rejected"
    ).required(),
    notes: Joi.string().max(1000).allow("", null),
});

// ─── Utility Account Schema ──────────────────────────────
export const createUtilityAccountSchema = Joi.object({
    citizen_id: Joi.string().uuid().required(),
    service_type: Joi.string().valid("electricity", "gas", "water", "property", "waste").required(),
    account_number: Joi.string().required(),
    meter_number: Joi.string().allow("", null),
    connection_date: Joi.date().allow(null),
});

// ─── Service Config Schema ────────────────────────────────
export const updateServiceConfigSchema = Joi.object({
    is_enabled: Joi.boolean().required(),
    description: Joi.string().max(500).allow("", null),
});

// ─── Validation Middleware Factory ────────────────────────
export const validate = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true,
        });

        if (error) {
            const messages = error.details.map((d) => d.message).join(", ");
            return res.status(422).json({
                success: false,
                message: `Validation error: ${messages}`,
                data: {},
            });
        }

        req.body = value;
        next();
    };
};
