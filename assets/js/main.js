// IMPORTANT: Replace the firebaseConfig object below with your Firebase project's config.
// Get this from Firebase Console -> Project Settings -> Your apps -> SDK snippet (Firebase config).
// Example:
// const firebaseConfig = {
//   apiKey: "AIzaSyA...",
//   authDomain: "your-project.firebaseapp.com",
//   databaseURL: "https://your-project-default-rtdb.firebaseio.com",
//   projectId: "your-project",
//   storageBucket: "your-project.appspot.com",
//   messagingSenderId: "1234567890",
//   appId: "1:1234567890:web:abcdef123"
// };

const firebaseConfig = {
  apiKey: "REPLACE_WITH_YOUR_API_KEY",
  authDomain: "REPLACE_WITH_YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://REPLACE_WITH_YOUR_PROJECT.firebaseio.com",
  projectId: "REPLACE_WITH_YOUR_PROJECT",
  storageBucket: "REPLACE_WITH_YOUR_PROJECT.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

let me = { uid: null, name: null };
let currentChat = null; // { uid, name, roomId }

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

const MAX_ONLINE = 5;

function uidShort(uid){
  if(!uid) return '';
  return uid.slice(0,6);
}

// deterministic room id
function roomIdFor(u1, u2){
  return (u1 < u2) ? `${u1}_${u2}` : `${u2}_${u1}`;
}

function showOverlayMsg(text){
  overlayMsg.textContent = text;
}

// graceful join
joinBtn.addEventListener('click', async () => {
  const name = (nameInput.value || '').trim();
  if(!name) { showOverlayMsg('Please enter a name'); return; }
  joinBtn.disabled = true;
  showOverlayMsg('Joining...');
  try {
    const result = await auth.signInAnonymously();
    me.uid = result.user.uid;
    me.name = name;

    // check presence count
    const snap = await db.ref('presence').once('value');
    const onlineCount = snap.numChildren();
    const amAlready = snap.hasChild(me.uid);
    if(onlineCount >= MAX_ONLINE && !amAlready){
      showOverlayMsg(`Too many users online (limit ${MAX_ONLINE}). Try later.`);
      await auth.signOut();
      joinBtn.disabled = false;
      return;
    }

    // set presence and onDisconnect
    const pRef = db.ref(`presence/${me.uid}`);
    await pRef.set({ name: me.name, ts: firebase.database.ServerValue.TIMESTAMP });
    pRef.onDisconnect().remove();

    overlay.classList.add('hidden');
    appEl.classList.remove('hidden');
    youBadge.textContent = `You: ${me.name}`;

    listenPresence();
  } catch (err) {
    console.error('Join error', err);
    const msg = (err && err.message) ? err.message : JSON.stringify(err);
    showOverlayMsg('Failed to join: ' + msg);
    joinBtn.disabled = false;
  }
});

function listenPresence(){
  const presenceRef = db.ref('presence');
  presenceRef.off();
  presenceRef.on('value', snap => {
    usersListEl.innerHTML = '';
    const list = [];
    snap.forEach(child => {
      const uid = child.key;
      const data = child.val();
      list.push({ uid, name: data.name, ts: data.ts });
    });
    // sort by name
    list.sort((a,b) => a.name.localeCompare(b.name));
    for(const u of list){
      renderUser(u.uid, u.name);
    }
  });

  presenceRef.on('child_removed', snapshot => {
    const uid = snapshot.key;
    if(currentChat && currentChat.uid === uid){
      // other user went offline
      addSystemMessage(`${currentChat.name} went offline`);
      statusHint.textContent = 'User offline';
      // keep messages visible but disable send
      msgForm.classList.add('hidden');
    }
  });
}

function renderUser(uid, name){
  // show self on top with subtle style
  const li = document.createElement('li');
  li.id = `user-${uid}`;
  li.className = (uid === me.uid) ? 'self' : '';
  const avatar = document.createElement('div');
  avatar.className = 'userAvatar';
  avatar.textContent = initials(name);
  const meta = document.createElement('div');
  meta.className = 'userMeta';
  const n = document.createElement('div');
  n.className = 'name';
  n.textContent = name + (uid === me.uid ? ' (you)' : '');
  const s = document.createElement('div');
  s.className = 'status';
  s.textContent = (uid === me.uid) ? `id ${uidShort(uid)}` : 'online';
  meta.appendChild(n);
  meta.appendChild(s);
  const action = document.createElement('div');
  action.className = 'userAction';
  action.textContent = (uid === me.uid) ? '' : 'Open';
  li.appendChild(avatar);
  li.appendChild(meta);
  li.appendChild(action);

  if(uid !== me.uid){
    li.addEventListener('click', () => openChatWith(uid, name));
  } else {
    li.style.opacity = '0.9';
  }
  usersListEl.appendChild(li);
}

function initials(name){
  const parts = (name||'').trim().split(/\s+/);
  if(parts.length === 0) return '';
  if(parts.length === 1) return parts[0].slice(0,2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function openChatWith(uid, name){
  currentChat = { uid, name, roomId: roomIdFor(me.uid, uid) };
  chatTitleEl.textContent = `Chat with ${name}`;
  statusHint.textContent = `id ${uidShort(uid)} • private`;
  messagesEl.innerHTML = '';
  messagesEl.classList.remove('empty');
  msgForm.classList.remove('hidden');

  // listen messages
  const msgsRef = db.ref(`chats/${currentChat.roomId}/messages`);
  msgsRef.off();
  msgsRef.limitToLast(200).on('child_added', snapshot => {
    appendMessage(snapshot.val());
  });
}

function closeChat(){
  currentChat = null;
  chatTitleEl.textContent = 'Select a user to chat';
  statusHint.textContent = 'No chat selected';
  messagesEl.innerHTML = '';
  messagesEl.classList.add('empty');
  msgForm.classList.add('hidden');
}

// send
msgForm.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const text = (msgInput.value || '').trim();
  if(!text || !currentChat) return;
  const msgsRef = db.ref(`chats/${currentChat.roomId}/messages`);
  const msgObj = {
    fromUid: me.uid,
    fromName: me.name,
    text,
    ts: firebase.database.ServerValue.TIMESTAMP
  };
  try {
    await msgsRef.push(msgObj);
    msgInput.value = '';
  } catch (err) {
    console.error('Send failed', err);
    alert('Failed to send message: ' + (err.message || JSON.stringify(err)));
  }
});

// append message
function appendMessage(m){
  const el = document.createElement('div');
  const mine = m.fromUid === me.uid;
  el.className = 'msg ' + (mine ? 'me' : 'other');
  const meta = document.createElement('div');
  meta.className = 'meta';
  const date = new Date(m.ts || Date.now());
  meta.textContent = `${m.fromName} • ${date.toLocaleTimeString()}`;
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = m.text;
  el.appendChild(meta);
  el.appendChild(bubble);
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function addSystemMessage(text){
  const el = document.createElement('div');
  el.className = 'msg';
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.style.background = 'transparent';
  bubble.style.border = '1px dashed rgba(255,255,255,0.04)';
  bubble.textContent = text;
  el.appendChild(bubble);
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

window.addEventListener('beforeunload', () => {
  if(me.uid){
    try { db.ref(`presence/${me.uid}`).remove(); } catch(e){}
  }
});
