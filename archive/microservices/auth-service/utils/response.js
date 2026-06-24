// ═══════════════════════════════════════════════════════════════
// Standardized API Response Helpers
// All responses follow: { success, message, data }
// ═══════════════════════════════════════════════════════════════

export const success = (res, message, data = {}, statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
    });
};

export const fail = (res, message, statusCode = 400) => {
    return res.status(statusCode).json({
        success: false,
        message,
        data: {},
    });
};

export const error = (res, message = "Internal Server Error", statusCode = 500) => {
    return res.status(statusCode).json({
        success: false,
        message,
        data: {},
    });
};

export const paginated = (res, message, data, pagination) => {
    return res.status(200).json({
        success: true,
        message,
        data,
        pagination,
    });
};