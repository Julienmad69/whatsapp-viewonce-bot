const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const fs = require('fs');
const path = require('path');

// Configuration
const logger = pino({ level: 'info' });

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
            console.error(`❌ Erreur chargement plugin ${file}:`, err);
        }
    }
}

async function startBot() {
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
            // Exécuter tous les plugins
            for (const plugin of plugins) {
                try {
                    await plugin.execute(sock, message, []);
                } catch (err) {
                    console.error(`Erreur plugin ${plugin.name}:`, err);
                }
            }
        }
    });

    // Gestion de la connexion
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connexion fermée, reconnexion:', shouldReconnect);
            if (shouldReconnect) {
                startBot();
            }
        } else if (connection === 'open') {
            console.log('✅ Bot connecté avec succès!');
        }
    });
}

console.log('🚀 Démarrage du bot...');
startBot();
