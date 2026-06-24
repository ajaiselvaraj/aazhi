import express from "express";
import { handleGeminiQuery } from "../controllers/ai.controller.js";
import { aiLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.post("/gemini", aiLimiter, handleGeminiQuery);

export default router;
