import { createServer } from 'node:http';
import { createApp } from './app.js';
import { openDb } from './db/index.js';

const PORT = process.env.PORT ?? 4000;

const db = openDb();
const app = createApp(db);
const server = createServer(app);

// WebSocket support for real-time kitchen display sync (build order step 3)
// attaches to this same HTTP server once order management lands.

server.listen(PORT, () => {
  console.log(`TOSS server listening on http://localhost:${PORT}`);
});
