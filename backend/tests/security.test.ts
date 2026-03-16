// backend/tests/security.test.ts
import request from 'supertest';
import app from '../app';
import { pool } from '../config/db';
import crypto from 'crypto';

describe('Security Feature Tests', () => {
  const testUser = {
    mobile: `9${crypto.randomInt(100000000, 999999999)}`,
    password: 'Password123!',
    name: 'Test User',
  };
  let accessToken: string;
  let citizenId: string;

  // Clean up any created users after all tests are done
  afterAll(async () => {
    if (citizenId) {
      await pool.query('DELETE FROM citizens WHERE id = $1', [citizenId]);
    }
  });

  describe('JWT Revocation on Logout', () => {
    it('should register and log in a new user', async () => {
      const registerRes = await request(app).post('/api/auth/register').send(testUser);
      expect(registerRes.status).toBe(201);
      expect(registerRes.body.data.accessToken).toBeDefined();

      citizenId = registerRes.body.data.user.id;
      accessToken = registerRes.body.data.accessToken;
    });

    it('should successfully log out the user', async () => {
      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(logoutRes.status).toBe(200);
    });

    it('should reject the logged-out access token when used on a protected route', async () => {
      const profileRes = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`);

      // This proves the blacklist is working
      expect(profileRes.status).toBe(401);
      expect(profileRes.body.error).toEqual('Session Terminated. Token Invalidated.');
    });
  });

  describe('Account Lockout on Failed Logins', () => {
    const lockoutTestUser = {
        mobile: `8${crypto.randomInt(100000000, 999999999)}`,
        password: 'LockoutPassword123!',
        name: 'Lockout Test User',
    };
    let lockoutCitizenId: string;

    beforeAll(async () => {
        const registerRes = await request(app).post('/api/auth/register').send(lockoutTestUser);
        lockoutCitizenId = registerRes.body.data.user.id;
    });

    afterAll(async () => {
        if (lockoutCitizenId) {
            await pool.query('DELETE FROM citizens WHERE id = $1', [lockoutCitizenId]);
        }
    });

    it('should lock the account after 5 failed login attempts', async () => {
      const loginPayload = {
        mobile: lockoutTestUser.mobile,
        password: 'WrongPassword!',
      };

      // The accountLockout middleware increments the counter AFTER the request,
      // so we need to clear the failed attempts first from the previous login tests if any.
      // A cleaner way would be a dedicated endpoint or helper, but for now we can test the logic.
      // Let's manually clear it to ensure a clean test slate.
      const hashedIdentifier = crypto.createHash('sha256').update(lockoutTestUser.mobile).digest('hex');
      const key = `lockout:${hashedIdentifier}`;
      // This part of the test is tricky as it depends on internal state.
      // The controller for login doesn't use the incrementFailedLogin method.
      // This is a bug in the controller, not the middleware.
      // Let's adjust the test to check what is actually implemented.

      // As per auth.controller.js, it doesn't call incrementFailedLogin.
      // This is another bug. The lockout middleware is in place, but not used by the login controller.
      // I will fix this bug first, then write the test for it.
      
      // For now, this test will fail, demonstrating the bug.
      for (let i = 0; i < 5; i++) {
        const res = await request(app).post('/api/auth/login').send(loginPayload);
        expect(res.status).toBe(401); // Expect "Invalid credentials"
      }

      // The 6th attempt should be locked
      const finalRes = await request(app).post('/api/auth/login').send(loginPayload);
      expect(finalRes.status).toBe(423);
      expect(finalRes.body.error).toContain('Account temporarily locked');
    }, 15000); // Increase timeout for this test
  });
});
