import { Router } from 'express';
import { z } from 'zod';
import { createStaff, listStaff, updateStaff } from '../services/staffService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const createSchema = z.object({
  name: z.string().min(1),
  role: z.enum(['waiter', 'kitchen', 'manager']),
  username: z.string().min(3),
  password: z.string().min(6),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(['waiter', 'kitchen', 'manager']).optional(),
  active: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

// FR13 / UC14: manager manages staff accounts.
export function staffRouter(db) {
  const router = Router();

  router.get('/', (req, res) => {
    res.json(listStaff(db));
  });

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const body = createSchema.parse(req.body);
      const profile = await createStaff(db, body);
      res.status(201).json(profile);
    })
  );

  router.put(
    '/:id',
    asyncHandler(async (req, res) => {
      const body = updateSchema.parse(req.body);
      const profile = await updateStaff(db, req.params.id, body);
      res.json(profile);
    })
  );

  return router;
}
