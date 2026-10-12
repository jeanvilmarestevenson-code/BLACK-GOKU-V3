const express = require('express');
const app = express();
let qrImage = null;
let status = "Demarrage du neant...";
app.get('/', (req,res)=>{
  if(qrImage){
    res.send(`<body style="background:#000;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:monospace"><h1 style="border:2px solid #fff;padding:10px">BLACK GOKU V4 - 1000%</h1><img src="${qrImage}" style="width:320px;height:320px;background:#fff;padding:10px;margin:20px"><p>WhatsApp > Appareils lies > Scanner</p><h2>${status}</h2><script>setTimeout(()=>location.reload(),15000)</script></body>`);
  } else {
    res.send(`<body style="background:#000;color:#0f0;display:flex;justify-content:center;align-items:center;height:100vh;font-family:monospace;flex-direction:column"><h1 style="font-size:35px">${status}</h1><script>setTimeout(()=>location.reload(),3000)</script></body>`);
  }
});
app.listen(3000, ()=>console.log("Web OK"));
module.exports = { setQR: (img, txt)=>{ if(img===null){ qrImage=null; status=txt||"BOT CONNECTE H24!"; return; } qrImage=img; status=txt||"SCANNE LE QR"; }, setStatus: (t)=>{ status=t; } };
