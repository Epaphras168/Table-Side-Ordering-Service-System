import { createServer } from 'node:http';
import { createApp } from './app.js';
import { openDb } from './db/index.js';
import { createRealtime } from './realtime/ws.js';

const PORT = process.env.PORT ?? 4000;

const db = openDb();
const server = createServer();
const { broadcast } = createRealtime(server);
const app = createApp(db, { broadcast });
server.on('request', app);

server.listen(PORT, () => {
  console.log(`TOSS server listening on http://localhost:${PORT} (WebSocket on /ws)`);
});
