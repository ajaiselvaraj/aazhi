import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

/**
 * Zero-Trust Input Validation Middleware
 * 
 * @param schema - A strict Zod Schema describing the exact expected payload shape
 * Automatically strips extraneous fields and enforces types.
 */
export const validatePayload = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate and sanitize the request body
      // .parseAsync() will automatically strip out un-defined keys if the schema is tight
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Zero-Trust Validation Failed. Payload Rejected.',
          details: error.errors.map(e => ({ path: e.path.join('.'), message: e.message }))
        });
      }
      return res.status(400).json({ error: 'Invalid Payload Structure Intercepted' });
    }
  };
};