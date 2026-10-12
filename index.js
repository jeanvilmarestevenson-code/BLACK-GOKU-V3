const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason, downloadMediaMessage } = require('@whiskeysockets/baileys');
const P = require('pino');
const fs = require('fs');
const QRCode = require('qrcode');
const { setQR } = require('./web.js');

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
let antilinkGroups = load('./data/antilink.json');
let welcomeGroups = load('./data/welcome.json');
let botOn = true;

const isOwner = (j)=> j && j.includes(OWNER_NUMBER);
const isAmis = (j)=> amis.includes(j) || isOwner(j);
const isSaved = (j)=> saved.includes(j) || isOwner(j) || proUsers.includes(j);

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

  // WELCOME
  sock.ev.on('group-participants.update', async(an)=>{
    if(!welcomeGroups.includes(an.id)) return;
    try{
      if(an.action==='add'){ for(let p of an.participants){ await sock.sendMessage(an.id,{text:`Bienvenue dans les tenebres @${p.split('@')[0]}`, mentions:[p]}); } }
      if(an.action==='remove'){ for(let p of an.participants){ await sock.sendMessage(an.id,{text:`@${p.split('@')[0]} a quitte le neant.`, mentions:[p]}); } }
    }catch{}
  });

  sock.ev.on('messages.upsert', async({messages})=>{
    const m = messages[0];
    if(!m.message || m.key.fromMe) return;
    const from = m.key.remoteJid;
    const isGroup = from.endsWith('@g.us');
    const sender = m.key.participant || from;
    const text = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || m.message.videoMessage?.caption || "";
    const quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage;

    if(chut.includes(sender) && isGroup){ try{ await sock.sendMessage(from,{delete: m.key}); }catch{} return; }
    if(isGroup && antilinkGroups.includes(from) &&!isAmis(sender)){
      if(/(https?:\/\/|www\.|chat\.whatsapp\.com|wa\.me|\.com|\.net|\.link|t\.me)/i.test(text)){
        try{ await sock.sendMessage(from,{delete: m.key}); await sock.sendMessage(from,{text:`LIEN DETRUIT\n@${sender.split('@')[0]} pas de lien ici.`, mentions:[sender]}); }catch{} return;
      }
    }

    if(!text.startsWith(PREFIX)) return;
    const args = text.slice(1).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    const mentioned = m.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const target = mentioned[0] || null;
    const q = args.join(' ');

    if(!isAmis(sender)){ await sock.sendMessage(from, {text: "Seul Black Goku peut utiliser ce pouvoir"}); return; }
    if(!botOn &&!isOwner(sender) && cmd!=='bot'){ return; }
    if(target && isOwner(target)){
      await sock.sendMessage(from, {text: "Tu ne peut pas vaincre Black Goku", mentions:[sender]});
      if(isGroup){ try{ await sock.groupParticipantsUpdate(from, [sender], "remove"); }catch{} }
      return;
    }
    if(target && isSaved(target) &&!isOwner(sender)){
      if(['ban','kick','chut','blockadmin','demote'].includes(cmd)){
        await sock.sendMessage(from, {text: `Impossible. @${target.split('@')[0]} est sous ma protection. Tu subiras ton sort.`, mentions:[target, sender]});
        if(isGroup){ try{ await sock.groupParticipantsUpdate(from, [sender], "remove"); }catch{} }
        return;
      }
    }
    if(blockedAdmin.includes(sender) &&!isOwner(sender)){ await sock.sendMessage(from,{text:"Ton pouvoir d'admin est scelle. Tu ne peux plus utiliser de commandes."}); return; }

    try{
      switch(cmd){
        case 'black': case 'menu': case 'help': case 'info': case 'config':
          await sock.sendMessage(from, {text: `
╔══════════════════════════╗
║ BLACK GOKU V4 - 1000% ║
║ PREFIX : ₩ ║
║ OWNER : 555182215198 ║
╚══════════════════════════╝

┏━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ GESTION GROUPE
┣━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ ₩ban / ₩kick [@user]
┃ ₩add [numero]
┃ ₩promote / ₩demote [@user]
┃ ₩admin - liste admins
┃ ₩groupinfo - info groupe
┃ ₩grouplink - lien groupe
┃ ₩revoke - reset lien
┗━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ MODERATION ULTIME
┣━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ ₩mute / ₩unmute
┃ ₩chut / ₩unchut [@user]
┃ ₩tagall [texte]
┃ ₩hidetag [texte]
┃ ₩antilink on / off
┃ ₩welcome on / off
┃ ₩godmode - tout active
┗━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ PROTECTION 1000%
┣━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ ₩save / ₩unsave [@user]
┃ ₩blockadmin / ₩unblockadmin
┃ ₩pro [@user] - intouchable
┃ ₩prolist - liste PRO
┗━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ SECRET & FUN
┣━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ ₩vq - voir vue unique
┃ ₩sticker - image en sticker
┃ ₩rdm - image aleatoire
┃ ₩ghost - vu sans vu bleu
┃ ₩del - supprime message bot
┗━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ CONFIG
┣━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ ₩ping - bot en vie?
┃ ₩mode - etat du bot
┃ ₩bot on / off (owner)
┃ ₩amis / ₩noami [@user]
┃ ₩amislist - liste amis
┗━━━━━━━━━━━━━━━━━━━━━━━━┛

BLACK GOKU - LE ROI DU NEANT - 1000%
`});
          break;

        // AMIS
        case 'amis': if(isGroup){ if(!target) return await sock.sendMessage(from,{text:`${PREFIX}amis @user`}); if(!amis.includes(target)){ amis.push(target); save('./data/amis.json', amis); } await sock.sendMessage(from,{text:`Pouvoir accorde a @${target.split('@')[0]}`, mentions:[target]}); } else { if(!amis.includes(from)){ amis.push(from); save('./data/amis.json', amis); } await sock.sendMessage(from,{text:"Je t'accorde une part de mon pouvoir."}); } break;
        case 'noami': if(isGroup){ if(!target) return; amis=amis.filter(x=>x!==target); save('./data/amis.json', amis); await sock.sendMessage(from,{text:`Pouvoir retire a @${target.split('@')[0]}`, mentions:[target]}); } else { amis=amis.filter(x=>x!==from); save('./data/amis.json', amis); await sock.sendMessage(from,{text:"Pouvoir retire."}); } break;
        case 'amislist': await sock.sendMessage(from,{text:`AMIS (${amis.length}):\n`+amis.map(a=>`@${a.split('@')[0]}`).join('\n'), mentions:amis}); break;
        case 'prolist': await sock.sendMessage(from,{text:`PRO (${proUsers.length}):\n`+proUsers.map(a=>`@${a.split('@')[0]}`).join('\n'), mentions:proUsers}); break;

        // GROUPE
        case 'ban': case 'kick': if(!isGroup||!target) return; await sock.groupParticipantsUpdate(from, [target], "remove"); await sock.sendMessage(from,{text:`Elimine. @${target.split('@')[0]} n'est plus.`, mentions:[target]}); break;
        case 'add': if(!isGroup||!q) return; let num=q.replace(/[^0-9]/g,'')+"@s.whatsapp.net"; await sock.groupParticipantsUpdate(from, [num], "add"); await sock.sendMessage(from,{text:`Ajoute @${num.split('@')[0]}`, mentions:[num]}); break;
        case 'promote': if(!isGroup||!target) return; await sock.groupParticipantsUpdate(from, [target], "promote"); await sock.sendMessage(from,{text:`Promu @${target.split('@')[0]}`, mentions:[target]}); break;
        case 'demote': if(!isGroup||!target) return; await sock.groupParticipantsUpdate(from, [target], "demote"); await sock.sendMessage(from,{text:`Retrograde @${target.split('@')[0]}`, mentions:[target]}); break;
        case 'admin': if(!isGroup) return; let md=await sock.groupMetadata(from); let admins=md.participants.filter(p=>p.admin).map(p=>`@${p.id.split('@')[0]}`).join('\n'); await sock.sendMessage(from,{text:`ADMINS:\n${admins}`, mentions:md.participants.filter(p=>p.admin).map(p=>p.id)}); break;
        case 'groupinfo': if(!isGroup) return; let g=await sock.groupMetadata(from); await sock.sendMessage(from,{text:`NOM: ${g.subject}\nMEMBRES: ${g.participants.length}\nCREE: ${new Date(g.creation*1000).toLocaleDateString()}`}); break;
        case 'grouplink': if(!isGroup) return; let code = await sock.groupInviteCode(from); await sock.sendMessage(from,{text:`https://chat.whatsapp.com/${code}`}); break;
        case 'revoke': if(!isGroup) return; await sock.groupRevokeInvite(from); await sock.sendMessage(from,{text:"Lien revoque et regenere."}); break;

        // MODERATION
        case 'mute': if(!isGroup) return; await sock.groupSettingUpdate(from, 'announcement'); await sock.sendMessage(from,{text:"Groupe ferme - Silence total."}); break;
        case 'unmute': if(!isGroup) return; await sock.groupSettingUpdate(from, 'not_announcement'); await sock.sendMessage(from,{text:"Groupe ouvert."}); break;
        case 'chut': if(!target) return; if(!chut.includes(target)){ chut.push(target); save('./data/chut.json', chut); } await sock.sendMessage(from,{text:`@${target.split('@')[0]} est condamne au silence.`, mentions:[target]}); break;
        case 'unchut': if(!target) return; chut=chut.filter(x=>x!==target); save('./data/chut.json', chut); await sock.sendMessage(from,{text:`@${target.split('@')[0]} peut reparler.`, mentions:[target]}); break;
        case 'antilink': if(!isGroup) return; if(q==='on'){ if(!antilinkGroups.includes(from)){ antilinkGroups.push(from); save('./data/antilink.json', antilinkGroups); } await sock.sendMessage(from,{text:"Antilink ACTIVE - Tous les liens seront detruits."}); } if(q==='off'){ antilinkGroups=antilinkGroups.filter(x=>x!==from); save('./data/antilink.json', antilinkGroups); await sock.sendMessage(from,{text:"Antilink OFF"}); } break;
        case 'welcome': if(!isGroup) return; if(q==='on'){ if(!welcomeGroups.includes(from)){ welcomeGroups.push(from); save('./data/welcome.json', welcomeGroups); } await sock.sendMessage(from,{text:"Welcome ON"}); } if(q==='off'){ welcomeGroups=welcomeGroups.filter(x=>x!==from); save('./data/welcome.json', welcomeGroups); await sock.sendMessage(from,{text:"Welcome OFF"}); } break;
        case 'tagall': if(!isGroup) return; let parts=(await sock.groupMetadata(from)).participants.map(p=>p.id); await sock.sendMessage(from,{text:`${q||"REVEILLEZ-VOUS"}\n\n`+parts.map(p=>`@${p.split('@')[0]}`).join(' '), mentions:parts}); break;
        case 'hidetag': if(!isGroup) return; let all=(await sock.groupMetadata(from)).participants.map(p=>p.id); await sock.sendMessage(from,{text:q||"Black Goku", mentions:all}); break;
        case 'godmode': if(!isGroup) return; if(!antilinkGroups.includes(from)){ antilinkGroups.push(from); save('./data/antilink.json', antilinkGroups); } if(!welcomeGroups.includes(from)){ welcomeGroups.push(from); save('./data/welcome.json', welcomeGroups); } await sock.groupSettingUpdate(from, 'announcement'); await sock.sendMessage(from,{text:"GODMODE ACTIVE:\n- Mute ON\n- Antilink ON\n- Welcome ON\n- Protection MAX"}); break;

        // PROTECTION
        case 'save': if(target){ if(!saved.includes(target)){ saved.push(target); save('./data/saved.json', saved); } await sock.sendMessage(from,{text:`Protege @${target.split('@')[0]}`, mentions:[target]}); } break;
        case 'unsave': if(target){ saved=saved.filter(x=>x!==target); save('./data/saved.json', saved); await sock.sendMessage(from,{text:`Protection retiree @${target.split('@')[0]}`, mentions:[target]}); } break;
        case 'pro': if(!target) return; if(!proUsers.includes(target)){ proUsers.push(target); save('./data/pro.json', proUsers); } await sock.sendMessage(from,{text:`@${target.split('@')[0]} est PRO - INTOUCHABLE`, mentions:[target]}); break;
        case 'unpro': if(!target) return; proUsers=proUsers.filter(x=>x!==target); save('./data/pro.json', proUsers); await sock.sendMessage(from,{text:`PRO retire @${target.split('@')[0]}`, mentions:[target]}); break;
        case 'blockadmin': if(!target) return; if(!blockedAdmin.includes(target)){ blockedAdmin.push(target); save('./data/blocked.json', blockedAdmin); } await sock.sendMessage(from,{text:`Admin bloque @${target.split('@')[0]}`, mentions:[target]}); break;
        case 'unblockadmin': if(!target) return; blockedAdmin=blockedAdmin.filter(x=>x!==target); save('./data/blocked.json', blockedAdmin); await sock.sendMessage(from,{text:`Admin debloque @${target.split('@')[0]}`, mentions:[target]}); break;

        // FUN
        case 'sticker': if(m.message.imageMessage||quoted?.imageMessage){ let buf=await downloadMediaMessage(m, 'buffer', {}, {logger:P({level:'silent'}), reuploadRequest:sock.updateMediaMessage}); await sock.sendMessage(from,{sticker:buf}); } else await sock.sendMessage(from,{text:"Reponds a une image avec ₩sticker"}); break;
        case 'vq': if(quoted?.viewOnceMessage||quoted?.viewOnceMessageV2||quoted?.viewOnceMessageV2Extension){ let vqMsg=quoted.viewOnceMessage||quoted.viewOnceMessageV2||quoted.viewOnceMessageV2Extension; let buf=await downloadMediaMessage({message:vqMsg}, 'buffer', {}, {logger:P({level:'silent'}), reuploadRequest:sock.updateMediaMessage}); if(vqMsg.message?.imageMessage) await sock.sendMessage(from,{image:buf, caption:"Vue unique capturee"}); if(vqMsg.message?.videoMessage) await sock.sendMessage(from,{video:buf, caption:"Vue unique capturee"}); } else await sock.sendMessage(from,{text:"Reponds a une vue unique avec ₩vq"}); break;
        case 'rdm': try{ let r=await fetch("https://api.waifu.pics/sfw/waifu"); let d=await r.json(); await sock.sendMessage(from,{image:{url:d.url}, caption:"Ame capturee"}); }catch{ await sock.sendMessage(from,{text:"Neant vide"}); } break;
        case 'del': if(m.message.extendedTextMessage?.contextInfo?.stanzaId){ await sock.sendMessage(from,{delete:{remoteJid:from, fromMe:true, id:m.message.extendedTextMessage.contextInfo.stanzaId, participant:m.message.extendedTextMessage.contextInfo.participant}}); } break;
        case 'ping': await sock.sendMessage(from,{text:"BLACK GOKU V4 1000% - Eveillé\nLatence: 0ms - Dans les tenebres"}); break;
        case 'mode': await sock.sendMessage(from,{text:`ETAT:\nBOT: ${botOn?"ON":"OFF"}\nANTILINK: ${antilinkGroups.includes(from)?"ON":"OFF"}\nWELCOME: ${welcomeGroups.includes(from)?"ON":"OFF"}\nAMIS: ${amis.length}\nPRO: ${proUsers.length}`}); break;
        case 'bot': if(!isOwner(sender)) return; if(q==='on'){ botOn=true; await sock.sendMessage(from,{text:"Black Goku eveille 1000%"}); } if(q==='off'){ botOn=false; await sock.sendMessage(from,{text:"Black Goku s'endort..."}); } break;
      }
    }catch(e){ console.log("ERREUR:",e); }
  });
}
startBot();
