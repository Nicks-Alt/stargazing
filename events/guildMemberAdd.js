const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'guildMemberAdd',
    execute(member) {
        const embed = new EmbedBuilder()
            .setTitle('🌟 Welcome to STARGAZING Discord!')
            .setDescription(`Hey ${member}, welcome to **${member.guild.name}**!\n\n🔐 **Get started by verifying your account:**\nUse \`/verify <steamid>\` to link your Steam account and get access to the server.\n\n✨ Once verified, you'll get your proper role and full access!`)
            .setColor(0x6168E5)
            .setThumbnail(member.user.displayAvatarURL())
            .setFooter({ text: `Member #${member.guild.memberCount}` })
            .setTimestamp();

        // Send to verify channel
        const verifyChannelId = '1386110887168835620';
        const verifyChannel = member.guild.channels.cache.get(verifyChannelId);
        
        if (verifyChannel) {
            verifyChannel.send({ 
                content: `👋 Welcome ${member}!`, 
                embeds: [embed] 
            });
        } else {
            console.log('❌ Verify channel not found');
        }
    },
};