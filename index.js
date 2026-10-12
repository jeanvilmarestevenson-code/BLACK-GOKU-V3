const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadContentFromMessage } = require('@whiskeysockets/baileys')
const P = require('pino')
const fs = require('fs')
const { setQR } = require('./web')

if(fs.existsSync('./auth')){ try{ fs.rmSync('./auth',{recursive:true,force:true}) }catch{} }

const DB_FILE='./black_db.json'
let db={ owner:null, amis:[], saved:[], chut:[], pro:[], antisticker:{}, godmode:[], ghost:false, botEnabled:true, pt:{} }
if(fs.existsSync(DB_FILE)){ try{ db=JSON.parse(fs.readFileSync(DB_FILE)) }catch{} }
const saveDB=()=>fs.writeFileSync(DB_FILE, JSON.stringify(db))

// MENU BLACK GOKU V3
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
if(u.qr) setQR(u.qr, "SCAN BLACK GOKU V3")
if(u.connection==='open'){ setQR(null, "BLACK GOKU 1000% ACTIF"); if(!db.owner){ db.owner=sock.user.id; saveDB() } }
if(u.connection==='close'&&u.lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut) setTimeout(startBot,3000)
})

sock.ev.on('messages.upsert', async({messages})=>{
const m=messages[0]; if(!m.message) return
const from=m.key.remoteJid; const sender=m.key.participant||m.key.remoteJid
let content=m.message.conversation||m.message.extendedTextMessage?.text||m.message.imageMessage?.caption||m.message.videoMessage?.caption||""
if(!content.startsWith('₩')) return
const args=content.slice(1).trim().split(/ +/); const cmd=args[0].toLowerCase(); const q=args.slice(1).join(' ')
const mentioned=m.message.extendedTextMessage?.contextInfo?.mentionedJid||[]
const quotedMsg=m.message.extendedTextMessage?.contextInfo?.quotedMessage
const getTarget=()=>mentioned[0]||(q.replace(/[^0-9]/g,'')?q.replace(/[^0-9]/g,'')+'@s.whatsapp.net':null)
if(!db.owner){ db.owner=sender; saveDB() }
const isOwner=sender===db.owner||m.key.fromMe; if(!isOwner&&!db.amis.includes(sender)) return
let target=getTarget()

if(cmd==="black"||cmd==="menu"||cmd==="mode"){ await sock.sendMessage(from,{text:MENU},{quoted:m}) }
else if(cmd==="ban"||cmd==="kick"){ if(target) await sock.groupParticipantsUpdate(from,[target],"remove") }
else if(cmd==="add"){ let n=q.replace(/[^0-9]/g,''); if(n) await sock.groupParticipantsUpdate(from,[n+'@s.whatsapp.net'],"add") }
else if(cmd==="promote"&&target) await sock.groupParticipantsUpdate(from,[target],"promote")
else if(cmd==="demote"&&target) await sock.groupParticipantsUpdate(from,[target],"demote")
else if(cmd==="admin"){ const meta=await sock.groupMetadata(from); let t=""; meta.participants.filter(p=>p.admin).forEach(a=>t+=`• @${a.id.split('@')[0]}\n`); await sock.sendMessage(from,{text:t, mentions:meta.participants.filter(p=>p.admin).map(p=>p.id)},{quoted:m}) }
else if(cmd==="groupinfo"){ const meta=await sock.groupMetadata(from); await sock.sendMessage(from,{text:`${meta.subject}\n${meta.participants.length} membres`},{quoted:m}) }
else if(cmd==="mute") await sock.groupSettingUpdate(from,'announcement')
else if(cmd==="unmute") await sock.groupSettingUpdate(from,'not_announcement')
else if(cmd==="chut"&&target){ if(!db.chut.includes(target)){ db.chut.push(target); saveDB() } }
else if(cmd==="unchut"){ db.chut=db.chut.filter(x=>x!==target); saveDB() }
else if(cmd==="tagall"){ const meta=await sock.groupMetadata(from); await sock.sendMessage(from,{text:q||"Black", mentions:meta.participants.map(p=>p.id)},{quoted:m}) }
else if(cmd==="hidetag"){ const meta=await sock.groupMetadata(from); await sock.sendMessage(from,{text:q||" ", mentions:meta.participants.map(p=>p.id)},{quoted:m}) }
else if(cmd==="godmode"){ if(q==="off") db.godmode=db.godmode.filter(x=>x!==from); else if(!db.godmode.includes(from)) db.godmode.push(from); saveDB() }
else if(cmd==="antisticker"){ if(q==="on") db.antisticker[from]=true; else delete db.antisticker[from]; saveDB() }
else if(cmd==="welcome"){ }
else if(cmd==="save"){ let t=target||sender; if(!db.saved.includes(t)){ db.saved.push(t); saveDB() } }
else if(cmd==="unsave"){ let t=target||sender; db.saved=db.saved.filter(x=>x!==t); saveDB() }
else if(cmd==="blockadmin"&&target){ /* block */ }
else if(cmd==="unblockadmin"&&target){ }
else if(cmd==="pro"&&target){ if(!db.pro.includes(target)) db.pro.push(target); saveDB() }
else if(cmd==="vq"){ if(!quotedMsg) return; const msg=quotedMsg.viewOnceMessageV2?.message||quotedMsg.viewOnceMessage?.message; if(!msg) return; const type=Object.keys(msg)[0]; const stream=await downloadContentFromMessage(msg[type], type.includes('image')?'image':'video'); let b=Buffer.from([]); for await(const c of stream) b=Buffer.concat([b,c]); if(type.includes('image')) await sock.sendMessage(from,{image:b},{quoted:m}); else await sock.sendMessage(from,{video:b},{quoted:m}) }
else if(cmd==="ghost"){ db.ghost=q==="on"; saveDB() }
else if(cmd==="rdm"){ try{ const r=await fetch('https://api.waifu.pics/sfw/waifu'); const d=await r.json(); await sock.sendMessage(from,{image:{url:d.url}},{quoted:m}) }catch{} }
else if(cmd==="sticker"){ let media=m.message.imageMessage||m.message.videoMessage||quotedMsg?.imageMessage; if(!media) return; const stream=await downloadContentFromMessage(media, media===m.message.imageMessage?'image':'video'); let b=Buffer.from([]); for await(const c of stream) b=Buffer.concat([b,c]); await sock.sendMessage(from,{sticker:b},{quoted:m}) }
else if(cmd==="pt"){ db.pt[from]=q==="on"; saveDB() }
else if(cmd==="bot"&&isOwner){ db.botEnabled=q!=="off"; saveDB() }
else if(cmd==="amis"&&target){ if(!db.amis.includes(target)){ db.amis.push(target); saveDB() } }
else if(cmd==="noami"&&target){ db.amis=db.amis.filter(x=>x!==target); saveDB() }
})
}
startBot()
