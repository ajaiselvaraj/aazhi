import admin from "firebase-admin";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Replace with path to your downloaded service account key JSON
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || join(__dirname, "../firebase-service-account.json");

let firebaseApp;

try {
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
  
  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  console.log("✅ Firebase Admin initialized successfully");
} catch (error) {
  console.error("❌ Firebase Admin initialization error:", error.message);
}

export const firebaseAdmin = admin;
export default firebaseApp;
