const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const qrcode = require('qrcode');
const axios = require('axios'); // Importa axios

// Configurazione Express (opzionale, per visualizzare il QR code in una pagina web)
const app = express();
const port = process.env.PORT || 3000;
let qrCodeImage = null;

// Configura il client con LocalAuth per sessioni persistenti e utilizzo del proxy
const client = new Client({
  authStrategy: new LocalAuth({ clientId: "whatsapp-24h" }),
  puppeteer: {
    headless: true, // modalità headless per ambiente server
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--proxy-server=http://s6.airproxy.io:20706'
    ]
  }
});

// Evento: QR Code (solo la prima volta o se la sessione scade)
client.on('qr', async (qr) => {
  console.log('QR Code generato, scansiona con WhatsApp:');
  const qrTerminal = await qrcode.toString(qr, { type: 'terminal' });
  console.log(qrTerminal);
  
  // Genera anche una versione base64 per la pagina web
  qrCodeImage = await qrcode.toDataURL(qr);
});

// Evento: Client pronto
client.on('ready', async () => {
  console.log('✅ WhatsApp client è pronto e in ascolto!');

  // Recupera il browser usato da whatsapp-web.js
  const browser = client.pupBrowser;
  
  // Autentica tutte le pagine attuali
  const pages = await browser.pages();
  for (const page of pages) {
    await page.authenticate({
      username: 'comunicapervincere',
      password: 'comunicapervincere'
    });
  }
  
  // Ascolta la creazione di nuove pagine e autenticale
  browser.on('targetcreated', async (target) => {
    if (target.type() === 'page') {
      const newPage = await target.page();
      await newPage.authenticate({
        username: 'comunicapervincere',
        password: 'comunicapervincere'
      });
    }
  });
  
  // Verifica l'IP usato dal proxy: apre una nuova pagina, va su api.ipify.org e logga l'IP
  try {
    const testPage = await browser.newPage();
    await testPage.authenticate({
      username: 'comunicapervincere',
      password: 'comunicapervincere'
    });
    await testPage.goto('https://api.ipify.org?format=json', { waitUntil: 'networkidle2' });
    const ipUsed = await testPage.evaluate(() => document.body.innerText);
    console.log('IP usato dal proxy:', ipUsed);
    await testPage.close();
  } catch (error) {
    console.error('Errore nel recuperare l\'IP:', error);
  }
});

// Evento: Messaggi in arrivo
client.on('message', async (msg) => {
  try {
    const messageData = {
      id: msg.id._serialized,
      from: msg.from,
      body: msg.body,
      timestamp: msg.timestamp,
      type: msg.type,
      direction: msg.fromMe ? "sent" : "received"
    };
    console.log('--- Messaggio in arrivo ---');
    console.log(JSON.stringify(messageData, null, 2));

    // Invia i dati del messaggio alla webhook di Make.com
    await axios.post('https://hook.eu1.make.com/r4ydnwo7htapbbl8ihzesevwyx5pt782', messageData);
    console.log('Messaggio inviato alla webhook Make.com con successo!');
  } catch (error) {
    console.error('Errore nella gestione del messaggio in arrivo:', error);
  }
});

// Evento: Messaggi creati (inclusi quelli inviati dal tuo account)
client.on('message_create', async (msg) => {
  if (msg.fromMe) {
    try {
      const messageData = {
        id: msg.id._serialized,
        to: msg.to,
        body: msg.body,
        timestamp: msg.timestamp,
        type: msg.type,
        direction: "sent"
      };
      console.log('--- Messaggio in uscita ---');
      console.log(JSON.stringify(messageData, null, 2));

      // Invia i dati del messaggio inviato alla webhook di Make.com
      await axios.post('https://hook.eu1.make.com/r4ydnwo7htapbbl8ihzesevwyx5pt782', messageData);
      console.log('Messaggio in uscita inviato alla webhook Make.com con successo!');
    } catch (error) {
      console.error('Errore nella gestione del messaggio in uscita:', error);
    }
  }
});

// Gestione errori globali per evitare crash inattesi
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

// (Opzionale) Avvia un semplice server Express per visualizzare il QR Code in caso di prima autenticazione
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>WhatsApp Bot - QR Code</title>
        <style>
          body { text-align: center; font-family: Arial, sans-serif; }
          h1 { color: #25D366; }
        </style>
        <meta http-equiv="refresh" content="5">
      </head>
      <body>
        <h1>Scansiona il QR Code</h1>
        ${qrCodeImage ? `<img src="${qrCodeImage}" alt="QR Code" />` : '<p>In attesa del QR...</p>'}
      </body>
    </html>
  `);
});

app.listen(port, () => {
  console.log(`🌐 Server Express in esecuzione su http://localhost:${port}`);
});

// Avvia il client WhatsApp
client.initialize();
