const http = require('http');
let lastQR = null, status = "En attente...";
function setQR(qr, s){ lastQR=qr; if(s) status=s; }
const server = http.createServer((req,res)=>{
res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'});
res.end(`<html><head><meta name="viewport" content="width=device-width"><style>body{background:#000;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:monospace} #qrcode{background:#fff;padding:15px;border-radius:10px} h1{color:#a00}</style><script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script></head><body><h1>BLACK GOKU V3</h1><p>${status}</p><div id="qrcode"></div><script>const qr=${JSON.stringify(lastQR)}; if(qr){ new QRCode(document.getElementById("qrcode"),{text:qr,width:280,height:280}) } else { document.getElementById("qrcode").innerHTML="<p>CONNECTE ✅</p>"} setTimeout(()=>location.reload(), 15000)</script></body></html>`);
});
server.listen(process.env.PORT||3000);
module.exports={setQR};
