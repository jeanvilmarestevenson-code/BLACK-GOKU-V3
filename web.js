const express = require('express');
const app = express();
let code = "Démarrage...";
app.get('/', (req,res)=>{
 res.send(`<body style="background:#000;color:#fff;font-family:monospace;display:flex;justify-content:center;align-items:center;height:100vh;flex-direction:column"><h1>BLACK-GOKU-V3</h1><h1 style="font-size:50px;background:#fff;color:#000;padding:15px;border-radius:10px;letter-spacing:8px">${code}</h1><p>WhatsApp > Appareils liés > Lier avec un code</p><script>setTimeout(()=>location.reload(),8000)</script></body>`);
});
app.listen(3000, ()=>console.log("Web OK"));
module.exports = { setCode: (c)=>{code=c; console.log("CODE:",c);} };
