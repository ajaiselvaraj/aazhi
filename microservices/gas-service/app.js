// 🔥 SUVIDHA KIOSK — Gas Microservice
// Entry Point for Gas Utility Logic

import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import morgan from 'morgan';

// Routes
import gasRoutes from './routes/gas.routes.js';

// Middleware
import errorHandler from './middleware/error.middleware.js';

const app = express();
const PORT = process.env.PORT || 5002;

// ─── Middleware ─────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// ─── Health check ───────────────────────────────
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'Gas Service is healthy', timestamp: new Date().toISOString() });
});

// ─── Utility Routes ─────────────────────────────
app.use('/gas', gasRoutes);

// ─── Error handling ─────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`🔥 Gas Microservice running on port ${PORT}`);
});

export default app;
