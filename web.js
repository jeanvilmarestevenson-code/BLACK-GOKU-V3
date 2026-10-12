const express = require('express');
const app = express();
let qrImage = null;
let qrText = "Démarrage...";

app.get('/', (req, res) => {
  if (qrImage) {
    res.send(`
      <html><body style="background:#111;color:#fff;text-align:center;padding:20px;font-family:sans-serif">
      <h1>BLACK GOKU V4 - 1000%</h1>
      <h3>${qrText}</h3>
      <img src="${qrImage}" style="width:300px;border:5px solid #0f0"/>
      <p>Scanne avec WhatsApp > Appareils liés</p>
      </body></html>
    `);
  } else {
    res.send(`<h1>${qrText}</h1><p>BOT H24 ACTIF - 1000%</p>`);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('WEB OK PORT ' + PORT));

function setQR(image, text) {
  qrImage = image;
  qrText = text;
}

module.exports = { setQR };
