const express = require('express')
const app = express()
let qrCode = null
let statusText = "EN ATTENTE QR..."

function setQR(qr, text){
    const QRCode = require('qrcode')
    if(qr){
        QRCode.toDataURL(qr, (err, url)=>{
            qrCode = url
            statusText = text
        })
    } else {
        qrCode = null
        statusText = text
    }
}

app.get('/', (req,res)=>{
    if(qrCode){
        res.send(`<html><body style="background:#000;color:#fff;text-align:center;font-family:monospace"><h1>${statusText}</h1><img src="${qrCode}" style="width:300px"><p>Scanne avec WhatsApp</p></body></html>`)
    } else {
        res.send(`<html><body style="background:#000;color:#0f0;text-align:center;font-family:monospace"><h1>${statusText}</h1><h2>BOT 1000% H24 ACTIF</h2></body></html>`)
    }
})

app.listen(10000, ()=> console.log("Web OK port 10000"))
module.exports = { setQR }
