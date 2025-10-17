/* Same aesthetic CSS used earlier (keeps UI pleasant) */
:root{
  --bg:#0f1724;
  --card:#0b1220;
  --accent:#6ee7b7;
  --accent-2:#60a5fa;
  --muted:#9ca3af;
}
*{box-sizing:border-box}
html,body{height:100%}
body{
  margin:0;
  font-family:Inter,system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;
  background:linear-gradient(180deg,#081025 0%, #071021 50%, #061220 100%);
  color:#e6eef8;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:28px;
}

.overlay{
  position:fixed; inset:0; display:flex; align-items:center; justify-content:center;
  background:linear-gradient(180deg, rgba(2,6,23,0.55), rgba(2,6,23,0.6));
  z-index:40;
}
.dialog{
  width:360px; background:var(--card); border-radius:14px; padding:22px;
  box-shadow:0 10px 40px rgba(2,6,23,0.6); text-align:center;
}
.logo{
  width:60px; height:60px; border-radius:10px; margin:0 auto 12px;
  background:linear-gradient(135deg,var(--accent),var(--accent-2));
  display:flex; align-items:center; justify-content:center; font-weight:700; color:#022023; font-size:20px;
  box-shadow:0 6px 20px rgba(14,165,233,0.12) inset;
}
h1{margin:6px 0 2px 0; font-size:20px}
.muted{color:var(--muted)}
.small{font-size:12px}
.dialog input{
  width:100%; padding:12px 14px; margin-top:12px; border-radius:10px; border:1px solid rgba(255,255,255,0.04);
  background:transparent; color:inherit; outline:none;
}
.row{display:flex; justify-content:center; margin-top:12px}
button{background:linear-gradient(90deg,var(--accent),var(--accent-2)); color:#042022; border:none; padding:10px 16px; border-radius:10px; cursor:pointer; font-weight:600}
button:disabled{opacity:0.6; cursor:not-allowed}

.app{
  width:min(1100px,98vw); max-width:1200px; height:78vh; border-radius:14px; overflow:hidden;
  display:flex; gap:14px; box-shadow:0 20px 60px rgba(2,6,23,0.6);
}
.sidebar{
  width:300px; background:linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
  padding:16px; display:flex; flex-direction:column; gap:12px;
  border-right:1px solid rgba(255,255,255,0.03);
}
.sideHeader{display:flex; justify-content:space-between; align-items:flex-start}
.youBadge{padding:6px 8px; border-radius:8px; background:rgba(255,255,255,0.02); font-weight:600}

.sectionTitle{margin:8px 0 8px 0; font-size:13px; color:var(--muted)}
.usersList{list-style:none; padding:0; margin:0; overflow:auto; max-height:55vh}
.usersList li{
  display:flex; gap:12px; align-items:center; padding:10px; border-radius:10px; cursor:pointer;
  transition:transform .08s ease, background .08s;
}
.usersList li:hover{transform:translateX(4px); background:rgba(255,255,255,0.01)}
.userAvatar{
  width:42px; height:42px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-weight:700; color:#042022;
  background:linear-gradient(135deg,var(--accent),var(--accent-2));
}
.userMeta{flex:1; display:flex; flex-direction:column}
.userMeta .name{font-weight:600}
.userMeta .status{font-size:12px; color:var(--muted); margin-top:2px}
.userAction{font-size:12px; color:var(--muted)}

.chat{flex:1; display:flex; flex-direction:column; background:linear-gradient(180deg, rgba(255,255,255,0.015), rgba(255,255,255,0.01)); padding:0}
.chatHeader{padding:16px; border-bottom:1px solid rgba(255,255,255,0.02); display:flex; justify-content:space-between; align-items:center}
.messages{flex:1; padding:18px; overflow:auto; display:flex; flex-direction:column; gap:10px}
.messages.empty{align-items:center; justify-content:center}
.hint{color:var(--muted); text-align:center; max-width:70%;}

.msg{max-width:72%; display:flex; flex-direction:column; gap:6px}
.msg.me{margin-left:auto; align-items:flex-end}
.meta{font-size:12px; color:var(--muted)}
.bubble{
  padding:12px 14px; border-radius:12px; background:linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
  border:1px solid rgba(255,255,255,0.03);
}
.msg.me .bubble{background:linear-gradient(90deg, rgba(110,231,183,0.12), rgba(96,165,250,0.1)); border-color:rgba(96,165,250,0.12)}
.msg.other .bubble{background:rgba(255,255,255,0.02)}

.msgForm{display:flex; gap:10px; padding:12px; border-top:1px solid rgba(255,255,255,0.02)}
.msgForm input{flex:1; padding:12px; border-radius:10px; border:1px solid rgba(255,255,255,0.03); background:transparent; color:inherit; outline:none}
.msgForm button{padding:10px 14px; border-radius:10px; border:none; background:linear-gradient(90deg,var(--accent),var(--accent-2)); color:#042022; font-weight:700; cursor:pointer}

@media(max-width:880px){
  .app{flex-direction:column; height:92vh}
  .sidebar{width:100%; flex-direction:row; align-items:center; padding:10px; gap:8px; overflow:auto}
  .usersList{display:flex; gap:8px; max-height:none}
  .usersList li{min-width:130px; flex-direction:column; align-items:flex-start}
  .chat{width:100%}
}
