const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { handleUsersCommand } = require('../handlers/usersHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('users')
        .setDescription('Show all verified organization members')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        await handleUsersCommand(interaction);
    },
};