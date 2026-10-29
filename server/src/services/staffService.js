import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { conflict, notFound } from '../utils/httpError.js';

const SALT_ROUNDS = 10;

export function toProfile(row) {
  return {
    staffId: row.staff_id,
    name: row.name,
    role: row.role,
    username: row.username,
    active: !!row.active,
    createdAt: row.created_at,
  };
}

export function listStaff(db) {
  return db.prepare('SELECT * FROM staff ORDER BY role, name').all().map(toProfile);
}

export async function createStaff(db, { name, role, username, password }) {
  const existing = db.prepare('SELECT 1 FROM staff WHERE username = ?').get(username);
  if (existing) throw conflict(`Username "${username}" is already taken`);

  const staffId = randomUUID();
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  db.prepare(
    'INSERT INTO staff (staff_id, name, role, username, password_hash) VALUES (?, ?, ?, ?, ?)'
  ).run(staffId, name, role, username, passwordHash);
  return toProfile(db.prepare('SELECT * FROM staff WHERE staff_id = ?').get(staffId));
}

export async function updateStaff(db, staffId, { name, role, active, password }) {
  const existing = db.prepare('SELECT * FROM staff WHERE staff_id = ?').get(staffId);
  if (!existing) throw notFound('Staff account not found');

  const passwordHash = password ? await bcrypt.hash(password, SALT_ROUNDS) : existing.password_hash;
  db.prepare(
    'UPDATE staff SET name = ?, role = ?, active = ?, password_hash = ? WHERE staff_id = ?'
  ).run(
    name ?? existing.name,
    role ?? existing.role,
    active === undefined ? existing.active : active ? 1 : 0,
    passwordHash,
    staffId
  );
  return toProfile(db.prepare('SELECT * FROM staff WHERE staff_id = ?').get(staffId));
}
