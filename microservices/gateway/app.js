// 🌐 SUVIDHA KIOSK — API Gateway
// Central Entry Point for all Microservices

import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import morgan from 'morgan';
import proxy from 'express-http-proxy';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 5000;

// 🛡️ Security Headers
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));

// ─── Service URLs ────────────────────────────
const AUTH_SERVICE = process.env.AUTH_SERVICE_URL || 'http://auth-service:5001';
const GAS_SERVICE = process.env.GAS_SERVICE_URL || 'http://gas-service:5002';
const ELEC_SERVICE = process.env.ELEC_SERVICE_URL || 'http://electricity-service:5003';
const MUNI_SERVICE = process.env.MUNI_SERVICE_URL || 'http://municipal-service:5004';

// ─── Health check ───────────────────────────────
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'Gateway is healthy', timestamp: new Date().toISOString() });
});

// ─── API Routes (Proxied) ───────────────────────
// Proxy requests for each service
app.use('/auth', proxy(AUTH_SERVICE, { proxyPriority: 10 }));
app.use('/users', proxy(AUTH_SERVICE, { proxyPriority: 10 }));
app.use('/gas', proxy(GAS_SERVICE, { proxyPriority: 10 }));
app.use('/electricity', proxy(ELEC_SERVICE, { proxyPriority: 10 }));
app.use('/municipal', proxy(MUNI_SERVICE, { proxyPriority: 10 }));

// ─── Error handling ─────────────────────────────
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found in API Gateway' });
});

app.listen(PORT, () => {
    console.log(`🌐 API Gateway running on port ${PORT}`);
});
