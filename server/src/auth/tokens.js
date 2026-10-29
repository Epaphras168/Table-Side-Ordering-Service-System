import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export function signToken(staff) {
  return jwt.sign(
    { sub: staff.staff_id, role: staff.role, name: staff.name },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

export function verifyToken(token) {
  const payload = jwt.verify(token, config.jwtSecret);
  return { staffId: payload.sub, role: payload.role, name: payload.name };
}
