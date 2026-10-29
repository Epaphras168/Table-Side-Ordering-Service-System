import { HttpError } from '../utils/httpError.js';

export function errorHandler(err, req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err?.name === 'ZodError') {
    return res.status(400).json({ error: err.issues?.[0]?.message ?? 'Invalid request' });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}
