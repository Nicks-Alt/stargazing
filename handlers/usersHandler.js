const { EmbedBuilder } = require('discord.js');
const { getAllVerifiedUsers } = require('../utils/storage');

// Rank hierarchy from syncRanksHandler.js (top to bottom)
const RANK_HIERARCHY = [
    '☆・void',
    '☆・parallax',
    '☆・astral',
    '☆・celestial',
    '☆・stellar',
    '☆・eclipse',
    '☆・drifters'
];

async function handleUsersCommand(interaction) {
    console.log(`👥 Users command executed by ${interaction.user.tag}`);
    
    try {
        await interaction.deferReply({ flags: 64 });
        
        // Get all verified users
        const verifiedUsers = getAllVerifiedUsers();
        const userCount = Object.keys(verifiedUsers).length;
        
        if (userCount === 0) {
            const noUsersEmbed = new EmbedBuilder()
                .setTitle('👥 Verified Organization Members')
                .setDescription('No verified users found.')
                .setColor('#ffff00')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [noUsersEmbed] });
            return;
        }
        
        // Group users by rank
        const usersByRank = {};
        
        for (const [discordId, userData] of Object.entries(verifiedUsers)) {
            try {
                // Try to get the Discord member
                const member = await interaction.guild.members.fetch(discordId).catch(() => null);
                const displayName = member ? member.user.tag : userData.name || 'Unknown User';
                const mention = member ? `<@${discordId}>` : displayName;
                
                // Create profile link
                const profileLink = `https://superiorservers.co/profile/${userData.steamId}`;
                
                const rank = userData.rank || '☆・drifters';
                
                if (!usersByRank[rank]) {
                    usersByRank[rank] = [];
                }
                
                // Add user data
                usersByRank[rank].push({
                    discordId,
                    displayName,
                    mention,
                    rank,
                    steamId: userData.steamId,
                    profileLink
                });
            } catch (error) {
                console.error(`❌ Error processing user ${discordId}:`, error);
                // Add user without Discord info if there's an error
                const profileLink = `https://superiorservers.co/profile/${userData.steamId}`;
                const rank = userData.rank || '☆・drifters';
                
                if (!usersByRank[rank]) {
                    usersByRank[rank] = [];
                }
                
                usersByRank[rank].push({
                    discordId,
                    displayName: userData.name || 'Unknown User',
                    mention: userData.name || 'Unknown User',
                    rank,
                    steamId: userData.steamId,
                    profileLink
                });
            }
        }
        
        // Sort users within each rank alphabetically
        for (const rank in usersByRank) {
            usersByRank[rank].sort((a, b) => a.displayName.localeCompare(b.displayName));
        }
        
        // Build the formatted output grouped by rank
        const sections = [];
        
        for (const rank of RANK_HIERARCHY) {
            if (usersByRank[rank] && usersByRank[rank].length > 0) {
                const users = usersByRank[rank];
                let sectionContent = `**${rank}** (${users.length})\n`;
                
                users.forEach((user, index) => {
                    sectionContent += `${user.mention} • [Profile](${user.profileLink}) • \`${user.steamId}\`\n`;
                });
                
                sections.push(sectionContent);
            }
        }
        
        // Add any ranks not in hierarchy (shouldn't happen but just in case)
        for (const rank in usersByRank) {
            if (!RANK_HIERARCHY.includes(rank)) {
                const users = usersByRank[rank];
                let sectionContent = `**${rank}** (${users.length})\n`;
                
                users.forEach((user, index) => {
                    sectionContent += `${user.mention} • [Profile](${user.profileLink}) • \`${user.steamId}\`\n`;
                });
                
                sections.push(sectionContent);
            }
        }
        
        // Split sections into embeds to fit Discord limits
        const maxLength = 4000;
        const embeds = [];
        let currentChunk = '';
        let currentPage = 1;
        
        for (const section of sections) {
            if ((currentChunk + section + '\n').length > maxLength) {
                // Create embed for current chunk
                if (currentChunk.trim()) {
                    const embed = new EmbedBuilder()
                        .setTitle(`👥 Verified Organization Members (Page ${currentPage})`)
                        .setDescription(currentChunk.trim())
                        .setColor('#00ff00')
                        .setFooter({ text: `Total: ${userCount} verified members • Grouped by rank` })
                        .setTimestamp();
                    
                    embeds.push(embed);
                    currentPage++;
                }
                currentChunk = section + '\n';
            } else {
                currentChunk += section + '\n';
            }
        }
        
        // Add the last chunk if it exists
        if (currentChunk.trim()) {
            const embed = new EmbedBuilder()
                .setTitle(`👥 Verified Organization Members${embeds.length > 0 ? ` (Page ${currentPage})` : ''}`)
                .setDescription(currentChunk.trim())
                .setColor('#00ff00')
                .setFooter({ text: `Total: ${userCount} verified members • Grouped by rank` })
                .setTimestamp();
            
            embeds.push(embed);
        }
        
        // Send the embeds
        if (embeds.length === 1) {
            await interaction.editReply({ embeds: [embeds[0]] });
        } else {
            // Send first embed, then follow up with the rest
            await interaction.editReply({ embeds: [embeds[0]] });
            
            for (let i = 1; i < embeds.length; i++) {
                await interaction.followUp({ embeds: [embeds[i]], flags: 64 });
            }
        }
        
        console.log(`✅ Users command completed - showed ${userCount} verified users grouped by rank`);
        
    } catch (error) {
        console.error('❌ Error in users command:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ Error')
            .setDescription(`An error occurred while fetching users: ${error.message}`)
            .setColor('#ff0000')
            .setTimestamp();
        
        try {
            await interaction.editReply({ embeds: [errorEmbed] });
        } catch (replyError) {
            console.error('❌ Failed to send error message:', replyError);
        }
    }
}

module.exports = { handleUsersCommand };