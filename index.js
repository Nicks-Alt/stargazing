const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const A2SHandler = require('./handlers/a2sHandler');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers
    ]
});

client.commands = new Collection();

// Initialize A2S handler
let a2sHandler = null;

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.data.name, command);
    console.log(`📁 Loaded command: ${command.data.name}`);
}

// Load events
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    console.log(`📂 Found ${eventFiles.length} event files`);

    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);
        
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
            console.log(`📅 Loaded once event: ${event.name}`);
        } else {
            client.on(event.name, (...args) => event.execute(...args));
            console.log(`📅 Loaded event: ${event.name}`);
        }
    }
} else {
    console.log('⚠️ Events folder not found');
}

client.once('ready', () => {
    console.log(`✅ Bot is ready! Logged in as ${client.user.tag}`);
    console.log(`🏠 Connected to ${client.guilds.cache.size} guild(s)`);
    console.log(`📋 Loaded ${client.commands.size} command(s)`);
    
    // Initialize and start A2S monitoring
    a2sHandler = new A2SHandler(client);
    a2sHandler.start();
    
    // Make A2S handler accessible to commands
    client.a2sHandler = a2sHandler;
});

// Handle slash commands
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error('❌ Error executing command:', error);
        
        const errorMessage = { content: 'There was an error while executing this command!', flags: 64 };
        
        if (interaction.replied || interaction.deferred) {
            await interaction.editReply(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    }
});

// Handle button interactions
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;
    
    const { handleButtonInteraction } = require('./handlers/buttonHandler');
    await handleButtonInteraction(interaction);
});

// Add error handling
client.on('error', error => {
    console.error('❌ Client error:', error);
});

process.on('unhandledRejection', error => {
    console.error('❌ Unhandled promise rejection:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('🛑 Received SIGINT, shutting down gracefully...');
    if (a2sHandler) {
        a2sHandler.stop();
    }
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully...');
    if (a2sHandler) {
        a2sHandler.stop();
    }
    client.destroy();
    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);