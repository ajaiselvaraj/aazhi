// ⚡ SUVIDHA KIOSK — Electricity Microservice
// Entry Point for Electricity Utility Logic

import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import morgan from 'morgan';

// Routes
import electricityRoutes from './routes/electricity.routes.js';

// Middleware
import errorHandler from './middleware/error.middleware.js';

const app = express();
const PORT = process.env.PORT || 5003;

// ─── Middleware ─────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// ─── Health check ───────────────────────────────
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'Electricity Service is healthy', timestamp: new Date().toISOString() });
});

// ─── Utility Routes ─────────────────────────────
app.use('/electricity', electricityRoutes);

// ─── Error handling ─────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`⚡ Electricity Microservice running on port ${PORT}`);
});

export default app;
