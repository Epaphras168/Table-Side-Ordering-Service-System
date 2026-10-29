import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { signToken } from '../auth/tokens.js';
import { requireAuth } from '../middleware/auth.js';
import { toProfile } from '../services/staffService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { unauthorized } from '../utils/httpError.js';

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export function authRouter(db) {
  const router = Router();

  router.post(
    '/login',
    asyncHandler(async (req, res) => {
      const { username, password } = loginSchema.parse(req.body);
      const row = db.prepare('SELECT * FROM staff WHERE username = ?').get(username);
      if (!row || !row.active) throw unauthorized('Invalid username or password');

      const valid = await bcrypt.compare(password, row.password_hash);
      if (!valid) throw unauthorized('Invalid username or password');

      res.json({ token: signToken(row), staff: toProfile(row) });
    })
  );

  router.get('/me', requireAuth, (req, res) => {
    const row = db.prepare('SELECT * FROM staff WHERE staff_id = ?').get(req.user.staffId);
    if (!row) return res.status(404).json({ error: 'Staff account no longer exists' });
    res.json(toProfile(row));
  });

  return router;
}
