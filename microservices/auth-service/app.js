// 🔑 SUVIDHA KIOSK — Auth & User Microservice
// Entry Point for Authentication logic

import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import morgan from 'morgan';

// Routes
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';

// Middleware
import errorHandler from './middleware/error.middleware.js';
import securityHeaders from './middleware/SecurityEngine.js';

const app = express();
const PORT = process.env.PORT || 5001;

// 🛡️ Security Headers
// app.use(securityHeaders.applySecurityHeaders); // Re-applying would require adjusting SecurityEngine imports for relative paths

// ─── Middleware ─────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// ─── Health check ───────────────────────────────
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'Auth Service is healthy', timestamp: new Date().toISOString() });
});

// ─── Auth/User Routes ──────────────────────────
app.use('/auth', authRoutes);
app.use('/users', userRoutes);

// ─── Error handling ─────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`🔑 Auth Microservice running on port ${PORT}`);
});

export default app;
