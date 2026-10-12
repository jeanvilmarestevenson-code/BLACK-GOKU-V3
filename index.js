const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadContentFromMessage } = require('@whiskeysockets/baileys')
const P = require('pino')
const fs = require('fs')
const { setQR } = require('./web')

const DB_FILE = './black_db.json'
let db = { owner: null, amis: [], saved: [], blockadmin: [], chut: [], pro: [], antisticker: {}, welcome: {}, godmode: [], ghost: false, botEnabled: true }
if(fs.existsSync(DB_FILE)){ try{ db = JSON.parse(fs.readFileSync(DB_FILE)) }catch{} }
const saveDB = ()=> fs.writeFileSync(DB_FILE, JSON.stringify(db))

const MSG_NO_POWER = "Seul Black Goku peut utiliser ce pouvoir"
const MSG_GOD = "Tu ne peut pas vaincre Black Goku"

async function startBot(){
    const { state, saveCreds } = await useMultiFileAuthState('auth')
    const sock = makeWASocket({ auth: state, logger: P({level:'silent'}), browser: ["BLACK-GOKU-V3","Chrome","1.0.0"], markOnlineOnConnect:!db.ghost })
    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', async(u)=>{
        if(u.qr) setQR(u.qr, "SCAN BLACK GOKU V3")
        if(u.connection==='open'){ setQR(null, "BLACK GOKU 1000% ACTIF - UP 100%"); console.log("✅ BLACK ACTIF"); if(!db.owner) db.owner = sock.user.id }
        if(u.connection==='close' && u.lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut) startBot()
    })

    sock.ev.on('messages.upsert', async({messages})=>{
        const m = messages[0]
        if(!m.message) return
        const from = m.key.remoteJid
        const sender = m.key.participant || m.key.remoteJid
        const isGroup = from.endsWith('@g.us')
        let content = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || m.message.videoMessage?.caption || ""

        if(db.chut.includes(sender) &&!m.key.fromMe){ try{ await sock.sendMessage(from, {delete: m.key}) }catch{} return }
        if(isGroup && db.antisticker[from] && m.message.stickerMessage){ try{ await sock.sendMessage(from, {delete: m.key}) }catch{} return }

        if(!content.startsWith('₩')) return
        if(!db.botEnabled &&!content.startsWith('₩bot')) return

        const args = content.slice(1).trim().split(/ +/)
        const cmd = args[0].toLowerCase()
        const q = args.slice(1).join(' ')
        const mentioned = m.message.extendedTextMessage?.contextInfo?.mentionedJid || []
        const quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage
        const quotedParticipant = m.message.extendedTextMessage?.contextInfo?.participant
        const getTarget = ()=> mentioned[0] || (quotedParticipant) || (q.replace(/[^0-9]/g,'')? q.replace(/[^0-9]/g,'')+'@s.whatsapp.net' : null)

        if(!db.owner) { db.owner = sender; saveDB() }
        const isOwner = sender===db.owner || m.key.fromMe
        const isAmis = db.amis.includes(sender)
        const isAuth = isOwner || isAmis
        if(!isAuth){ await sock.sendMessage(from, {text: MSG_NO_POWER}, {quoted: m}); return }
        const isProtected = (jid)=> jid===db.owner || db.saved.includes(jid) || db.pro.includes(jid) || db.godmode.includes(jid)
        let target = getTarget()
        if(target && isProtected(target) && ["ban","kick","chut","blockadmin","demote","mute"].includes(cmd)){
            if(!isOwner){
                await sock.sendMessage(from, {text: MSG_GOD}, {quoted: m})
                if(isGroup){ try{ const meta = await sock.groupMetadata(from); if(meta.participants.find(p=>p.id===sock.user.id)?.admin) await sock.groupParticipantsUpdate(from, [sender], "remove") }catch{} }
                return
            }
        }

        if(["black","menu","info","config"].includes(cmd)){
            await sock.sendMessage(from, {text:
`BLACK GOKU
PREFIX: ₩
╭────────────────
│ 👥 GESTION GROUPE
│ • ₩ban / ₩kick
│ • ₩add [num]
│ • ₩promote / ₩demote
│ • ₩admin
│ • ₩groupinfo

│ 🚫 MODÉRATION
│ • ₩mute / ₩unmute
│ • ₩chut / ₩unchut
│ • ₩tagall [msg]
│ • ₩hidetag [msg]
│ • ₩godmode
│ • ₩antisticker on/off
│ • ₩welcome on/off

│ 🛡️ PROTECTION
│ • ₩save / ₩unsave
│ • ₩blockadmin / ₩unblockadmin

│ 👁️ SECRET & FUN
│ • ₩vq
│ • ₩ghost
│ • ₩rdm
│ • ₩sticker

│ ⚙️ STYLE & CONFIG
│ • ₩mode / ₩style
│ • ₩config / ₩black
│ • ₩info
│ • ₩pt on/off

│ 🔒 OWNER ONLY
│ • ₩bot on/off
│ • ₩amis / ₩noami
│ • ₩pro
╰────────────────
*BLACK GOKU 1000% H24 UP 100%*`}, {quoted: m})
        }
        else if(cmd==="ban" || cmd==="kick"){ if(!target) return; await sock.groupParticipantsUpdate(from, [target], "remove"); await sock.sendMessage(from, {text: "Effacé. Il n'était qu'une erreur dans mon monde."}, {quoted: m}) }
        else if(cmd==="add"){ let num=q.replace(/[^0-9]/g,''); if(num) await sock.groupParticipantsUpdate(from, [num+'@s.whatsapp.net'], "add") }
        else if(cmd==="promote"){ await sock.groupParticipantsUpdate(from, [target], "promote"); await sock.sendMessage(from, {text: "Je t'élève au-dessus des insectes."}, {quoted: m}) }
        else if(cmd==="demote"){ await sock.groupParticipantsUpdate(from, [target], "demote"); await sock.sendMessage(from, {text: "Retourne ramper."}, {quoted: m}) }
        else if(cmd==="mute"){ await sock.groupSettingUpdate(from, 'announcement'); await sock.sendMessage(from, {text: "Silence. J'ai parlé."}, {quoted: m}) }
        else if(cmd==="unmute"){ await sock.groupSettingUpdate(from, 'not_announcement'); await sock.sendMessage(from, {text: "Parlez. Votre bruit m'amuse."}, {quoted: m}) }
        else if(cmd==="chut"){ if(target){ db.chut.push(target); saveDB(); await sock.sendMessage(from, {text: "Chaque mot qu'il prononcera sera effacé."}, {quoted: m}) } }
        else if(cmd==="unchut"){ db.chut=db.chut.filter(x=>x!==target); saveDB(); await sock.sendMessage(from, {text: "Je le libère. Pour l'instant."}, {quoted: m}) }
        else if(cmd==="tagall"){ const meta=await sock.groupMetadata(from); await sock.sendMessage(from, {text: `*BLACK GOKU EVOQUE* 🖤\n${q}`, mentions: meta.participants.map(p=>p.id)}, {quoted: m}) }
        else if(cmd==="hidetag"){ const meta=await sock.groupMetadata(from); await sock.sendMessage(from, {text: q||" ", mentions: meta.participants.map(p=>p.id)}, {quoted: m}) }
        else if(cmd==="godmode"){
            if(!isGroup) return
            if(q==="off"){ db.godmode=db.godmode.filter(x=>x!==from); saveDB(); await sock.sendMessage(from, {text: "Godmode désactivé."}, {quoted: m}) }
            else { if(!db.godmode.includes(from)) db.godmode.push(from); if(!db.saved.includes(db.owner)) db.saved.push(db.owner); saveDB(); await sock.sendMessage(from, {text: "Je suis intouchable ici. Quiconque me défie sera détruit."}, {quoted: m}) }
        }
        else if(cmd==="save"){ let t = target || (isGroup? null : quotedParticipant || from); if(!t) t=sender; if(!db.saved.includes(t)){ db.saved.push(t); saveDB() } await sock.sendMessage(from, {text: "Placé sous ma protection divine."}, {quoted: m}) }
        else if(cmd==="unsave"){ let t = target || quotedParticipant || from; db.saved=db.saved.filter(x=>x!==t); saveDB(); await sock.sendMessage(from, {text: "Ma protection se retire."}, {quoted: m}) }
        else if(cmd==="blockadmin"){ if(target){ if(!db.blockadmin.includes(target)) db.blockadmin.push(target); saveDB(); await sock.sendMessage(from, {text: "Ses pouvoirs sont scellés."}, {quoted: m}) } }
        else if(cmd==="unblockadmin"){ db.blockadmin=db.blockadmin.filter(x=>x!==target); saveDB(); await sock.sendMessage(from, {text: "Je lui rends son pouvoir."}, {quoted: m}) }
        else if(cmd==="pro"){ if(target){ if(!db.pro.includes(target)) db.pro.push(target); if(!db.saved.includes(target)) db.saved.push(target); saveDB(); await sock.sendMessage(from, {text: "Protection absolue accordée. Qui le touche me défie."}, {quoted: m}) } }
        else if(cmd==="amis"){ let t = target || quotedParticipant; if(!t &&!isGroup) t=from; if(!t) return sock.sendMessage(from, {text: "Réponds à son message avec ₩amis ou ₩amis @user"}, {quoted: m}); if(!db.amis.includes(t)){ db.amis.push(t); saveDB() } await sock.sendMessage(from, {text: "Tu as été jugé digne d'utiliser mon pouvoir."}, {quoted: m}) }
        else if(cmd==="noami"){ let t = target || quotedParticipant || from; db.amis=db.amis.filter(x=>x!==t); saveDB(); await sock.sendMessage(from, {text: "Ton accès à mon pouvoir est révoqué."}, {quoted: m}) }
        else if(cmd==="antisticker"){ if(q==="on"){ db.antisticker[from]=true; saveDB(); await sock.sendMessage(from, {text: "Les stickers faibles seront détruits."}, {quoted: m}) } else { delete db.antisticker[from]; saveDB(); await sock.sendMessage(from, {text: "Antisticker off."}, {quoted: m}) } }
        else if(cmd==="vq"){
            if(quoted?.viewOnceMessageV2 || quoted?.viewOnceMessage){
                const msg = quoted.viewOnceMessageV2?.message || quoted.viewOnceMessage?.message
                const type = Object.keys(msg)[0]
                const buffer = await downloadContentFromMessage(msg[type], type==='imageMessage'?'image': type==='videoMessage'?'video':'audio')
                let data = Buffer.from([])
                for await(const chunk of buffer) data = Buffer.concat([data, chunk])
                if(type==='imageMessage') await sock.sendMessage(from, {image: data, caption: "J'ai volé ce que tu voulais cacher."}, {quoted: m})
                if(type==='videoMessage') await sock.sendMessage(from, {video: data, caption: "Rien ne m'échappe."}, {quoted: m})
            } else await sock.sendMessage(from, {text: "Réponds à une vue unique avec ₩vq"}, {quoted: m})
        }
        else if(cmd==="ghost"){ if(q==="on"){ db.ghost=true; saveDB(); await sock.sendMessage(from, {text: "Je suis devenu fantôme. Invisible aux mortels."}, {quoted: m}) } else { db.ghost=false; saveDB(); await sock.sendMessage(from, {text: "Je redeviens visible."}, {quoted: m}) } }
        else if(cmd==="rdm"){ try{ const r=await fetch('https://api.waifu.pics/sfw/waifu'); const d=await r.json(); await sock.sendMessage(from, {image:{url:d.url}, caption:"Contemple la perfection."}, {quoted: m}) }catch{} }
        else if(cmd==="bot"){ if(!isOwner) return; if(q==="off"){ db.botEnabled=false; saveDB(); await sock.sendMessage(from, {text: "Je m'endors."}, {quoted: m}) } else { db.botEnabled=true; saveDB(); await sock.sendMessage(from, {text: "Je suis revenu."}, {quoted: m}) } }
    })
}
startBot()
require('./web')
