const { EmbedBuilder } = require('discord.js');
const { fetchOrgData } = require('../services/apiService');
const { getAllVerifiedUsers } = require('../utils/storage');

async function handleUsersCommand(interaction) {
    console.log(`👥 Users command started by ${interaction.user.tag}`);
    await interaction.deferReply();
    
    try {
        // Fetch organization data
        const orgData = await fetchOrgData();
        if (!orgData || !orgData.Members) {
            return interaction.editReply('❌ API Error: No members data found!');
        }
        
        // Get verified users from storage
        const verifiedUsers = getAllVerifiedUsers();
        
        // Create embed with organization info
        const embed = new EmbedBuilder()
            .setTitle(`👥 ${orgData.Org.Name} Members`)
            .setDescription(`Organization ID: ${orgData.Org.ID}`)
            .addFields(
                { name: '💰 Bank', value: `$${parseInt(orgData.Org.Bank).toLocaleString()}`, inline: true },
                { name: '👑 Owner', value: `<@${Object.keys(verifiedUsers).find(id => verifiedUsers[id].steamId === orgData.Org.Owner) || 'Unknown'}>`, inline: true },
                { name: '📊 Total Members', value: orgData.Members.length.toString(), inline: true }
            )
            .setColor(orgData.Org.Color || '#6C73FF')
            .setTimestamp();
        
        // Group members by rank
        const rankGroups = {};
        orgData.Members.forEach(member => {
            if (!rankGroups[member.Rank]) {
                rankGroups[member.Rank] = [];
            }
            
            // Find Discord user for this Steam ID
            const discordId = Object.keys(verifiedUsers).find(id => 
                verifiedUsers[id].steamId === member.SteamID
            );
            
            const displayName = discordId ? `<@${discordId}>` : member.Name;
            const lastConnect = member.LastConnect ? `${member.LastConnect}m ago` : 'Unknown';
            
            rankGroups[member.Rank].push({
                name: displayName,
                steamName: member.Name,
                lastConnect: lastConnect,
                isVerified: !!discordId
            });
        });
        
        // Sort ranks by weight (get from Ranks array)
        const rankWeights = {};
        if (orgData.Ranks) {
            orgData.Ranks.forEach(rank => {
                rankWeights[rank.RankName] = parseInt(rank.Weight);
            });
        }
        
        const sortedRanks = Object.keys(rankGroups).sort((a, b) => {
            return (rankWeights[b] || 0) - (rankWeights[a] || 0);
        });
        
        // Add fields for each rank
        sortedRanks.forEach(rank => {
            const members = rankGroups[rank];
            const verifiedCount = members.filter(m => m.isVerified).length;
            const totalCount = members.length;
            
            let memberList = members.map(member => {
                const status = member.isVerified ? '✅' : '❌';
                return `${status} ${member.name} (${member.lastConnect})`;
            }).join('\n');
            
            // Discord embed field value limit is 1024 characters
            if (memberList.length > 1024) {
                memberList = memberList.substring(0, 1000) + '\n... (truncated)';
            }
            
            embed.addFields({
                name: `${rank} (${verifiedCount}/${totalCount} verified)`,
                value: memberList || 'No members',
                inline: false
            });
        });
        
        // Add footer with verification stats
        const totalVerified = Object.keys(verifiedUsers).length;
        const totalMembers = orgData.Members.length;
        embed.setFooter({ 
            text: `${totalVerified}/${totalMembers} members verified in Discord` 
        });
        
        await interaction.editReply({ embeds: [embed] });
        console.log(`✅ Users command completed for ${interaction.user.tag}`);
        
    } catch (error) {
        console.error('❌ Users command error:', error);
        await interaction.editReply('❌ Failed to fetch organization members!');
    }
}

module.exports = { handleUsersCommand };