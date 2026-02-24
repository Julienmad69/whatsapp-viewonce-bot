const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const fs = require('fs');
const path = require('path');

// Configuration du logger
const logger = pino({ level: 'silent' }); // 'silent' pour moins de logs

// Chargement des plugins
const plugins = [];
const pluginsDir = path.join(__dirname, 'plugins');

if (fs.existsSync(pluginsDir)) {
    const files = fs.readdirSync(pluginsDir).filter(file => file.endsWith('.js'));
    for (const file of files) {
        try {
            const plugin = require(path.join(pluginsDir, file));
            plugins.push(plugin);
            console.log(`✅ Plugin chargé: ${plugin.name}`);
        } catch (err) {
            console.error(`❌ Erreur chargement plugin ${file}:`, err.message);
        }
    }
} else {
    console.log('📁 Dossier plugins non trouvé, création...');
    fs.mkdirSync(pluginsDir, { recursive: true });
}

async function startBot() {
    console.log('🚀 Démarrage du bot...');
    
    const { state, saveCreds } = await useMultiFileAuthState('session');
    
    const sock = makeWASocket({
        printQRInTerminal: true,
        auth: state,
        logger: logger,
        browser: ['ViewOnce Bot', 'Chrome', '1.0.0']
    });

    // Sauvegarde des credentials
    sock.ev.on('creds.update', saveCreds);

    // Gestion des messages
    sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const message of messages) {
            // Ignorer les messages de statut et les messages propres au bot
            if (message.key && message.key.remoteJid === 'status@broadcast') continue;
            
            // Exécuter tous les plugins
            for (const plugin of plugins) {
                try {
                    await plugin.execute(sock, message, []);
                } catch (err) {
                    console.error(`Erreur plugin ${plugin.name}:`, err.message);
                }
            }
        }
    });

    // Gestion de la connexion
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('📱 Scannez ce QR code avec WhatsApp:');
            require('qrcode-terminal').generate(qr, { small: true });
        }
        
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('🔌 Connexion fermée, reconnexion:', shouldReconnect);
            if (shouldReconnect) {
                setTimeout(startBot, 5000);
            }
        } else if (connection === 'open') {
            console.log('✅ Bot connecté avec succès!');
            console.log('📱 En attente de messages view-once...');
        }
    });
}

// Gestion des erreurs non capturées
process.on('uncaughtException', (err) => {
    console.error('❌ Erreur non capturée:', err.message);
});

process.on('unhandledRejection', (err) => {
    console.error('❌ Rejet non géré:', err.message);
});

startBot();
