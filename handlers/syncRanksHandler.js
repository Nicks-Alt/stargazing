const { EmbedBuilder } = require('discord.js');
const { fetchOrgData } = require('../services/apiService');
const { getAllVerifiedUsers, addVerifiedUser, removeVerifiedUser } = require('../utils/storage');

// Role mappings - API rank names to Discord role IDs
const ROLE_MAPPINGS = {
    '☆・void': '1386111734196080799',
    '☆・parallax': '1386111749589303429',
    '☆・astral': '1386112344936939612',
    '☆・celestial': '1386113082287460435',
    '☆・stellar': '1386113403868942457',
    '☆・eclipse': '1386113473259376750',
    '☆・drifters': '1386113801555939408'
};

async function handleSyncRanks(interaction) {
    console.log(`🔄 Sync ranks command started by ${interaction.user.tag}`);
    
    try {
        await interaction.deferReply({ flags: 64 });
        
        // Fetch organization data from API
        console.log('📡 Fetching organization data...');
        const orgData = await fetchOrgData();
        
        if (!orgData || !orgData.Members) {
            await interaction.editReply('❌ Failed to fetch organization data from API.');
            return;
        }
        
        // Get all Discord members
        console.log('👥 Fetching Discord members...');
        const guild = interaction.guild;
        await guild.members.fetch(); // Fetch all members
        const discordMembers = guild.members.cache;
        
        // Get verified users from storage
        const verifiedUsers = getAllVerifiedUsers();
        
        // Create lookup maps
        const apiMembersBySteamId = new Map();
        orgData.Members.forEach(member => {
            if (member.SteamID) {
                apiMembersBySteamId.set(member.SteamID, member);
            }
        });
        
        console.log(`📊 Processing ${discordMembers.size} Discord members against ${orgData.Members.length} API members`);
        
        let processedCount = 0;
        let updatedCount = 0;
        let driftersCount = 0;
        let errorCount = 0;
        let storageUpdatedCount = 0;
        let removedFromStorageCount = 0;
        const results = [];
        
        // First, clean up storage - remove users who are no longer in the API
        console.log('🧹 Cleaning up storage for users who left the organization...');
        const usersToRemove = [];
        
        for (const [discordId, userData] of Object.entries(verifiedUsers)) {
            if (userData.steamId) {
                const stillInAPI = apiMembersBySteamId.has(userData.steamId);
                if (!stillInAPI) {
                    usersToRemove.push({
                        discordId,
                        userData,
                        reason: 'No longer in API'
                    });
                }
            }
        }
        
        // Remove users who left the organization
        for (const userToRemove of usersToRemove) {
            const { discordId, userData, reason } = userToRemove;
            
            try {
                // Try to get the Discord member to remove their roles
                const member = await guild.members.fetch(discordId).catch(() => null);
                
                if (member) {
                    // Remove all org roles
                    const orgRoleIds = Object.values(ROLE_MAPPINGS);
                    const rolesToRemove = member.roles.cache.filter(role => orgRoleIds.includes(role.id));
                    
                    if (rolesToRemove.size > 0) {
                        await member.roles.remove(rolesToRemove);
                        console.log(`🗑️ Removed org roles from ${member.user.tag} (left organization)`);
                    }
                }
                
                // Remove from storage
                removeVerifiedUser(discordId);
                removedFromStorageCount++;
                
                const displayName = member ? member.user.tag : userData.name || 'Unknown User';
                results.push(`🗑️ ${displayName} → Removed (left organization)`);
                console.log(`🗑️ Removed ${displayName} from storage: ${reason}`);
                
            } catch (error) {
                console.error(`❌ Error removing user ${discordId}:`, error);
                errorCount++;
            }
        }
        
        // Process each Discord member
        for (const [discordId, member] of discordMembers) {
            // Skip bots
            if (member.user.bot) continue;
            
            processedCount++;
            
            try {
                const verifiedUser = verifiedUsers[discordId];
                let targetRank = '☆・drifters';
                let steamId = null;
                let foundInAPI = false;
                
                // Check if user is verified and has a Steam ID
                if (verifiedUser && verifiedUser.steamId) {
                    steamId = verifiedUser.steamId;
                    const apiMember = apiMembersBySteamId.get(steamId);
                    
                    if (apiMember && apiMember.Rank) {
                        // Check if the API rank exists in our mappings
                        if (ROLE_MAPPINGS[apiMember.Rank]) {
                            targetRank = apiMember.Rank;
                            foundInAPI = true;
                            console.log(`✅ Found ${member.user.tag} in API with rank: ${targetRank}`);
                        } else {
                            console.log(`⚠️ Unknown rank "${apiMember.Rank}" for ${member.user.tag}, assigning drifters`);
                            driftersCount++;
                        }
                    } else {
                        console.log(`⚠️ ${member.user.tag} not found in API, assigning drifters`);
                        driftersCount++;
                    }
                } else {
                    console.log(`⚠️ ${member.user.tag} not verified, assigning drifters`);
                    driftersCount++;
                }
                
                // Get target role
                const targetRoleId = ROLE_MAPPINGS[targetRank];
                const targetRole = guild.roles.cache.get(targetRoleId);
                
                if (!targetRole) {
                    console.log(`❌ Role not found for rank: ${targetRank} (ID: ${targetRoleId})`);
                    errorCount++;
                    results.push(`❌ ${member.user.tag} → Role not found: ${targetRank}`);
                    continue;
                }
                
                // Check if member already has the correct role
                const hasTargetRole = member.roles.cache.has(targetRoleId);
                let roleUpdated = false;
                
                if (!hasTargetRole) {
                    // Remove all org roles first
                    const orgRoleIds = Object.values(ROLE_MAPPINGS);
                    const rolesToRemove = member.roles.cache.filter(role => orgRoleIds.includes(role.id));
                    
                    if (rolesToRemove.size > 0) {
                        await member.roles.remove(rolesToRemove);
                        console.log(`🗑️ Removed ${rolesToRemove.size} old roles from ${member.user.tag}`);
                    }
                    
                    // Add the correct role
                    await member.roles.add(targetRole);
                    console.log(`✅ Added ${targetRank} role to ${member.user.tag}`);
                    
                    updatedCount++;
                    roleUpdated = true;
                    results.push(`✅ ${member.user.tag} → ${targetRole.name}`);
                } else {
                    console.log(`✓ ${member.user.tag} already has correct role: ${targetRole.name}`);
                }
                
                // Always update/add to verified users storage if we have a Steam ID
                if (steamId) {
                    // Check if storage needs updating (new user or rank changed)
                    const needsStorageUpdate = !verifiedUser || 
                                             verifiedUser.rank !== targetRank || 
                                             verifiedUser.name !== member.user.username ||
                                             verifiedUser.steamId !== steamId;
                    
                    if (needsStorageUpdate) {
                        addVerifiedUser(discordId, steamId, member.user.username, targetRank);
                        storageUpdatedCount++;
                        console.log(`💾 Updated storage for ${member.user.tag}: ${targetRank}`);
                    }
                } else if (!verifiedUser) {
                    // User not verified and not found in API - skip storage update
                    console.log(`⚠️ ${member.user.tag} has no Steam ID, skipping storage update`);
                }
                
                // Add small delay to avoid rate limits
                if (processedCount % 10 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    const botFilteredCount = discordMembers.size - guild.members.cache.filter(m => m.user.bot).size;
                    await interaction.editReply(`🔄 Processing... ${processedCount}/${botFilteredCount} members`);
                }
                
            } catch (error) {
                console.error(`❌ Error processing ${member.user.tag}:`, error);
                errorCount++;
                results.push(`❌ ${member.user.tag} → Error: ${error.message}`);
            }
        }
        
        // Create summary embed
        const summaryEmbed = new EmbedBuilder()
            .setTitle('🔄 Rank Sync Complete')
            .setDescription('Successfully synced Discord members with API ranks')
            .addFields(
                { name: '👥 Total Processed', value: processedCount.toString(), inline: true },
                { name: '✅ Roles Updated', value: updatedCount.toString(), inline: true },
                { name: '💾 Storage Updated', value: storageUpdatedCount.toString(), inline: true },
                { name: '🗑️ Removed from Storage', value: removedFromStorageCount.toString(), inline: true },
                { name: '🆕 Assigned Drifters', value: driftersCount.toString(), inline: true },
                { name: '❌ Errors', value: errorCount.toString(), inline: true },
                { name: '📊 API Members', value: orgData.Members.length.toString(), inline: true },
                { name: '⏱️ Duration', value: `${Math.round((Date.now() - interaction.createdTimestamp) / 1000)}s`, inline: true }
            )
            .setColor(updatedCount > 0 || removedFromStorageCount > 0 ? '#00ff00' : '#ffff00')
            .setTimestamp();
        
        // Add recent changes if any
        if (results.length > 0) {
            const recentChanges = results.slice(-15).join('\n'); // Show more changes including removals
            summaryEmbed.addFields({
                name: '📝 Recent Changes',
                value: recentChanges.length > 1024 ? recentChanges.substring(0, 1021) + '...' : recentChanges,
                inline: false
            });
        }
        
        await interaction.editReply({ embeds: [summaryEmbed] });
        
        console.log(`🎉 Rank sync completed: ${updatedCount} roles updated, ${storageUpdatedCount} storage entries updated, ${removedFromStorageCount} removed from storage, ${errorCount} errors`);
        
    } catch (error) {
        console.error('❌ Error in sync ranks command:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ Sync Failed')
            .setDescription(`An error occurred while syncing ranks: ${error.message}`)
            .setColor('#ff0000')
            .setTimestamp();
        
        try {
            await interaction.editReply({ embeds: [errorEmbed] });
        } catch (replyError) {
            console.error('❌ Failed to send error message:', replyError);
        }
    }
}

module.exports = { handleSyncRanks };