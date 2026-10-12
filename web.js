const express = require('express')
const app = express()
let qrCode = null
let statusText = "EN ATTENTE QR..."

function setQR(qr, text){
    const QRCode = require('qrcode')
    statusText = text
    if(qr){
        QRCode.toDataURL(qr, (err, url)=>{ if(!err) qrCode = url })
    } else { qrCode = null }
}
app.get('/', (req,res)=>{
    if(qrCode){
        res.send(`<html><body style="background:#000;color:#fff;text-align:center;font-family:monospace;padding-top:30px"><h1 style="color:#0f0">${statusText}</h1><img src="${qrCode}" style="width:330px;border:4px solid #0f0"><p>Scanne avec WhatsApp</p></body></html>`)
    } else {
        res.send(`<html><body style="background:#000;color:#0f0;text-align:center;font-family:monospace;padding-top:80px"><h1>${statusText}</h1><h2>BOT 1000% H24 ACTIF</h2><p>Refresh dans 5 sec</p></body></html>`)
    }
})
const PORT = process.env.PORT || 10000
app.listen(PORT, ()=> console.log("Web OK "+PORT))
module.exports = { setQR }
