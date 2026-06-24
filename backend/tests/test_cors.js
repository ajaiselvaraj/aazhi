import dotenv from 'dotenv';
dotenv.config();

const allowedOrigins = (process.env.FRONTEND_URL || 
    "http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:5173,http://localhost:5174,http://localhost:5175")
    .split(",")
    .map(o => o.trim());

console.log("Allowed Origins:", allowedOrigins);
const testOrigin = "http://localhost:5173";
const isAllowed = allowedOrigins.indexOf(testOrigin) !== -1 || allowedOrigins.includes("*");
console.log(`Testing origin: ${testOrigin}`);
console.log(`Allowed: ${isAllowed}`);
