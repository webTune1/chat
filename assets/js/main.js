// Client that talks to the simple WS server above.
// Set WS_URL to your deployed server (wss://... or ws://localhost:8080 for local).
// After deploying server, change WS_URL and the client will work.

let WS_URL = 'wss://REPLACE_WITH_YOUR_SERVER_URL'; // e.g. wss://your-app.onrender.com
// For local testing: ws://localhost:8080

const overlay = document.getElementById('overlay');
const nameInput = document.getElementById('nameInput');
const joinBtn = document.getElementById('joinBtn');
const overlayMsg = document.getElementById('overlayMsg');

const appEl = document.getElementById('app');
const usersListEl = document.getElementById('usersList');
const chatTitleEl = document.getElementById('chatTitle');
const statusHint = document.getElementById('statusHint');
const youBadge = document.getElementById('youBadge');
const messagesEl = document.getElementById('messages');
const msgForm = document.getElementById('msgForm');
const msgInput = document.getElementById('msgInput');

let me = { uid: null, name: null };
let ws = null;
let currentChat = null;

function uidGen(){ return 'u' + Math.random().toString(36).slice(2,10); }
function uidShort(uid){ return uid ? uid.slice(0,6) : ''; }
function roomIdFor(a,b){ return a < b ? `${a}_${b}` : `${b}_${a}`; }

function showOverlayMsg(t){ overlayMsg.textContent = t; }

joinBtn.addEventListener('click', async () => {
  const name = (nameInput.value || '').trim();
  if (!name) { showOverlayMsg('Please enter a name'); return; }
  joinBtn.disabled = true;
  showOverlayMsg('Connecting to server...');
  // create local uid and open ws
  me.uid = uidGen();
  me.name = name;

  try {
    ws = new WebSocket(WS_URL);
  } catch (e) {
    showOverlayMsg('Bad WS_URL. Set server URL in assets/js/main.js');
    joinBtn.disabled = false;
    return;
  }

  ws.addEventListener('open', () => {
    ws.send(JSON.stringify({ type: 'identify', uid: me.uid, name: me.name }));
    overlay.classList.add('hidden');
    appEl.classList.remove('hidden');
    youBadge.textContent = `You: ${me.name}`;
  });

  ws.addEventListener('message', (ev) => {
    let data;
    try { data = JSON.parse(ev.data); } catch (e) { return; }
    if (data.type === 'identified') {
      // ok
      showOverlayMsg('');
    } else if (data.type === 'presence') {
      renderPresence(data.list);
    } else if (data.type === 'error') {
      showOverlayMsg('Failed to join: ' + data.message);
      joinBtn.disabled = false;
      if (ws) ws.close();
    } else if (data.type === 'message') {
      // show incoming message for room
      if (currentChat && data.room === currentChat.roomId) appendMessage(data.msg);
    } else if (data.type === 'history') {
      if (currentChat && data.room === currentChat.roomId) {
        messagesEl.innerHTML = '';
        for (const m of data.messages) appendMessage(m);
      }
    }
  });

  ws.addEventListener('close', () => {
    // server closed (maybe too many users)
    if (!appEl.classList.contains('hidden')) {
      addSystemMessage('Disconnected from server');
      msgForm.classList.add('hidden');
    }
  });

  ws.addEventListener('error', (e) => {
    console.error('WS error', e);
    showOverlayMsg('WebSocket error. Check server URL and console.');
    joinBtn.disabled = false;
  });
});

function renderPresence(list){
  usersListEl.innerHTML = '';
  // sort by name
  list.sort((a,b) => a.name.localeCompare(b.name));
  for (const u of list){
    const li = document.createElement('li');
    li.id = `user-${u.uid}`;
    const avatar = document.createElement('div');
    avatar.className = 'userAvatar';
    avatar.textContent = initials(u.name);
    const meta = document.createElement('div'); meta.className = 'userMeta';
    const n = document.createElement('div'); n.className = 'name'; n.textContent = u.name + (u.uid === me.uid ? ' (you)' : '');
    const s = document.createElement('div'); s.className = 'status'; s.textContent = u.uid === me.uid ? `id ${uidShort(u.uid)}` : 'online';
    meta.appendChild(n); meta.appendChild(s);
    const action = document.createElement('div'); action.className = 'userAction'; action.textContent = u.uid === me.uid ? '' : 'Open';
    li.appendChild(avatar); li.appendChild(meta); li.appendChild(action);
    if (u.uid !== me.uid) li.addEventListener('click', () => openChatWith(u.uid, u.name));
    usersListEl.appendChild(li);
  }
}

function initials(name){
  const parts = (name||'').trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0,2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function openChatWith(uid, name){
  currentChat = { uid, name, roomId: roomIdFor(me.uid, uid) };
  chatTitleEl.textContent = `Chat with ${name}`;
  statusHint.textContent = `id ${uidShort(uid)} • private`;
  messagesEl.innerHTML = '';
  messagesEl.classList.remove('empty');
  msgForm.classList.remove('hidden');
  // request history
  ws.send(JSON.stringify({ type: 'get_history', room: currentChat.roomId }));
}

msgForm.addEventListener('submit', (ev) => {
  ev.preventDefault();
  const text = (msgInput.value || '').trim();
  if (!text || !currentChat) return;
  const payload = {
    type: 'message',
    toUid: currentChat.uid,
    fromUid: me.uid,
    fromName: me.name,
    text
  };
  ws.send(JSON.stringify(payload));
  msgInput.value = '';
});

function appendMessage(m){
  const el = document.createElement('div');
  const mine = m.fromUid === me.uid;
  el.className = 'msg ' + (mine ? 'me' : 'other');
  const meta = document.createElement('div'); meta.className = 'meta';
  const date = new Date(m.ts || Date.now());
  meta.textContent = `${m.fromName} • ${date.toLocaleTimeString()}`;
  const bubble = document.createElement('div'); bubble.className = 'bubble';
  bubble.textContent = m.text;
  el.appendChild(meta); el.appendChild(bubble);
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function addSystemMessage(text){
  const el = document.createElement('div'); el.className = 'msg';
  const bubble = document.createElement('div'); bubble.className = 'bubble';
  bubble.style.background = 'transparent';
  bubble.style.border = '1px dashed rgba(255,255,255,0.04)';
  bubble.textContent = text;
  el.appendChild(bubble); messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

window.addEventListener('beforeunload', () => {
  try { if (ws) ws.close(); } catch(e){}
});
