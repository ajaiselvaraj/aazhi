import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// STRICT ENFORCEMENT: No fallback secrets allowed in sovereign systems.
const HMAC_SECRET = process.env.AUDIT_HMAC_SECRET;

if (!HMAC_SECRET) {
  console.error("FATAL SECURITY ERROR: AUDIT_HMAC_SECRET environment variable is missing.");
  console.error("Tamper-evident audit chain compromised. System shutting down.");
  process.exit(1);
}

export class AuditLogger {
  /**
   * Generates a deterministic SHA-256 hash of a JSON state representation.
   * Keys are recursively sorted to ensure consistent hashing regardless of property order.
   */
  static hashState(state: any): string {
    const stableStringify = (obj: any): string => {
      if (obj === null || typeof obj !== 'object') {
        return JSON.stringify(obj);
      }
      if (Array.isArray(obj)) {
        return `[${obj.map(stableStringify).join(',')}]`;
      }
      // Sort keys alphabetically to guarantee deterministic output
      const keys = Object.keys(obj).sort();
      return `{${keys.map(k => `"${k}":${stableStringify(obj[k])}`).join(',')}}`;
    };

    const stateString = stableStringify(state || {});
    return crypto.createHash('sha256').update(stateString).digest('hex');
  }

  /**
   * Logs an action with Tamper-Evident Cryptographic Chaining
   * 
   * @param actorId The ID of the user/admin making the change
   * @param ipFingerprint The IP/Device fingerprint
   * @param resourceId The ID of the DB row being changed (e.g., Complaint ID)
   * @param action String description of the action (e.g., "STATUS_UPDATE")
   * @param previousState The JSON state of the resource BEFORE the action
   * @param currentState The JSON state of the resource AFTER the action
   */
  static async logAction(
    actorId: string,
    ipFingerprint: string,
    resourceId: string,
    action: string,
    previousState: any,
    currentState: any
  ) {
    // Execute within a database transaction to ensure sequential integrity
    return await prisma.$transaction(async (tx) => {
      // 1. Fetch the last log in the chain
      const lastLog = await tx.auditLog.findFirst({
        orderBy: { timestamp: 'desc' }
      });

      const previousLogId = lastLog?.id || null;
      const previousSignature = lastLog?.hmacSignature || 'GENESIS_BLOCK';

      // 2. Hash the Document States
      const previousStateHash = this.hashState(previousState);
      const currentStateHash = this.hashState(currentState);

      // 3. Generate Cryptographic Signature (HMAC)
      // Payload = Previous Signature + Current Data. If a past log is deleted, all future signatures break.
      const payloadToSign = `${previousSignature}:${actorId}:${action}:${currentStateHash}`;
      const hmacSignature = crypto
        .createHmac('sha256', HMAC_SECRET)
        .update(payloadToSign)
        .digest('hex');

      // 4. Create the Immutable Log Entry
      const newLog = await tx.auditLog.create({
        data: {
          actorId,
          ipFingerprint,
          resourceId,
          action,
          previousStateHash,
          currentStateHash,
          previousLogId,
          hmacSignature
        }
      });

      return newLog;
    });
  }
}