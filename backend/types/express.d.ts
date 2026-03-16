// /backend/types/express.d.ts

import { Request } from 'express';

// Extend the Express Request type to include our custom properties
declare global {
  namespace Express {
    export interface Request {
      user?: {
        id: string;
        role: string;
        name: string;
      };
      blacklistToken?: (expiresInSeconds?: number) => Promise<void>;
      incrementFailedLogin?: () => Promise<void>;
      clearFailedLogin?: () => Promise<void>;
    }
  }
}

// If this file is not treated as a module, add an empty export.
export {};
