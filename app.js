const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const qrcode = require('qrcode-terminal');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;
let qrCodeImage = null;

// Configurazione proxy
const PROXY_HOST = 's6.airproxy.io';
const PROXY_PORT = '20706';
const PROXY_USER = 'comunicapervincere';
const PROXY_PASS = 'comunicapervincere';

// Configura il client WhatsApp
const client = new Client({
    authStrategy: new LocalAuth({ clientId: "whatsapp-24h" })
  });
  
// Evento: Mostra QR Code in console
client.on('qr', async (qr) => {
    console.log('\n================== SCANSIONA IL QR CODE ==================');
    console.log(`🔗 Apri questo link per il QR Code:`);
    console.log(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`);
    console.log('=========================================================\n');
});


// Evento: Client pronto
client.on('ready', async () => {
    console.log('✅ WhatsApp client è pronto e in ascolto!');

    try {
        // Verifica IP Proxy
        const browser = await client.pupBrowser;
        const page = await browser.newPage();
        await page.authenticate({ username: PROXY_USER, password: PROXY_PASS });
        await page.goto('https://api.ipify.org?format=json', { waitUntil: 'networkidle2' });
        const ipUsed = await page.evaluate(() => document.body.innerText);
        console.log('🌍 IP usato dal proxy:', ipUsed);
        await page.close();
    } catch (error) {
        console.error('❌ Errore nel recupero dell\'IP:', error);
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

        // Invia alla webhook di Make.com
        await axios.post('https://hook.eu1.make.com/r4ydnwo7htapbbl8ihzesevwyx5pt782', messageData);
        console.log('📩 Messaggio inviato alla webhook Make.com con successo!');
    } catch (error) {
        console.error('❌ Errore nella gestione del messaggio in arrivo:', error);
    }
});

// Evento: Messaggi in uscita
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

            // Invia alla webhook di Make.com
            await axios.post('https://hook.eu1.make.com/r4ydnwo7htapbbl8ihzesevwyx5pt782', messageData);
            console.log('📤 Messaggio in uscita inviato alla webhook Make.com con successo!');
        } catch (error) {
            console.error('❌ Errore nella gestione del messaggio in uscita:', error);
        }
    }
});

// Gestione errori globali
process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️ Unhandled Rejection:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
    console.error('🚨 Uncaught Exception:', err);
});

// Avvia il client WhatsApp
client.initialize();

// Avvia un server Express per debug (facoltativo)
app.listen(port, () => {
    console.log(`🌍 Server Express in esecuzione su http://localhost:${port}`);
});
