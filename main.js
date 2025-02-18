const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const qrcode = require('qrcode');

const app = express();
const port = 3000;
let qrCodeImage = null; // Memorizza il QR Code

console.log('🚀 Avvio WhatsApp Web senza proxy...');

// 🔹 Crea il client WhatsApp senza proxy
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: false, // Apri il browser in modalità visibile
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
});

// 📌 DEBUG: Stampa informazioni di stato
client.on('loading_screen', (percent, message) => {
    console.log(`🔄 Caricamento: ${percent}% - ${message}`);
});

client.on('authenticated', () => {
    console.log('✅ Autenticato con successo!');
});

client.on('auth_failure', msg => {
    console.error('❌ Errore di autenticazione:', msg);
});

client.on('disconnected', reason => {
    console.error('❌ Disconnesso:', reason);
});

// 📌 Mostra il QR Code in console e su pagina web
client.on('qr', async (qr) => {
    console.log('📲 Scansiona questo QR Code con WhatsApp:');
    
    // ✅ Stampa il QR Code nella console
    qrcode.toString(qr, { type: 'terminal' }, (err, url) => {
        if (err) console.error('❌ Errore generazione QR:', err);
        console.log(url);
    });

    // ✅ Genera l'immagine per la pagina web
    qrCodeImage = await qrcode.toDataURL(qr);
});

// 📌 Conferma quando il bot è pronto
client.on('ready', async () => {
    console.log('✅ Bot WhatsApp pronto!');

    // 🔹 Invia un messaggio di test
    const numero = '393286340185';  // Sostituisci con il tuo numero
    const chatId = `${numero}@c.us`;
    const messaggio = 'Ciao! Questo è un messaggio automatico senza proxy.';

    await client.sendMessage(chatId, messaggio);
    console.log(`📩 Messaggio inviato a ${numero}`);
});

// 📌 Mostra il QR Code in una pagina web
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
                <h1>Scansiona il QR Code per connettere WhatsApp</h1>
                ${qrCodeImage ? `<img src="${qrCodeImage}" />` : '<h2>Generazione in corso... Attendi.</h2>'}
            </body>
        </html>
    `);
});

// 📌 Avvia il server web per mostrare il QR Code
app.listen(port, () => console.log(`🌍 Server avviato su http://localhost:${port}`));

// 📌 Mantieni il bot attivo
setInterval(() => {}, 1000 * 60 * 60); // Mantiene il processo attivo per 1 ora

// 📌 Avvia il bot WhatsApp
client.initialize();
