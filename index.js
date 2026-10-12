const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadContentFromMessage } = require('@whiskeysockets/baileys')
const P = require('pino')
const fs = require('fs')
const { setQR } = require('./web')

// TON NUMERO AUTO OWNER - DEJA MIS!
const OWNER_NUMBER = "555182215198"

if(fs.existsSync('./auth')){ try{ fs.rmSync('./auth',{recursive:true,force:true}) }catch{} }
const DB_FILE='./black_db.json'
let db={ owner:null, amis:[], saved:[], chut:[], pro:[], antisticker:{}, godmode:[], ghost:false, botEnabled:true, pt:{} }
if(fs.existsSync(DB_FILE)){ try{ db=JSON.parse(fs.readFileSync(DB_FILE)) }catch{} }
const saveDB=()=>fs.writeFileSync(DB_FILE, JSON.stringify(db))

const MENU=`╭────────────────
│ 👥 GESTION GROUPE
│ • ₩ban / ₩kick @user
│ • ₩add 221...
│ • ₩promote / ₩demote
│ • ₩admin / ₩groupinfo
│
│ 🚫 MODÉRATION
│ • ₩mute / ₩unmute
│ • ₩chut / ₩unchut
│ • ₩tagall / ₩hidetag msg
│ • ₩godmode on/off
│ • ₩antisticker on/off
│ • ₩welcome on/off
│
│ 🛡️ PROTECTION
│ • ₩save / ₩unsave
│ • ₩blockadmin / ₩unblockadmin
│ • ₩pro
│
│ 👁️ SECRET & FUN
│ • ₩vq (repond vue unique)
│ • ₩ghost on/off
│ • ₩rdm / ₩sticker
│
│ ⚙️ CONFIG
│ • ₩pt on/off / ₩mode
│ • ₩bot on/off (owner)
│ • ₩amis / ₩noami
╰────────────────`

async function startBot(){
const { state, saveCreds } = await useMultiFileAuthState('auth')
const sock = makeWASocket({ auth: state, logger: P({level:'silent'}), browser: ["BLACK-GOKU","Chrome","1.0"] })
sock.ev.on('creds.update', saveCreds)
sock.ev.on('connection.update', u=>{
if(u.qr) setQR(u.qr, "SCAN QR BLACK GOKU V3 - 555182215198")
if(u.connection==='open'){
  setQR(null, "BLACK GOKU 1000% ACTIF - 555182215198");
  db.owner=sock.user.id;
  saveDB();
  console.log("OWNER AUTO: "+sock.user.id)
}
if(u.connection==='close'&&u.lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut) setTimeout(startBot,3000)
})
sock.ev.on('messages.upsert', async({messages})=>{
const m=messages[0]; if(!m.message) return
const from=m.key.remoteJid; const sender=m.key.participant||from
let content=m.message.conversation||m.message.extendedTextMessage?.text||m.message.imageMessage?.caption||m.message.videoMessage?.caption||""
if(!content.startsWith('₩')) return
const args=content.slice(1).trim().split(/ +/); const cmd=args[0].toLowerCase(); const q=args.slice(1).join(' ')
const mentioned=m.message.extendedTextMessage?.contextInfo?.mentionedJid||[]
const getTarget=()=>mentioned[0]||(q.replace(/[^0-9]/g,'')?q.replace(/[^0-9]/g,'')+'@s.whatsapp.net':null)
const isOwner=sender===db.owner||m.key.fromMe||sender.includes("555182215198")||sender.includes("82215198")
if(!isOwner&&!db.amis.includes(sender)) return
let target=getTarget()
if(cmd==="black"||cmd==="menu") await sock.sendMessage(from,{text:MENU},{quoted:m})
else if(cmd==="ban"||cmd==="kick"){ if(target) await sock.groupParticipantsUpdate(from,[target],"remove") }
else if(cmd==="add"){ let n=q.replace(/[^0-9]/g,''); if(n) await sock.groupParticipantsUpdate(from,[n+'@s.whatsapp.net'],"add") }
else if(cmd==="promote"&&target) await sock.groupParticipantsUpdate(from,[target],"promote")
else if(cmd==="demote"&&target) await sock.groupParticipantsUpdate(from,[target],"demote")
else if(cmd==="mute") await sock.groupSettingUpdate(from,'announcement')
else if(cmd==="unmute") await sock.groupSettingUpdate(from,'not_announcement')
else if(cmd==="tagall"){ const meta=await sock.groupMetadata(from); await sock.sendMessage(from,{text:q||"Black Goku", mentions:meta.participants.map(p=>p.id)},{quoted:m}) }
else if(cmd==="hidetag"){ const meta=await sock.groupMetadata(from); await sock.sendMessage(from,{text:q||" ", mentions:meta.participants.map(p=>p.id)},{quoted:m}) }
else if(cmd==="vq"){ const qp=m.message.extendedTextMessage?.contextInfo?.quotedMessage; if(!qp) return; const msg=qp.viewOnceMessageV2?.message||qp.viewOnceMessage?.message; if(!msg) return; const type=Object.keys(msg)[0]; const stream=await downloadContentFromMessage(msg[type], type.includes('image')?'image':'video'); let b=Buffer.from([]); for await(const c of stream) b=Buffer.concat([b,c]); if(type.includes('image')) await sock.sendMessage(from,{image:b},{quoted:m}); else await sock.sendMessage(from,{video:b},{quoted:m}) }
else if(cmd==="amis"&&target){ if(!db.amis.includes(target)){ db.amis.push(target); saveDB() } }
else if(cmd==="noami"&&target){ db.amis=db.amis.filter(x=>x!==target); saveDB() }
})
}
startBot()
