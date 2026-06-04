import express from "express";
import emergencyController from "../controllers/emergency.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import { adminOnly } from "../middleware/role.middleware.js";

// --- Public Routes ---
const publicEmergencyRouter = express.Router();
publicEmergencyRouter.get("/status", emergencyController.getStatus);
publicEmergencyRouter.get("/broadcasts", emergencyController.getBroadcasts);
publicEmergencyRouter.get("/relief-centers", emergencyController.getReliefCenters);

// --- Admin Routes ---
const adminEmergencyRouter = express.Router();
adminEmergencyRouter.use(authMiddleware);
adminEmergencyRouter.use(adminOnly);

adminEmergencyRouter.post("/activate", emergencyController.activateMode);
adminEmergencyRouter.post("/deactivate", emergencyController.deactivateMode);
adminEmergencyRouter.post("/broadcast", emergencyController.addBroadcast);
adminEmergencyRouter.post("/relief-center", emergencyController.addReliefCenter);
adminEmergencyRouter.delete("/relief-center/:id", emergencyController.deleteReliefCenter);

export { publicEmergencyRouter, adminEmergencyRouter };
