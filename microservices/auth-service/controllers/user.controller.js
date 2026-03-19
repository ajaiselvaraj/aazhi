import { pool } from "../config/db.js";
import logger from "../utils/logger.js";

/**
 * Fetch all users from the database
 */
export const getUsers = async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM users ORDER BY created_at DESC");
        res.status(200).json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        logger.error(`[UserController] Error fetching users: ${error.message}`);
        res.status(500).json({
            success: false,
            message: "Failed to fetch users",
            error: error.message
        });
    }
};

/**
 * Create a new user
 */
export const createUser = async (req, res) => {
    const { name, phone } = req.body;

    // Simple validation
    if (!name || !phone) {
        return res.status(400).json({
            success: false,
            message: "Name and phone are required"
        });
    }

    try {
        const result = await pool.query(
            "INSERT INTO users (name, phone) VALUES ($1, $2) RETURNING *",
            [name, phone]
        );

        res.status(201).json({
            success: true,
            message: "User created successfully",
            data: result.rows[0]
        });
    } catch (error) {
        // Handle duplicate key error (phone)
        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "A user with this phone number already exists"
            });
        }

        logger.error(`[UserController] Error creating user: ${error.message}`);
        res.status(500).json({
            success: false,
            message: "Failed to create user",
            error: error.message
        });
    }
};
