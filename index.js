const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadContentFromMessage } = require('@whiskeysockets/baileys')
const P = require('pino')
const fs = require('fs')
const { setQR } = require('./web')

const DB_FILE = './black_db.json'
let db = { owner: null, amis: [], saved: [], blockadmin: [], chut: [], pro: [], antisticker: {}, welcome: {}, godmode: [], ghost: false, botEnabled: true, pt: {} }
if(fs.existsSync(DB_FILE)){ try{ db = JSON.parse(fs.readFileSync(DB_FILE)) }catch{} }
const saveDB = ()=> fs.writeFileSync(DB_FILE, JSON.stringify(db))

async function startBot(){
    const { state, saveCreds } = await useMultiFileAuthState('auth')
    const sock = makeWASocket({ auth: state, logger: P({level:'silent'}), browser: ["BLACK-GOKU-V3","Chrome","1.0.0"], markOnlineOnConnect:!db.ghost })
    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', async(u)=>{
        if(u.qr) setQR(u.qr, "SCAN BLACK GOKU V3")
        if(u.connection==='open'){ setQR(null, "BLACK GOKU 1000% ACTIF - UP 100%"); console.log("✅ BLACK ACTIF"); if(!db.owner) { db.owner = sock.user.id; saveDB() } }
        if(u.connection==='close' && u.lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut) startBot()
    })

    sock.ev.on('messages.upsert', async({messages})=>{
        const m = messages[0]; if(!m.message) return
        const from = m.key.remoteJid; const sender = m.key.participant || m.key.remoteJid
        const isGroup = from.endsWith('@g.us')
        let content = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || m.message.videoMessage?.caption || ""
        if(db.chut.includes(sender) &&!m.key.fromMe){ try{ await sock.sendMessage(from, {delete: m.key}) }catch{} return }
        if(isGroup && db.antisticker[from] && m.message.stickerMessage){ try{ await sock.sendMessage(from, {delete: m.key}) }catch{} return }
        if(!content.startsWith('₩')) return
        if(!db.botEnabled &&!content.startsWith('₩bot')) return

        const args = content.slice(1).trim().split(/ +/); const cmd = args[0].toLowerCase(); const q = args.slice(1).join(' ')
        const mentioned = m.message.extendedTextMessage?.contextInfo?.mentionedJid || []
        const quotedParticipant = m.message.extendedTextMessage?.contextInfo?.participant
        const quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage
        const getTarget = ()=> mentioned[0] || quotedParticipant || (q.replace(/[^0-9]/g,'')? q.replace(/[^0-9]/g,'')+'@s.whatsapp.net' : null)
        if(!db.owner) { db.owner = sender; saveDB() }
        const isOwner = sender===db.owner || m.key.fromMe; const isAmis = db.amis.includes(sender); const isAuth = isOwner || isAmis
        if(!isAuth){ await sock.sendMessage(from, {text:"Seul Black Goku peut utiliser ce pouvoir"}, {quoted:m}); return }

        let target = getTarget()
        const isProtected = (jid)=> jid===db.owner || db.saved.includes(jid) || db.pro.includes(jid) || db.godmode.includes(jid)
        if(target && isProtected(target) && ["ban","kick","chut","blockadmin","demote","mute"].includes(cmd) &&!isOwner){
            await sock.sendMessage(from, {text:"Tu ne peut pas vaincre Black Goku"}, {quoted:m})
            if(isGroup){ try{ const meta = await sock.groupMetadata(from); if(meta.participants.find(p=>p.id===sock.user.id)?.admin) await sock.groupParticipantsUpdate(from, [sender], "remove") }catch{} }
            return
        }

        if(["black","menu","info","config"].includes(cmd)){
            await sock.sendMessage(from, {text:`BLACK GOKU V3 - PREFIX: ₩
╭────────────────
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
╰────────────────
*BLACK GOKU 1000% H24 UP*`}, {quoted:m})
        }
        else if(cmd==="ban"||cmd==="kick"){ if(!target) return; await sock.groupParticipantsUpdate(from, [target], "remove"); await sock.sendMessage(from, {text:"Effacé. Il n'était qu'une erreur."}, {quoted:m}) }
        else if(cmd==="add"){ let num=q.replace(/[^0-9]/g,''); if(num) await sock.groupParticipantsUpdate(from, [num+'@s.whatsapp.net'], "add") }
        else if(cmd==="promote"){ if(target) { await sock.groupParticipantsUpdate(from, [target], "promote"); await sock.sendMessage(from, {text:"Je t'élève au-dessus des insectes."}, {quoted:m}) } }
        else if(cmd==="demote"){ if(target) { await sock.groupParticipantsUpdate(from, [target], "demote"); await sock.sendMessage(from, {text:"Retourne ramper."}, {quoted:m}) } }
        else if(cmd==="admin"){ const meta=await sock.groupMetadata(from); let admins=meta.participants.filter(p=>p.admin).map(p=>`• @${p.id.split('@')[0]}`).join('\n'); await sock.sendMessage(from, {text:`Admins:\n${admins}`, mentions: meta.participants.filter(p=>p.admin).map(p=>p.id)}, {quoted:m}) }
        else if(cmd==="groupinfo"){ const meta=await sock.groupMetadata(from); await sock.sendMessage(from, {text:`*${meta.subject}*\nMembres: ${meta.participants.length}\nCréé: ${new Date(meta.creation*1000).toLocaleDateString()}\nDesc: ${meta.desc||"Aucune"}`}, {quoted:m}) }
        else if(cmd==="mute"){ await sock.groupSettingUpdate(from, 'announcement'); await sock.sendMessage(from, {text:"Silence. J'ai parlé."}, {quoted:m}) }
        else if(cmd==="unmute"){ await sock.groupSettingUpdate(from, 'not_announcement'); await sock.sendMessage(from, {text:"Parlez. Votre bruit m'amuse."}, {quoted:m}) }
        else if(cmd==="chut"){ if(target){ db.chut.push(target); saveDB(); await sock.sendMessage(from, {text:"Chaque mot sera effacé."}, {quoted:m}) } }
        else if(cmd==="unchut"){ db.chut=db.chut.filter(x=>x!==target); saveDB(); await sock.sendMessage(from, {text:"Je le libère."}, {quoted:m}) }
        else if(cmd==="tagall"){ const meta=await sock.groupMetadata(from); await sock.sendMessage(from, {text:`*BLACK GOKU EVOQUE* 🖤\n${q}`, mentions: meta.participants.map(p=>p.id)}, {quoted:m}) }
        else if(cmd==="hidetag"){ const meta=await sock.groupMetadata(from); await sock.sendMessage(from, {text:q||" ", mentions: meta.participants.map(p=>p.id)}, {quoted:m}) }
        else if(cmd==="godmode"){ if(q==="off"){ db.godmode=db.godmode.filter(x=>x!==from); saveDB(); await sock.sendMessage(from, {text:"Godmode off"}, {quoted:m}) } else { if(!db.godmode.includes(from)) db.godmode.push(from); if(!db.saved.includes(db.owner)) db.saved.push(db.owner); saveDB(); await sock.sendMessage(from, {text:"Je suis intouchable ici."}, {quoted:m}) } }
        else if(cmd==="antisticker"){ if(q==="on"){ db.antisticker[from]=true; saveDB(); await sock.sendMessage(from, {text:"Antisticker on"}, {quoted:m}) } else { delete db.antisticker[from]; saveDB(); await sock.sendMessage(from, {text:"Antisticker off"}, {quoted:m}) } }
        else if(cmd==="welcome"){ if(q==="on"){ db.welcome[from]=true; saveDB(); await sock.sendMessage(from, {text:"Welcome on"}, {quoted:m}) } else { delete db.welcome[from]; saveDB(); await sock.sendMessage(from, {text:"Welcome off"}, {quoted:m}) } }
        else if(cmd==="save"){ let t=target||sender; if(!db.saved.includes(t)){ db.saved.push(t); saveDB() } await sock.sendMessage(from, {text:"Sous ma protection."}, {quoted:m}) }
        else if(cmd==="unsave"){ let t=target||sender; db.saved=db.saved.filter(x=>x!==t); saveDB(); await sock.sendMessage(from, {text:"Protection retirée."}, {quoted:m}) }
        else if(cmd==="blockadmin"){ if(target){ if(!db.blockadmin.includes(target)) db.blockadmin.push(target); saveDB(); await sock.sendMessage(from, {text:"Pouvoirs scellés."}, {quoted:m}) } }
        else if(cmd==="unblockadmin"){ db.blockadmin=db.blockadmin.filter(x=>x!==target); saveDB(); await sock.sendMessage(from, {text:"Pouvoir rendu."}, {quoted:m}) }
        else if(cmd==="pro"){ if(target){ if(!db.pro.includes(target)) db.pro.push(target); if(!db.saved.includes(target)) db.saved.push(target); saveDB(); await sock.sendMessage(from, {text:"Protection absolue."}, {quoted:m}) } }
        else if(cmd==="amis"){ let t=target||quotedParticipant; if(!t &&!isGroup) t=from; if(!t) return; if(!db.amis.includes(t)){ db.amis.push(t); saveDB() } await sock.sendMessage(from, {text:"Digne d'utiliser mon pouvoir."}, {quoted:m}) }
        else if(cmd==="noami"){ let t=target||quotedParticipant||from; db.amis=db.amis.filter(x=>x!==t); saveDB(); await sock.sendMessage(from, {text:"Accès révoqué."}, {quoted:m}) }
        else if(cmd==="vq"){ if(quoted?.viewOnceMessageV2 || quoted?.viewOnceMessage){ const msg = quoted.viewOnceMessageV2?.message || quoted.viewOnceMessage?.message; const type = Object.keys(msg)[0]; const stream = await downloadContentFromMessage(msg[type], type==='imageMessage'?'image': type==='videoMessage'?'video':'audio'); let data=Buffer.from([]); for await(const chunk of stream) data=Buffer.concat([data, chunk]); if(type==='imageMessage') await sock.sendMessage(from, {image:data, caption:"Volé."}, {quoted:m}); if(type==='videoMessage') await sock.sendMessage(from, {video:data, caption:"Rien ne m'échappe."}, {quoted:m}) } else await sock.sendMessage(from, {text:"Reponds a une vue unique avec ₩vq"}, {quoted:m}) }
        else if(cmd==="ghost"){ if(q==="on"){ db.ghost=true; saveDB(); await sock.sendMessage(from, {text:"Fantôme on"}, {quoted:m}) } else { db.ghost=false; saveDB(); await sock.sendMessage(from, {text:"Visible."}, {quoted:m}) } }
        else if(cmd==="rdm"){ try{ const r=await fetch('https://api.waifu.pics/sfw/waifu'); const d=await r.json(); await sock.sendMessage(from, {image:{url:d.url}, caption:"Contemple."}, {quoted:m}) }catch{} }
        else if(cmd==="sticker"){ if(m.message.imageMessage){ const stream=await downloadContentFromMessage(m.message.imageMessage, 'image'); let data=Buffer.from([]); for await(const c of stream) data=Buffer.concat([data,c]); await sock.sendMessage(from, {sticker:data}, {quoted:m}) } }
        else if(cmd==="pt"){ if(q==="on"){ db.pt[from]=true; saveDB(); await sock.sendMessage(from, {text:"PT on"}, {quoted:m}) } else { delete db.pt[from]; saveDB(); await sock.sendMessage(from, {text:"PT off"}, {quoted:m}) } }
        else if(cmd==="bot"){ if(!isOwner) return; if(q==="off"){ db.botEnabled=false; saveDB(); await sock.sendMessage(from, {text:"Je dors."}, {quoted:m}) } else { db.botEnabled=true; saveDB(); await sock.sendMessage(from, {text:"Je suis revenu."}, {quoted:m}) } }
    })
}
startBot()
