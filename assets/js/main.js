// NOTE: Replace the firebaseConfig object with your Firebase project's config.
// See README.md below for setup steps.
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
const youBadge = document.getElementById('youBadge');
const messagesEl = document.getElementById('messages');
const msgForm = document.getElementById('msgForm');
const msgInput = document.getElementById('msgInput');

const MAX_ONLINE = 5;

// helper: compute roomId from two uids (deterministic)
function roomIdFor(u1, u2){
  return (u1 < u2) ? `${u1}_${u2}` : `${u2}_${u1}`;
}

// show a short message in overlay
function showOverlayMsg(text){
  overlayMsg.textContent = text;
}

// join flow
joinBtn.addEventListener('click', async () => {
  const name = (nameInput.value || '').trim();
  if(!name) { showOverlayMsg('Please enter a name'); return; }
  joinBtn.disabled = true;
  showOverlayMsg('Checking...');
  try {
    // sign in anonymously so we have an auth.uid and can use .onDisconnect
    const result = await auth.signInAnonymously();
    me.uid = result.user.uid;
    me.name = name;

    // check online count
    const snap = await db.ref('presence').once('value');
    const onlineCount = snap.numChildren();
    // If our uid is already present (rare reload), allow it.
    const amAlready = snap.hasChild(me.uid);
    if(onlineCount >= MAX_ONLINE && !amAlready){
      showOverlayMsg(`Too many users online (limit ${MAX_ONLINE}). Try later.`);
      await auth.signOut();
      joinBtn.disabled = false;
      return;
    }

    // set presence for current user and remove on disconnect
    const pRef = db.ref(`presence/${me.uid}`);
    await pRef.set({ name: me.name, ts: firebase.database.ServerValue.TIMESTAMP });
    pRef.onDisconnect().remove();

    // now hide overlay, show app
    overlay.classList.add('hidden');
    appEl.classList.remove('hidden');
    youBadge.textContent = `You: ${me.name}`;

    // listen for presence and chats
    listenPresence();
  } catch (err) {
    console.error(err);
    showOverlayMsg('Failed to join: ' + err.message);
    joinBtn.disabled = false;
  }
});

// presence listeners
function listenPresence(){
  const presenceRef = db.ref('presence');
  presenceRef.on('child_added', snapshot => {
    const uid = snapshot.key;
    const data = snapshot.val();
    renderUserListAdd(uid, data);
  });
  presenceRef.on('child_removed', snapshot => {
    const uid = snapshot.key;
    renderUserListRemove(uid);
    // if the person we were chatting with left, clear chat area
    if(currentChat && currentChat.uid === uid){
      closeChat();
      chatTitleEl.textContent = 'User went offline';
    }
  });
  presenceRef.on('child_changed', snapshot => {
    const uid = snapshot.key;
    const data = snapshot.val();
    renderUserListUpdate(uid, data);
  });
}

// render helpers for online users list
function renderUserListAdd(uid, data){
  // do not show self in list
  if(uid === me.uid) return;
  let li = document.createElement('li');
  li.id = `user-${uid}`;
  li.dataset.uid = uid;
  li.innerHTML = `<span class="name">${escapeHtml(data.name)}</span><span class="status muted">online</span>`;
  li.addEventListener('click', () => openChatWith(uid, data.name));
  usersListEl.appendChild(li);
}
function renderUserListRemove(uid){
  const el = document.getElementById(`user-${uid}`);
  if(el) el.remove();
}
function renderUserListUpdate(uid, data){
  const el = document.getElementById(`user-${uid}`);
  if(el) el.querySelector('.name').textContent = data.name || 'Unknown';
}

// open chat with a user
function openChatWith(uid, name){
  currentChat = { uid, name, roomId: roomIdFor(me.uid, uid) };
  chatTitleEl.textContent = `Chat with ${name}`;
  messagesEl.innerHTML = '';
  msgForm.classList.remove('hidden');
  // start listening messages in this room
  const msgsRef = db.ref(`chats/${currentChat.roomId}/messages`);
  msgsRef.off(); // remove any previous listeners
  msgsRef.limitToLast(200).on('child_added', snapshot => {
    const m = snapshot.val();
    appendMessage(m);
  });
}

// close chat UI
function closeChat(){
  currentChat = null;
  msgForm.classList.add('hidden');
  messagesEl.innerHTML = '';
}

// send message
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
    alert('Failed to send message: ' + err.message);
  }
});

// append message to messages view
function appendMessage(m){
  const div = document.createElement('div');
  div.className = 'msg' + (m.fromUid === me.uid ? ' me' : '');
  const meta = document.createElement('div');
  meta.className = 'meta';
  const date = new Date(m.ts || Date.now());
  meta.textContent = `${m.fromName} • ${date.toLocaleTimeString()}`;
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = m.text;
  div.appendChild(meta);
  div.appendChild(bubble);
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// small utility to escape text into textContent-safe strings
function escapeHtml(str){
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// Clean up presence if user refreshes or closes tab (this is handled by onDisconnect but good to try)
window.addEventListener('beforeunload', () => {
  if(me.uid){
    db.ref(`presence/${me.uid}`).remove();
  }
});
