const { removeVerifiedUser, getVerifiedUser } = require('../utils/storage');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'guildMemberRemove',
    async execute(member) {
        console.log(`👋 guildMemberRemove event triggered for ${member.user.tag} (${member.user.id})`);
        
        try {
            // Check if user was verified
            const verifiedUser = getVerifiedUser(member.user.id);
            console.log(`🔍 Checking verification status for ${member.user.tag}:`, verifiedUser ? 'VERIFIED' : 'NOT VERIFIED');
            
            if (verifiedUser) {
                console.log(`🗑️ Removing verification for ${member.user.tag}`);
                console.log(`📋 User data:`, {
                    steamId: verifiedUser.steamId,
                    name: verifiedUser.name,
                    rank: verifiedUser.rank,
                    verifiedAt: verifiedUser.verifiedAt
                });
                
                const removed = removeVerifiedUser(member.user.id);
                
                if (removed) {
                    console.log(`✅ Successfully unverified ${member.user.tag} (${verifiedUser.name})`);
                    
                    // Optional: Log to a channel
                    try {
                        const logChannel = member.guild.channels.cache.get(process.env.JOIN_REQUEST_CHANNEL);
                        if (logChannel) {
                            console.log(`📝 Logging unverification to channel: ${logChannel.name}`);
                            
                            const logEmbed = new EmbedBuilder()
                                .setTitle('📤 User Left & Unverified')
                                .setDescription(`${member.user.tag} left the server and has been automatically unverified`)
                                .addFields(
                                    { name: 'Discord User', value: `${member.user.tag} (${member.user.id})`, inline: true },
                                    { name: 'Steam ID', value: verifiedUser.steamId, inline: true },
                                    { name: 'Name', value: verifiedUser.name || 'Unknown', inline: true },
                                    { name: 'Rank', value: verifiedUser.rank || 'Unknown', inline: true },
                                    { name: 'Originally Verified', value: new Date(verifiedUser.verifiedAt).toLocaleString(), inline: false }
                                )
                                .setColor('#ff6b6b')
                                .setThumbnail(member.user.displayAvatarURL())
                                .setTimestamp();
                            
                            await logChannel.send({ embeds: [logEmbed] });
                            console.log(`✅ Successfully logged unverification to channel`);
                        } else {
                            console.log(`⚠️ Log channel not found or not configured`);
                        }
                    } catch (logError) {
                        console.error('❌ Error logging to channel:', logError);
                    }
                } else {
                    console.log(`❌ Failed to remove verification for ${member.user.tag}`);
                }
            } else {
                console.log(`ℹ️ User ${member.user.tag} was not verified, no action needed`);
            }
        } catch (error) {
            console.error(`❌ Error in guildMemberRemove event for ${member.user.tag}:`, error);
        }
    },
};