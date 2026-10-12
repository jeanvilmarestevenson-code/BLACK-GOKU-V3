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
const save = (f, d) => fs.writeFileSync(f, JSON.stringify(d, null, 2));

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
const isPro = (j)=> proUsers.includes(j) || isOwner(j);

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
      if(an.action==='add'){ for(let p of an.participants){ await sock.sendMessage(an.id,{text:`Bienvenue dans les ténèbres @${p.split('@')[0]}... Je t'observe.`, mentions:[p]}); } }
      if(an.action==='remove'){ for(let p of an.participants){ await sock.sendMessage(an.id,{text:`@${p.split('@')[0]} a quitté le néant. Faible.`, mentions:[p]}); } }
    }catch{}
  });

sock.ev.on('messages.upsert', async({messages})=>{
    const m = messages[0];
    if(!m.message) return;
    const from = m.key.remoteJid;
    const isGroup = from.endsWith('@g.us');
    let sender = m.key.participant || from;
    const isFromMe = m.key.fromMe;
    if(isFromMe) sender = OWNER_JID; // toi = owner

    const text = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || m.message.videoMessage?.caption || "";
    const quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage;

    if(chut.includes(sender) && isGroup){ try{ await sock.sendMessage(from,{delete: m.key}); }catch{} return; }
    //... garde ton code antilink ici...

    if(!text.startsWith(PREFIX)) return;
    //... reste de ton code avec sender...

    // CHUT - suppression auto
    if(chut.includes(sender) && isGroup){ try{ await sock.sendMessage(from,{delete: m.key}); }catch{} return; }

    // ANTILINK
    if(isGroup && antilinkGroups.includes(from) &&!isAmis(sender)){
      if(/(https?:\/\/|www\.|chat\.whatsapp\.com|wa\.me|\.com|\.net|\.link|t\.me)/i.test(text)){
        try{ await sock.sendMessage(from,{delete: m.key}); await sock.sendMessage(from,{text:`LIEN DÉTRUIT\n@${sender.split('@')[0]} pas de lien ici. Les ténèbres n'autorisent pas cela.`, mentions:[sender]}); }catch{} return;
      }
    }

    if(!text.startsWith(PREFIX)) return;
    const args = text.slice(1).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    const mentioned = m.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const target = mentioned[0] || null;
    const q = args.join(' ');

    // AUTORISATION - SEUL BLACK GOKU + AMIS
    if(!isAmis(sender)){
      await sock.sendMessage(from, {text: "Seul Black Goku peut utiliser ce pouvoir"});
      return;
    }
    if(!botOn &&!isOwner(sender) && cmd!=='bot'){ return; }
    if(blockedAdmin.includes(sender) &&!isOwner(sender)){
      await sock.sendMessage(from,{text:"Ton pouvoir d'admin est scellé. Tu es banni de mes ordres."});
      return;
    }

    // PROTECTION ANTI-OWNER - RETOUR DE FLAMME
    if(target && isOwner(target)){
      await sock.sendMessage(from, {text: "Tu ne peut pas vaincre Black Goku", mentions:[sender]});
      if(isGroup){
        try{
          await sock.groupParticipantsUpdate(from, [sender], "remove");
          await sock.sendMessage(from,{text:`@${sender.split('@')[0]} a osé défier le roi. Il a été effacé.`, mentions:[sender]});
        }catch{}
      }
      return;
    }

    // PROTECTION PRO / SAVED - RETOUR DE FLAMME
    if(target && isPro(target) &&!isOwner(sender)){
      if(['ban','kick','chut','blockadmin','demote','save','unsave'].includes(cmd)){
        await sock.sendMessage(from, {text: `Impossible. @${target.split('@')[0]} est sous ma protection éternelle. Tu subiras ton sort.`, mentions:[target, sender]});
        if(isGroup){
          try{
            await sock.groupParticipantsUpdate(from, [sender], "remove");
            await sock.sendMessage(from,{text:`L'attaque contre @${target.split('@')[0]} s'est retournée contre @${sender.split('@')[0]}.`, mentions:[target, sender]});
          }catch{}
        }
        return;
      }
    }
    if(target && isSaved(target) &&!isOwner(sender) &&!isPro(target)){
      if(['ban','kick','chut','blockadmin','demote'].includes(cmd)){
        await sock.sendMessage(from, {text: `Impossible. @${target.split('@')[0]} est sous ma protection.`, mentions:[target, sender]});
        return;
      }
    }

    try{
      switch(cmd){
        case 'black': case 'menu': case 'help': case 'info': case 'config':
          await sock.sendMessage(from, {text: `
Black Goku
PREFIX: ₩
╭────────────────
│ 👥 GESTION GROUPE
│ • ₩ban / ₩kick [@user]
│ • ₩add [numero]
│ • ₩promote / ₩demote [@user]
│ • ₩admin - liste admins
│ • ₩groupinfo - info groupe
│ • ₩grouplink - lien groupe
│ • ₩revoke - reset lien
│
│ 🚫 MODÉRATION
│ • ₩mute / ₩unmute
│ • ₩chut / ₩unchut [@user]
│ • ₩tagall [texte]
│ • ₩hidetag [texte]
│ • ₩antilink on/off
│ • ₩welcome on/off
│ • ₩godmode - tout active
│
│ 🛡️ PROTECTION
│ • ₩save / ₩unsave [@user ou en PV]
│ • ₩blockadmin / ₩unblockadmin [@user]
│ • ₩pro / ₩unpro [@user] - intouchable
│ • ₩prolist - liste PRO
│
│ 👁️ SECRET & FUN
│ • ₩vq - voir vue unique
│ • ₩sticker - image en sticker
│ • ₩rdm - boy & waifu anime
│ • ₩del - supprime msg bot
│
│ ⚙️ STYLE & CONFIG
│ • ₩ping - bot en vie?
│ • ₩mode - état du bot
│ • ₩amis / ₩noami [@user ou PV]
│ • ₩amislist - liste amis
│
│ 🔒 OWNER ONLY
│ • ₩bot on/off
╰────────────────
BLACK GOKU - LE ROI DU NEANT - 1000%
`});
          break;

        // AMIS - PV ET GROUPE
        case 'amis':
          if(isGroup){
            if(!target) return await sock.sendMessage(from,{text:`Utilise: ${PREFIX}amis @user`});
            if(!amis.includes(target)){ amis.push(target); save('./data/amis.json', amis); }
            await sock.sendMessage(from,{text:`Pouvoir accordé à @${target.split('@')[0]}. Il peut désormais marcher dans mes ténèbres.`, mentions:[target]});
          } else {
            // EN PV - le from = la personne à qui tu parles
            // Si c'est toi qui écris ₩amis en PV, from = contact
            let toAdd = target || from;
            if(!amis.includes(toAdd)){ amis.push(toAdd); save('./data/amis.json', amis); }
            await sock.sendMessage(from,{text:"Je t'accorde une part de mon pouvoir. Utilise-le avec sagesse."});
          }
          break;
        case 'noami':
          if(isGroup){
            if(!target) return;
            amis=amis.filter(x=>x!==target); save('./data/amis.json', amis);
            await sock.sendMessage(from,{text:`Pouvoir retiré à @${target.split('@')[0]}. Retourne dans l'ombre.`, mentions:[target]});
          } else {
            let toRemove = target || from;
            amis=amis.filter(x=>x!==toRemove); save('./data/amis.json', amis);
            await sock.sendMessage(from,{text:"Pouvoir retiré. Tu n'es plus digne."});
          }
          break;
        case 'amislist': await sock.sendMessage(from,{text:`AMIS (${amis.length}):\n`+amis.map(a=>`@${a.split('@')[0]}`).join('\n'), mentions:amis}); break;
        case 'prolist': await sock.sendMessage(from,{text:`PRO (${proUsers.length}):\n`+proUsers.map(a=>`@${a.split('@')[0]}`).join('\n'), mentions:proUsers}); break;

        // GROUPE
        case 'ban': case 'kick': if(!isGroup||!target) return; await sock.groupParticipantsUpdate(from, [target], "remove"); await sock.sendMessage(from,{text:`Éliminé. @${target.split('@')[0]} n'est plus. Les ténèbres l'ont englouti.`, mentions:[target]}); break;
        case 'add': if(!isGroup||!q) return; let num=q.replace(/[^0-9]/g,'')+"@s.whatsapp.net"; await sock.groupParticipantsUpdate(from, [num], "add"); await sock.sendMessage(from,{text:`Ajouté @${num.split('@')[0]}. Qu'il serve bien.`, mentions:[num]}); break;
        case 'promote': if(!isGroup||!target) return; await sock.groupParticipantsUpdate(from, [target], "promote"); await sock.sendMessage(from,{text:`Promu @${target.split('@')[0]}. Ne me déçois pas.`, mentions:[target]}); break;
        case 'demote': if(!isGroup||!target) return; await sock.groupParticipantsUpdate(from, [target], "demote"); await sock.sendMessage(from,{text:`Rétrogradé @${target.split('@')[0]}. Tu as failli.`, mentions:[target]}); break;
        case 'admin': if(!isGroup) return; let md=await sock.groupMetadata(from); let admins=md.participants.filter(p=>p.admin).map(p=>`@${p.id.split('@')[0]}`).join('\n'); await sock.sendMessage(from,{text:`ADMINS:\n${admins}`, mentions:md.participants.filter(p=>p.admin).map(p=>p.id)}); break;
        case 'groupinfo': if(!isGroup) return; let g=await sock.groupMetadata(from); await sock.sendMessage(from,{text:`NOM: ${g.subject}\nMEMBRES: ${g.participants.length}\nCRÉÉ: ${new Date(g.creation*1000).toLocaleDateString()}`}); break;
        case 'grouplink': if(!isGroup) return; let code = await sock.groupInviteCode(from); await sock.sendMessage(from,{text:`https://chat.whatsapp.com/${code}`}); break;
        case 'revoke': if(!isGroup) return; await sock.groupRevokeInvite(from); await sock.sendMessage(from,{text:"Lien révoqué. Le portail a changé."}); break;

        // MODERATION
        case 'mute': if(!isGroup) return; await sock.groupSettingUpdate(from, 'announcement'); await sock.sendMessage(from,{text:"Groupe fermé. Silence total. Seuls les dignes parlent."}); break;
        case 'unmute': if(!isGroup) return; await sock.groupSettingUpdate(from, 'not_announcement'); await sock.sendMessage(from,{text:"Groupe ouvert. Parlez, si vous l'osez."}); break;
        case 'chut':
          if(!target &&!isGroup) return;
          let chutTarget = target || (isGroup? null : from);
          if(!chutTarget) return await sock.sendMessage(from,{text:`${PREFIX}chut @user`});
          if(!chut.includes(chutTarget)){ chut.push(chutTarget); save('./data/chut.json', chut); }
          await sock.sendMessage(from,{text:`@${chutTarget.split('@')[0]} est condamné au silence. Ses mots seront effacés.`, mentions:[chutTarget]});
          break;
        case 'unchut':
          let unchutTarget = target || (isGroup? null : from);
          if(!unchutTarget) return await sock.sendMessage(from,{text:`${PREFIX}unchut @user`});
          chut=chut.filter(x=>x!==unchutTarget); save('./data/chut.json', chut);
          await sock.sendMessage(from,{text:`@${unchutTarget.split('@')[0]} peut reparler. Pour l'instant.`, mentions:[unchutTarget]});
          break;
        case 'antilink': if(!isGroup) return; if(q==='on'){ if(!antilinkGroups.includes(from)){ antilinkGroups.push(from); save('./data/antilink.json', antilinkGroups); } await sock.sendMessage(from,{text:"Antilink ACTIVE. Tous les liens seront détruits."}); } if(q==='off'){ antilinkGroups=antilinkGroups.filter(x=>x!==from); save('./data/antilink.json', antilinkGroups); await sock.sendMessage(from,{text:"Antilink OFF"}); } break;
        case 'welcome': if(!isGroup) return; if(q==='on'){ if(!welcomeGroups.includes(from)){ welcomeGroups.push(from); save('./data/welcome.json', welcomeGroups); } await sock.sendMessage(from,{text:"Welcome ON. J'observerai les arrivants."}); } if(q==='off'){ welcomeGroups=welcomeGroups.filter(x=>x!==from); save('./data/welcome.json', welcomeGroups); await sock.sendMessage(from,{text:"Welcome OFF"}); } break;
        case 'tagall': if(!isGroup) return; let parts=(await sock.groupMetadata(from)).participants.map(p=>p.id); await sock.sendMessage(from,{text:`${q||"RÉVEILLEZ-VOUS"}\n\n`+parts.map(p=>`@${p.split('@')[0]}`).join(' '), mentions:parts}); break;
        case 'hidetag': if(!isGroup) return; let all=(await sock.groupMetadata(from)).participants.map(p=>p.id); await sock.sendMessage(from,{text:q||"Black Goku", mentions:all}); break;
        case 'godmode': if(!isGroup) return; if(!antilinkGroups.includes(from)){ antilinkGroups.push(from); save('./data/antilink.json', antilinkGroups); } if(!welcomeGroups.includes(from)){ welcomeGroups.push(from); save('./data/welcome.json', welcomeGroups); } await sock.groupSettingUpdate(from, 'announcement'); await sock.sendMessage(from,{text:"GODMODE ACTIVE:\n- Mute ON\n- Antilink ON\n- Welcome ON\n- Protection MAX\nLe néant règne ici."}); break;

        // PROTECTION
        case 'save':
          if(target){
            if(!saved.includes(target)){ saved.push(target); save('./data/saved.json', saved); }
            await sock.sendMessage(from,{text:`Protégé @${target.split('@')[0]}. Il est sous mon aile sombre.`, mentions:[target]});
          } else {
            if(!isGroup){
              if(!saved.includes(from)){ saved.push(from); save('./data/saved.json', saved); }
              await sock.sendMessage(from,{text:"Tu es protégé dans tous les groupes. Personne ne t'atteindra."});
            } else return await sock.sendMessage(from,{text:`${PREFIX}save @user`});
          }
          break;
        case 'unsave':
          if(target){
            saved=saved.filter(x=>x!==target); save('./data/saved.json', saved);
            await sock.sendMessage(from,{text:`Protection retirée @${target.split('@')[0]}. Il est vulnérable.`, mentions:[target]});
          } else {
            if(!isGroup){
              saved=saved.filter(x=>x!==from); save('./data/saved.json', saved);
              await sock.sendMessage(from,{text:"Protection retirée. Tu es seul."});
            } else return await sock.sendMessage(from,{text:`${PREFIX}unsave @user`});
          }
          break;
        case 'pro': if(!target) return await sock.sendMessage(from,{text:`${PREFIX}pro @user`}); if(!proUsers.includes(target)){ proUsers.push(target); save('./data/pro.json', proUsers); } await sock.sendMessage(from,{text:`@${target.split('@')[0]} est PRO - INTOUCHABLE. Quiconque l'attaquera périra.`, mentions:[target]}); break;
        case 'unpro': if(!target) return; proUsers=proUsers.filter(x=>x!==target); save('./data/pro.json', proUsers); await sock.sendMessage(from,{text:`PRO retiré @${target.split('@')[0]}. Il n'est plus intouchable.`, mentions:[target]}); break;
        case 'blockadmin': if(!target) return await sock.sendMessage(from,{text:`${PREFIX}blockadmin @user`}); if(!blockedAdmin.includes(target)){ blockedAdmin.push(target); save('./data/blocked.json', blockedAdmin); } await sock.sendMessage(from,{text:`Admin bloqué @${target.split('@')[0]}. Son pouvoir est scellé.`, mentions:[target]}); break;
        case 'unblockadmin': if(!target) return; blockedAdmin=blockedAdmin.filter(x=>x!==target); save('./data/blocked.json', blockedAdmin); await sock.sendMessage(from,{text:`Admin débloqué @${target.split('@')[0]}.`, mentions:[target]}); break;

        // FUN
        case 'sticker': if(m.message.imageMessage||quoted?.imageMessage){ let buf=await downloadMediaMessage(m, 'buffer', {}, {logger:P({level:'silent'}), reuploadRequest:sock.updateMediaMessage}); await sock.sendMessage(from,{sticker:buf}); } else await sock.sendMessage(from,{text:"Réponds à une image avec ₩sticker. Je la transformerai."}); break;
        case 'vq': if(quoted?.viewOnceMessage||quoted?.viewOnceMessageV2||quoted?.viewOnceMessageV2Extension){ let vqMsg=quoted.viewOnceMessage||quoted.viewOnceMessageV2||quoted.viewOnceMessageV2Extension; let buf=await downloadMediaMessage({message:vqMsg}, 'buffer', {}, {logger:P({level:'silent'}), reuploadRequest:sock.updateMediaMessage}); if(vqMsg.message?.imageMessage) await sock.sendMessage(from,{image:buf, caption:"Vue unique capturée. Rien ne m'échappe."}); if(vqMsg.message?.videoMessage) await sock.sendMessage(from,{video:buf, caption:"Vue unique capturée."}); } else await sock.sendMessage(from,{text:"Réponds à une vue unique avec ₩vq"}); break;
        case 'rdm':
          try{
            let isBoy = Math.random() > 0.5;
            let url = isBoy? "https://api.waifu.pics/sfw/shinobu" : "https://api.waifu.pics/sfw/waifu";
            // pour boy on utilise une autre API
            if(isBoy){
              let r = await fetch("https://api.waifu.pics/sfw/waifu");
              let d = await r.json();
              await sock.sendMessage(from,{image:{url:d.url}, caption:"Âme capturée - Waifu"});
            } else {
              let r2 = await fetch("https://api.waifu.pics/sfw/waifu");
              let d2 = await r2.json();
              await sock.sendMessage(from,{image:{url:d2.url}, caption:"Âme capturée - Anime Boy"});
            }
          }catch{
            try{
              let r=await fetch("https://api.waifu.pics/sfw/waifu"); let d=await r.json();
              await sock.sendMessage(from,{image:{url:d.url}, caption:"Âme du néant"});
            }catch{ await sock.sendMessage(from,{text:"Néant vide"}); }
          }
          break;
        case 'del': if(m.message.extendedTextMessage?.contextInfo?.stanzaId){ await sock.sendMessage(from,{delete:{remoteJid:from, fromMe:true, id:m.message.extendedTextMessage.contextInfo.stanzaId, participant:m.message.extendedTextMessage.contextInfo.participant}}); } break;
        case 'ping': await sock.sendMessage(from,{text:"BLACK GOKU V4 1000% - Éveillé\nLatence: 0ms - Dans les ténèbres"}); break;
        case 'mode': await sock.sendMessage(from,{text:`ÉTAT DU NÉANT:\nBOT: ${botOn?"ON":"OFF"}\nANTILINK: ${antilinkGroups.includes(from)?"ON":"OFF"}\nWELCOME: ${welcomeGroups.includes(from)?"ON":"OFF"}\nAMIS: ${amis.length}\nPRO: ${proUsers.length}\nSAVED: ${saved.length}`}); break;
        case 'bot': if(!isOwner(sender)) return; if(q==='on'){ botOn=true; await sock.sendMessage(from,{text:"Black Goku éveillé 1000%. Le néant s'ouvre."}); } if(q==='off'){ botOn=false; await sock.sendMessage(from,{text:"Black Goku s'endort..."}); } break;
      }
    }catch(e){ console.log("ERREUR:",e); }
  });
}
startBot();
