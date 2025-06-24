const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { handleSyncRanks } = require('../handlers/syncRanksHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('syncranks')
        .setDescription('Sync all Discord members with their API ranks and assign proper roles')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        await handleSyncRanks(interaction);
    },
};