const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { handleForceVerify } = require('../handlers/forceVerifyHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('forceverify')
        .setDescription('Force verify a user with their Steam ID')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to verify')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('steamid')
                .setDescription('Their Steam ID')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        await handleForceVerify(interaction);
    },
};