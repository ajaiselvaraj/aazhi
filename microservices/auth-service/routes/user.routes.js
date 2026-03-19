import express from "express";
import { getUsers, createUser } from "../controllers/user.controller.js";

const router = express.Router();

/**
 * @route   GET /api/users
 * @desc    Fetch all users from DB
 */
router.get("/", getUsers);

/**
 * @route   POST /api/users
 * @desc    Insert a new user (Name and Phone) into the users table
 */
router.post("/", createUser);

export default router;
