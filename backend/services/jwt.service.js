// ═══════════════════════════════════════════════════════════════
// JWT Authentication Service
// ═══════════════════════════════════════════════════════════════

import jwt from "jsonwebtoken";

export const generateTokens = (user) => {
    // Requires citizen id and mobile for payload
    const payload = {
        id: user.id,
        mobile: user.mobile,
        name: user.name || null,
        role: user.role || "citizen",
        department: user.department || null
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRY || "1h",
    });

    const refreshToken = process.env.JWT_REFRESH_SECRET 
      ? jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
          expiresIn: process.env.JWT_REFRESH_EXPIRY || "7d",
        })
      : null;

    return {
        accessToken,
        refreshToken
    };
};

export const verifyToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
};

export const verifyRefreshToken = (token) => {
    if (!process.env.JWT_REFRESH_SECRET) {
        throw new Error("JWT_REFRESH_SECRET is not configured");
    }
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};
