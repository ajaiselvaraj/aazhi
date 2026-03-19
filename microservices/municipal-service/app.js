// 🏛️ SUVIDHA KIOSK — Municipal Microservice
// Entry Point for Municipal, Tax, and Complaints Logic

import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import morgan from 'morgan';

// Routes
import municipalRoutes from './routes/municipal.routes.js';
import complaintRoutes from './routes/complaint.routes.js';
import serviceRequestRoutes from './routes/serviceRequest.routes.js';

// Middleware
import errorHandler from './middleware/error.middleware.js';

const app = express();
const PORT = process.env.PORT || 5004;

// ─── Middleware ─────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// ─── Health check ───────────────────────────────
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'Municipal Service is healthy', timestamp: new Date().toISOString() });
});

// ─── Utility Routes ─────────────────────────────
app.use('/municipal', municipalRoutes);
app.use('/complaints', complaintRoutes);
app.use('/service-requests', serviceRequestRoutes);

// ─── Error handling ─────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`🏛️ Municipal Microservice running on port ${PORT}`);
});

export default app;
