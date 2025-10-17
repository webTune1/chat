// Simple WebSocket chat server (Node.js + ws).
// - Enforces max simultaneous online users (MAX_ONLINE).
// - Tracks presence and message history in-memory (lost on restart).
// - Protocol: JSON messages with {type: "..."}.
// Deploy to Render / Railway / Replit or run locally with `node server.js`.

const WebSocket = require('ws');

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;
const MAX_ONLINE = 5;

const wss = new WebSocket.Server({ port: PORT });
console.log(`WS server listening on port ${PORT}`);

const clients = new Map(); // ws -> { uid, name }
const byUid = new Map();   // uid -> ws
const rooms = new Map();   // roomId -> [messages...]

function roomId(a, b){ return a < b ? `${a}_${b}` : `${b}_${a}`; }

function broadcastPresence(){
  const list = Array.from(byUid.keys()).map(uid => {
    const ws = byUid.get(uid);
    const meta = clients.get(ws) || {};
    return { uid, name: meta.name || 'Unknown' };
  });
  const msg = JSON.stringify({ type: 'presence', list });
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  }
}

function sendToUid(uid, obj){
  const ws = byUid.get(uid);
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
}

wss.on('connection', (ws, req) => {
  console.log('connection');
  ws.isAlive = true;
  ws.on('pong', () => ws.isAlive = true);

  ws.on('message', (raw) => {
    let data;
    try { data = JSON.parse(raw); } catch (e) { return; }
    if (data.type === 'identify') {
      const { uid, name } = data;
      // enforce max online
      const already = byUid.has(uid);
      if (!already && byUid.size >= MAX_ONLINE) {
        ws.send(JSON.stringify({ type: 'error', message: `Too many users online (limit ${MAX_ONLINE})` }));
        ws.close();
        return;
      }
      clients.set(ws, { uid, name });
      byUid.set(uid, ws);
      console.log(`identify: ${uid} (${name})`);
      // send acknowledgement + current presence + optionally history list
      ws.send(JSON.stringify({ type: 'identified', uid, name }));
      broadcastPresence();
    } else if (data.type === 'message') {
      // { type: 'message', toUid, fromUid, fromName, text }
      const { toUid, fromUid, fromName, text } = data;
      const r = roomId(fromUid, toUid);
      const m = { fromUid, fromName, text, ts: Date.now() };
      if (!rooms.has(r)) rooms.set(r, []);
      rooms.get(r).push(m);
      // deliver to participants
      const payload = { type: 'message', room: r, msg: m };
      if (byUid.has(fromUid)) sendToUid(fromUid, payload);
      if (byUid.has(toUid)) sendToUid(toUid, payload);
    } else if (data.type === 'get_history') {
      // { type:'get_history', room }
      const h = rooms.get(data.room) || [];
      ws.send(JSON.stringify({ type: 'history', room: data.room, messages: h }));
    }
  });

  ws.on('close', () => {
    const meta = clients.get(ws);
    if (meta && meta.uid) {
      console.log(`disconnect ${meta.uid}`);
      byUid.delete(meta.uid);
    }
    clients.delete(ws);
    broadcastPresence();
  });

  ws.on('error', (err) => console.error('ws error', err));
});

// ping/pong to detect dead clients
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping(null, false, true);
  });
}, 30000);

wss.on('close', () => clearInterval(interval));
