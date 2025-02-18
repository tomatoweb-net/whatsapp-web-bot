const { Client, LocalAuth } = require('whatsapp-web.js');
const puppeteer = require('puppeteer');
const express = require('express');
const qrcode = require('qrcode');

const app = express();
const port = 3000;
let qrCodeImage = null;

const PROXY_IP = '51.68.175.56';
const PROXY_PORT = '1080';

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      `--proxy-server=socks5://${PROXY_IP}:${PROXY_PORT}`
    ],
  },
});

// Eventi WhatsApp Web
client.on('qr', async (qr) => {
  console.log('QR Code generato, scansiona con WhatsApp:');
  console.log(await qrcode.toString(qr, { type: 'terminal' }));
  // Genera l'immagine base64 per la tua pagina
  qrCodeImage = await qrcode.toDataURL(qr);
});

client.on('ready', async () => {
  console.log('✅ Bot WhatsApp pronto!');
  // Manda un test
  const numero = '393286340185'; // Tuo numero
  const chatId = `${numero}@c.us`;
  await client.sendMessage(chatId, 'Ciao, ti scrivo da un proxy SOCKS5 (se funziona)!');
});

client.on('auth_failure', (msg) => console.error('❌ Auth failure:', msg));
client.on('disconnected', (reason) => console.error('❌ Disconnesso:', reason));

// Pagina web per il QR Code
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>WhatsApp Bot - QR Code</title>
        <style> body{text-align:center;} </style>
        <meta http-equiv="refresh" content="5">
      </head>
      <body>
        <h1>Scansiona il QR Code</h1>
        ${qrCodeImage ? `<img src="${qrCodeImage}" />` : '<p>In attesa del QR...</p>'}
      </body>
    </html>
  `);
});

// Avvia il server
app.listen(port, () => console.log(`🌐 Server su http://localhost:${port}`));

// Avvia il client
client.initialize();
