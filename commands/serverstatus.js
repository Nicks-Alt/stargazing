const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverstatus')
        .setDescription('Check the current server status and player count'),
    
    async execute(interaction) {
        await interaction.deferReply();
        
        const SERVER_IP = 'rp.superiorservers.co';
        const SERVER_PORT = 27015;
        
        try {
            console.log(`🔍 Manual server query by ${interaction.user.tag}`);
            
            const serverInfo = await A2S.info(SERVER_IP, SERVER_PORT, 10000); // 10 second timeout
            
            const embed = new EmbedBuilder()
                .setTitle('🖥️ Server Status')
                .setColor('#00ff00')
                .addFields(
                    { name: '🏷️ Server Name', value: serverInfo.name || 'Unknown', inline: false },
                    { name: '🌐 Address', value: `${SERVER_IP}:${SERVER_PORT}`, inline: true },
                    { name: '👥 Players', value: `${serverInfo.players || 0}/${serverInfo.maxPlayers || 0}`, inline: true },
                    { name: '🗺️ Map', value: serverInfo.map || 'Unknown', inline: true },
                    { name: '🎮 Game', value: serverInfo.game || 'Unknown', inline: true },
                    { name: '📁 Folder', value: serverInfo.folder || 'Unknown', inline: true },
                    { name: '🔢 Version', value: serverInfo.version?.toString() || 'Unknown', inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Server Status' });
            
            // Add server description if available
            if (serverInfo.keywords) {
                embed.addFields({ name: '🏷️ Keywords', value: serverInfo.keywords, inline: false });
            }
            
            await interaction.editReply({ embeds: [embed] });
            console.log(`✅ Server status sent to ${interaction.user.tag}`);
            
        } catch (error) {
            console.error('❌ Server query failed:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Server Offline')
                .setDescription('Unable to connect to the server. It may be offline or unreachable.')
                .addFields(
                    { name: '🌐 Address', value: `${SERVER_IP}:${SERVER_PORT}`, inline: true },
                    { name: '❌ Error', value: error.message, inline: false }
                )
                .setColor('#ff0000')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};