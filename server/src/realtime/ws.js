import { WebSocketServer } from 'ws';
import { verifyToken } from '../auth/tokens.js';

const HEARTBEAT_MS = 30_000;

// Real-time push for kitchen display sync and waiter/manager notifications
// (build order step 3). Auth reuses the same JWTs issued by /api/auth/login;
// browsers can't set headers on a WebSocket handshake, so the token travels
// as a query param instead.
export function createRealtime(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients = new Set();

  wss.on('connection', (ws, req) => {
    const token = new URL(req.url, 'http://localhost').searchParams.get('token');
    let user;
    try {
      user = verifyToken(token ?? '');
    } catch {
      ws.close(4001, 'Invalid or missing token');
      return;
    }

    ws.user = user;
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });
    clients.add(ws);

    ws.on('close', () => clients.delete(ws));
    ws.send(JSON.stringify({ event: 'connected', payload: { staffId: user.staffId, role: user.role } }));
  });

  const heartbeat = setInterval(() => {
    for (const ws of clients) {
      if (!ws.isAlive) {
        ws.terminate();
        clients.delete(ws);
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, HEARTBEAT_MS);
  wss.on('close', () => clearInterval(heartbeat));

  function broadcast(event, payload, filter = {}) {
    const message = JSON.stringify({ event, payload });
    for (const ws of clients) {
      if (filter.roles && !filter.roles.includes(ws.user.role)) continue;
      if (filter.staffId && ws.user.staffId !== filter.staffId) continue;
      if (ws.readyState === ws.OPEN) ws.send(message);
    }
  }

  return { wss, broadcast };
}
