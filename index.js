const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason, downloadMediaMessage } = require('@whiskeysockets/baileys');
const P = require('pino');
const fs = require('fs');
const QRCode = require('qrcode');
const { setQR } = require('./web.js');

const OWNER_NUMBER = "555182215198";
const PREFIX = "₩";

if(!fs.existsSync('./data')) fs.mkdirSync('./data');
const load = (f, def=[]) => fs.existsSync(f)? JSON.parse(fs.readFileSync(f)) : def;
const save = (f, d) => fs.writeFileSync(f, JSON.stringify(d));

let amis = load('./data/amis.json');
let blockedAdmin = load('./data/blocked.json');
let saved = load('./data/saved.json');
let chut = load('./data/chut.json');
let proUsers = load('./data/pro.json');
let antilinkGroups = load('./data/antilink.json');
let welcomeGroups = load('./data/welcome.json');
let botOn = true;

const isOwner = (j)=> j && j.includes(OWNER_NUMBER);
const isAmis = (j)=> amis.includes(j) || isOwner(j);
const isPro = (j)=> proUsers.includes(j) || isOwner(j);
const isSaved = (j)=> saved.includes(j) || isOwner(j) || isPro(j);

async function startBot(){
  const { state, saveCreds } = await useMultiFileAuthState('./session');
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({ version, auth: state, logger: P({level:'silent'}), browser:['BLACK-GOKU-V4','Chrome','1.0'] });
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async(u)=>{
    const { connection, lastDisconnect, qr } = u;
    if(qr){ let img = await QRCode.toDataURL(qr); setQR(img, "SCANNE LE QR CODE - V4 1000%"); }
    if(connection==='open'){ console.log("CONNECTE 1000%"); setQR(null, "BOT CONNECTE H24 - 1000%!"); }
    if(connection==='close'){ if(lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut) startBot(); else { try{fs.rmSync('./session',{recursive:true,force:true})}catch{} startBot(); } }
  });

  sock.ev.on('group-participants.update', async(an)=>{
    if(!welcomeGroups.includes(an.id)) return;
    try{
      if(an.action==='add'){ for(let p of an.participants){ await sock.sendMessage(an.id,{text:`Bienvenue dans les tenebres @${p.split('@')[0]}`, mentions:[p]}); } }
      if(an.action==='remove'){ for(let p of an.participants){ await sock.sendMessage(an.id,{text:`@${p.split('@')[0]} a quitte le neant.`, mentions:[p]}); } }
    }catch{}
  });

  sock.ev.on('messages.upsert', async({messages})=>{
    const m = messages[0];
    if(!m.message) return;
    const from = m.key.remoteJid;
    const isGroup = from.endsWith('@g.us');
    let sender = m.key.participant || from;
    const isFromMe = m.key.fromMe;
    if(isFromMe) sender = OWNER_NUMBER + "@s.whatsapp.net";

    const text = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || m.message.videoMessage?.caption || "";
    const quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage;
    if(!text.startsWith(PREFIX)) return;

    const args = text.slice(1).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    const mentioned = m.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const target = mentioned[0] || null;
    const q = args.join(' ');

    // PROTECTION - SEUL OWNER + AMIS
    if(!isAmis(sender)){
      await sock.sendMessage(from, {text: "Seul Black Goku peut utiliser ce pouvoir"});
      return;
    }

    // PROTECTION CONTRE OWNER
    if(target && isOwner(target)){
      await sock.sendMessage(from, {text: "Tu ne peut pas vaincre Black Goku", mentions:[sender]});
      if(isGroup){ try{ await sock.groupParticipantsUpdate(from, [sender], "remove"); }catch{} }
      return;
    }
    if(target && isPro(target) &&!isOwner(sender)){
      await sock.sendMessage(from, {text: `Impossible. @${target.split('@')[0]} est intouchable. Tu subiras ton sort.`, mentions:[target, sender]});
      if(isGroup){ try{ await sock.groupParticipantsUpdate(from, [sender], "remove"); }catch{} }
      return;
    }

    try{
      if(['black','menu','help'].includes(cmd)){
        await sock.sendMessage(from, {text: `
Black Goku
PREFIX: ₩
╭────────────────
│ 👥 GESTION GROUPE
│ • ₩ban / ₩kick [@user]
│ • ₩add [num]
│ • ₩promote / ₩demote [@user]
│ • ₩admin
│ • ₩groupinfo
│
│ 🚫 MODÉRATION
│ • ₩mute / ₩unmute
│ • ₩chut / ₩unchut [@user]
│ • ₩tagall / ₩hidetag [msg]
│ • ₩antilink on/off
│ • ₩welcome on/off
│ • ₩godmode
│
│ 🛡️ PROTECTION
│ • ₩save / ₩unsave [@user]
│ • ₩blockadmin / ₩unblockadmin [@user]
│ • ₩pro / ₩unpro [@user]
│
│ 👁️ SECRET & FUN
│ • ₩vq / ₩sticker / ₩rdm / ₩del
│
│ ⚙️ CONFIG
│ • ₩ping / ₩mode / ₩bot on/off
│ • ₩amis / ₩noami [@user ou PV]
╰────────────────
BLACK GOKU - LE ROI DU NEANT - 1000%
`});
        return;
      }

      if(cmd==='amis'){
        if(isGroup){
          if(!target) return sock.sendMessage(from,{text:`${PREFIX}amis @user`});
          if(!amis.includes(target)){ amis.push(target); save('./data/amis.json', amis); }
          await sock.sendMessage(from,{text:`Pouvoir accorde a @${target.split('@')[0]}`, mentions:[target]});
        }else{
          let who = target || from;
          if(!amis.includes(who)){ amis.push(who); save('./data/amis.json', amis); }
          await sock.sendMessage(from,{text:"Je t'accorde une part de mon pouvoir."});
        }
      }
      if(cmd==='noami'){
        if(isGroup){
          if(!target) return;
          amis=amis.filter(x=>x!==target); save('./data/amis.json', amis);
          await sock.sendMessage(from,{text:`Pouvoir retire a @${target.split('@')[0]}`, mentions:[target]});
        }else{
          let who = target || from;
          amis=amis.filter(x=>x!==who); save('./data/amis.json', amis);
          await sock.sendMessage(from,{text:"Pouvoir retire."});
        }
      }

      if(cmd==='ban' || cmd==='kick'){ if(!isGroup||!target) return; await sock.groupParticipantsUpdate(from, [target], "remove"); await sock.sendMessage(from,{text:`Elimine @${target.split('@')[0]}`, mentions:[target]}); }
      if(cmd==='ping'){ await sock.sendMessage(from,{text:"BLACK GOKU V4 1000% - Eveille"}); }

    }catch(e){ console.log(e); }
  });
}
startBot();
