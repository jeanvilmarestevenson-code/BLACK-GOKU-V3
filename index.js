const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino');
const fs = require('fs');
const { setCode } = require('./web.js');

const OWNER_NUMBER = "555182215198";
const PREFIX = "₩";
const OWNER_JID = OWNER_NUMBER + "@s.whatsapp.net";

if(!fs.existsSync('./data')) fs.mkdirSync('./data');
const load = (f, def=[]) => fs.existsSync(f)? JSON.parse(fs.readFileSync(f)) : def;
const save = (f, d) => fs.writeFileSync(f, JSON.stringify(d));

let amis = load('./data/amis.json');
let blockedAdmin = load('./data/blocked.json');
let saved = load('./data/saved.json');
let chut = load('./data/chut.json');
let proUsers = load('./data/pro.json');
let antilinkGroups = load('./data/antilink.json'); // NOUVEAU
let botOn = true;

const isOwner = (jid) => jid && (jid.includes(OWNER_NUMBER) || jid === OWNER_JID);
const isAmis = (jid) => amis.includes(jid) || isOwner(jid);
const isSaved = (jid) => saved.includes(jid) || isOwner(jid) || proUsers.includes(jid);

const blackReply = (cmd) => ({
 ban: "Elimine. Son existence n'etait qu'une ombre ephemere.",
 kick: "Expulse du royaume des tenebres.",
 add: "Une nouvelle ame rejoint mon armee.",
 promote: "Je t'eleve au rang de lieutenant de l'ombre.",
 demote: "Retourne dans l'obscurite.",
 mute: "Que le silence regne.",
 unmute: "Le silence est brise.",
 chut: "Tes mots seront effaces avant meme d'exister.",
 unchut: "Tu peux a nouveau parler.",
 save: "Tu es sous ma protection.",
 unsave: "Ma protection se retire.",
 blockadmin: "Ton pouvoir d'admin est scelle.",
 unblockadmin: "Ton sceau est brise.",
 amis: "Je t'accorde une part de mon pouvoir.",
 noami: "Je reprends ce qui m'appartient.",
 pro: "Tu es marque par le sceau de Goku Noir.",
 antilink_on: "Antilink active. Les liens seront detruits dans les tenebres.",
 antilink_off: "Antilink desactive. Les liens sont toleres."
}[cmd] || `Ordre execute. ${cmd} accompli.`);

async function startBot(){
  const { state, saveCreds } = await useMultiFileAuthState('./session');
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({ version, auth: state, logger: P({level:'silent'}), printQRInTerminal:false, browser:['BLACK-GOKU-V3','Chrome','1.0'] });
  sock.ev.on('creds.update', saveCreds);

  if(!sock.authState.creds.registered){
    setTimeout(async()=>{ try{ let c = await sock.requestPairingCode(OWNER_NUMBER); setCode(c); }catch{ setCode("Erreur"); } }, 4000);
  }
  sock.ev.on('connection.update', (u)=>{
    const { connection, lastDisconnect } = u;
    if(connection==='open'){ setCode("BOT CONNECTE H24!"); }
    if(connection==='close'){ if(lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut) startBot(); else { try{fs.rmSync('./session',{recursive:true,force:true})}catch{} startBot(); } }
  });

  sock.ev.on('messages.upsert', async({messages})=>{
    const m = messages[0];
    if(!m.message || m.key.fromMe) return;
    const from = m.key.remoteJid;
    const isGroup = from.endsWith('@g.us');
    const sender = m.key.participant || from;
    const text = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || "";

    // === AUTO CHUT ===
    if(chut.includes(sender) && isGroup){ try{ await sock.sendMessage(from,{delete: m.key}); }catch{} return; }

    // === ANTILINK AUTO ===
    if(isGroup && antilinkGroups.includes(from) &&!isAmis(sender)){
      const hasLink = /(https?:\/\/|www\.|chat\.whatsapp\.com|wa\.me|\.com|\.net|\.link)/i.test(text);
      if(hasLink){
        try{
          await sock.sendMessage(from,{delete: m.key});
          await sock.sendMessage(from,{text:`Lien detruit. @${sender.split('@')[0]} n'a pas le droit de partager de lien.`, mentions:[sender]});
        }catch{}
        return;
      }
    }

    if(!text.startsWith(PREFIX)) return;
    const args = text.slice(1).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    const mentioned = m.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const target = mentioned[0] || null;
    const q = args.join(' ');

    if(!isAmis(sender)){ await sock.sendMessage(from, {text: "Seul Black Goku peut utiliser ce pouvoir"}); return; }
    if(!botOn &&!isOwner(sender) && cmd!== 'bot'){ return; }

    if(target && isOwner(target)){
      await sock.sendMessage(from, {text: "Tu ne peut pas vaincre Black Goku", mentions:[sender]});
      if(isGroup){ try{ await sock.groupParticipantsUpdate(from, [sender], "remove"); }catch{} }
      return;
    }
    if(target && isSaved(target) &&!isOwner(sender)){
      if(['ban','kick','chut','blockadmin'].includes(cmd)){
        await sock.sendMessage(from, {text: `Impossible. ${target.split('@')[0]} est sous ma protection.`, mentions:[target, sender]});
        if(isGroup){ try{ await sock.groupParticipantsUpdate(from, [sender], "remove"); }catch{} }
        return;
      }
    }

    try{
      switch(cmd){
        case 'black': case 'menu': case 'help': case 'info': case 'config':
          await sock.sendMessage(from, {text: `
╔══════════════════════════╗
║ BLACK GOKU V3 ║
║ PREFIX : ₩ ║
╚══════════════════════════╝

┏━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ GESTION GROUPE
┣━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ ₩ban / ₩kick [@user]
┃ ₩add [numero]
┃ ₩promote / ₩demote [@user]
┃ ₩admin
┃ ₩groupinfo
┗━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ MODERATION
┣━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ ₩mute / ₩unmute
┃ ₩chut / ₩unchut [@user]
┃ ₩tagall [texte]
┃ ₩hidetag [texte]
┃ ₩antilink on / off
┃ ₩welcome on / off
┃ ₩godmode
┗━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ PROTECTION
┣━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ ₩save / ₩unsave [@user]
┃ ₩blockadmin / ₩unblockadmin [@user]
┃ ₩pro [@user]
┗━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ SECRET & FUN
┣━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ ₩vq
┃ ₩ghost
┃ ₩rdm
┃ ₩sticker
┗━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ STYLE & CONFIG
┣━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ ₩mode
┃ ₩pt on / off
┃ ₩ping
┗━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ OWNER ONLY
┣━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ ₩bot on / off
┃ ₩amis / ₩noami [@user]
┗━━━━━━━━━━━━━━━━━━━━━━━━┛

BLACK GOKU - LE ROI DU NEANT
`});
          break;

        case 'amis':
          if(isGroup){ if(!target) return; if(!amis.includes(target)){ amis.push(target); save('./data/amis.json', amis); } await sock.sendMessage(from,{text:blackReply('amis'), mentions:[target]}); }
          else { if(!amis.includes(from)){ amis.push(from); save('./data/amis.json', amis); } await sock.sendMessage(from,{text:blackReply('amis')}); }
          break;
        case 'noami':
          if(isGroup){ if(!target) return; amis = amis.filter(x=>x!==target); save('./data/amis.json', amis); await sock.sendMessage(from,{text:blackReply('noami'), mentions:[target]}); }
          else { amis = amis.filter(x=>x!==from); save('./data/amis.json', amis); await sock.sendMessage(from,{text:blackReply('noami')}); }
          break;

        case 'antilink':
          if(!isGroup) return;
          if(q==='on'){ if(!antilinkGroups.includes(from)){ antilinkGroups.push(from); save('./data/antilink.json', antilinkGroups); } await sock.sendMessage(from,{text:blackReply('antilink_on')}); }
          if(q==='off'){ antilinkGroups = antilinkGroups.filter(x=>x!==from); save('./data/antilink.json', antilinkGroups); await sock.sendMessage(from,{text:blackReply('antilink_off')}); }
          break;

        case 'ban': case 'kick':
          if(!isGroup ||!target) return; await sock.groupParticipantsUpdate(from, [target], "remove"); await sock.sendMessage(from,{text:blackReply('ban'), mentions:[target]}); break;
        case 'add':
          if(!isGroup ||!q) return; let num = q.replace(/[^0-9]/g,'') + "@s.whatsapp.net"; await sock.groupParticipantsUpdate(from, [num], "add"); await sock.sendMessage(from,{text:blackReply('add'), mentions:[num]}); break;
        case 'promote':
          if(!isGroup ||!target) return; await sock.groupParticipantsUpdate(from, [target], "promote"); await sock.sendMessage(from,{text:blackReply('promote'), mentions:[target]}); break;
        case 'demote':
          if(!isGroup ||!target) return; await sock.groupParticipantsUpdate(from, [target], "demote"); await sock.sendMessage(from,{text:blackReply('demote'), mentions:[target]}); break;
        case 'mute':
          if(!isGroup) return; await sock.groupSettingUpdate(from, 'announcement'); await sock.sendMessage(from,{text:blackReply('mute')}); break;
        case 'unmute':
          if(!isGroup) return; await sock.groupSettingUpdate(from, 'not_announcement'); await sock.sendMessage(from,{text:blackReply('unmute')}); break;
        case 'save':
          if(target){ if(!saved.includes(target)){ saved.push(target); save('./data/saved.json', saved); } await sock.sendMessage(from,{text:blackReply('save'), mentions:[target]}); }
          else { if(!saved.includes(sender)){ saved.push(sender); save('./data/saved.json', saved); } await sock.sendMessage(from,{text:blackReply('save')}); }
          break;
        case 'unsave':
          if(target){ saved=saved.filter(x=>x!==target); save('./data/saved.json', saved); await sock.sendMessage(from,{text:blackReply('unsave'), mentions:[target]}); }
          else { saved=saved.filter(x=>x!==from && x!==sender); save('./data/saved.json', saved); await sock.sendMessage(from,{text:blackReply('unsave')}); }
          break;
        case 'pro':
          if(!target) return; if(!proUsers.includes(target)){ proUsers.push(target); save('./data/pro.json', proUsers); } await sock.sendMessage(from,{text:blackReply('pro'), mentions:[target]}); break;
        case 'blockadmin':
          if(!target) return; if(!blockedAdmin.includes(target)){ blockedAdmin.push(target); save('./data/blocked.json', blockedAdmin); } await sock.sendMessage(from,{text:blackReply('blockadmin'), mentions:[target]}); break;
        case 'unblockadmin':
          if(!target) return; blockedAdmin=blockedAdmin.filter(x=>x!==target); save('./data/blocked.json', blockedAdmin); await sock.sendMessage(from,{text:blackReply('unblockadmin'), mentions:[target]}); break;
        case 'chut':
          if(!target) return; if(!chut.includes(target)){ chut.push(target); save('./data/chut.json', chut); } await sock.sendMessage(from,{text:blackReply('chut'), mentions:[target]}); break;
        case 'unchut':
          if(!target) return; chut=chut.filter(x=>x!==target); save('./data/chut.json', chut); await sock.sendMessage(from,{text:blackReply('unchut'), mentions:[target]}); break;
        case 'tagall':
          if(!isGroup) return; let members = (await sock.groupMetadata(from)).participants.map(p=>p.id); await sock.sendMessage(from,{text:`TAGALL\n${q}\n\n`+members.map(m=>`@${m.split('@')[0]}`).join('\n'), mentions:members}); break;
        case 'hidetag':
          if(!isGroup) return; let mem = (await sock.groupMetadata(from)).participants.map(p=>p.id); await sock.sendMessage(from,{text: q || "Black Goku", mentions:mem}); break;
        case 'rdm':
          let api = Math.random()>0.5? "https://api.waifu.pics/sfw/waifu" : "https://api.waifu.pics/sfw/shinobu"; try{ let res = await fetch(api); let data = await res.json(); await sock.sendMessage(from,{image:{url:data.url}, caption:"Ame capturee..."}); }catch{ await sock.sendMessage(from,{text:"Le neant est vide."}); } break;
        case 'ping':
          await sock.sendMessage(from,{text:"Je suis eveille dans les tenebres. Latence: eternelle."}); break;
        case 'bot':
          if(!isOwner(sender)) return; if(q==='on'){ botOn=true; await sock.sendMessage(from,{text:"Black Goku est eveille."}); } if(q==='off'){ botOn=false; await sock.sendMessage(from,{text:"Black Goku s'endort..."}); } break;
      }
    }catch(e){ console.log(e); }
  });
}
startBot();
