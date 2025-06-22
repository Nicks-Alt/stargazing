const { EmbedBuilder } = require('discord.js');
const { fetchOrgData } = require('../services/apiService');
const { convertSteamId } = require('../utils/steamUtils');
const { addVerifiedUser } = require('../utils/storage');

async function handleForceVerify(interaction) {
    console.log(`🔧 Force verify command started by ${interaction.user.tag}`);
    await interaction.deferReply();
    
    const targetUser = interaction.options.getMember('user');
    const steamId = interaction.options.getString('steamid');
    
    if (!targetUser) {
        return interaction.editReply('❌ User not found in server!');
    }
    
    console.log(`📝 Force verifying ${targetUser.user.tag} with Steam ID: ${steamId}`);
    
    try {
        // Convert Steam ID if needed
        const steam64 = convertSteamId(steamId);
        if (!steam64) {
            return interaction.editReply('Invalid STEAM_ format! Use format: STEAM_0:X:XXXXXXX');
        }
        
        // Fetch organization data
        const orgData = await fetchOrgData();
        if (!orgData || !orgData.Members) {
            return interaction.editReply('API Error: No members data found!');
        }
        
        // Find member in organization
        const member = orgData.Members.find(m => m.SteamID === steam64);
        
        let role, memberName, memberRank;
        
        if (!member) {
            console.log('❌ Steam ID not found in organization members - assigning as non-org member');
            
            // Handle non-org members by giving them Drifters role
            const driftersRole = interaction.guild.roles.cache.get(process.env.DRIFTERS_ROLE);
            if (!driftersRole) {
                console.log('❌ Drifters role not found for non-org member');
                console.log(`🔍 Looking for role ID: ${process.env.DRIFTERS_ROLE}`);
                console.log(`📋 Available roles: ${interaction.guild.roles.cache.map(r => `${r.name} (${r.id})`).join(', ')}`);
                return interaction.editReply('❌ Steam ID not found in organization and Drifters role not configured!');
            }
            
            role = driftersRole;
            memberName = targetUser.user.username; // Use Discord username as fallback
            memberRank = 'Drifters';
            
            console.log(`✅ Assigning non-org member role: ${role.name}`);
        } else {
            console.log(`✅ Found member: ${member.Name || 'Unknown'} with rank: ${member.Rank}`);
            
            // Find and assign role for org members
            role = interaction.guild.roles.cache.find(r => 
                r.name.toLowerCase() === member.Rank.toLowerCase()
            );
            
            if (!role) {
                console.log(`❌ Role "${member.Rank}" not found in server`);
                return interaction.editReply(`❌ Role "${member.Rank}" not found in server!`);
            }
            
            memberName = member.Name;
            memberRank = member.Rank;
            
            console.log(`✅ Found org member role: ${role.name} (ID: ${role.id})`);
        }
        
        // Add role to target user
        console.log('🎭 Adding role to user...');
        await targetUser.roles.add(role);
        console.log('✅ Role added successfully');
        
        // Set nickname from API response or Discord username
        if (memberName && memberName.trim()) {
            try {
                console.log(`🏷️ Setting nickname to: ${memberName}`);
                await targetUser.setNickname(memberName);
                console.log('✅ Nickname set successfully');
            } catch (nicknameError) {
                console.log('⚠️ Could not set nickname:', nicknameError.message);
            }
        }
        
        // Store verified user
        addVerifiedUser(targetUser.user.id, steam64, memberName, memberRank);
        
        // Send success embed
        const embed = new EmbedBuilder()
            .setTitle('✅ Force Verification Complete!')
            .setDescription(`Successfully verified ${targetUser.user}`)
            .addFields(
                { name: 'Discord User', value: `${targetUser.user.tag} (${targetUser.user.id})`, inline: true },
                { name: 'Steam ID', value: steam64, inline: true },
                { name: 'Name', value: memberName || 'Unknown', inline: true },
                { name: 'Rank', value: memberRank, inline: true },
                { name: 'Role Assigned', value: role.name, inline: true },
                { name: 'Verified By', value: interaction.user.tag, inline: true },
                { name: 'Member Type', value: member ? '🏢 Organization Member' : '👤 Non-Organization Member', inline: false }
            )
            .setColor('#00ff00')
            .setThumbnail(targetUser.user.displayAvatarURL())
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        console.log(`🎉 Force verification completed for ${targetUser.user.tag}`);
        
        // Notify the target user via DM
        try {
            const dmEmbed = new EmbedBuilder()
                .setTitle('✅ You have been verified!')
                .setDescription('An administrator has verified your account.')
                .addFields(
                    { name: 'Name', value: memberName || 'Unknown', inline: true },
                    { name: 'Rank', value: memberRank, inline: true },
                    { name: 'Role Assigned', value: role.name, inline: true },
                    { name: 'Status', value: member ? 'Organization Member' : 'Non-Organization Member', inline: false }
                )
                .setColor('#00ff00')
                .setTimestamp();
            
            await targetUser.send({ embeds: [dmEmbed] });
            console.log(`✅ Sent verification DM to ${targetUser.user.tag}`);
        } catch (dmError) {
            console.log(`⚠️ Could not send DM to ${targetUser.user.tag}`);
        }
        
        // Log to audit channel if configured
        if (process.env.AUDIT_LOG_CHANNEL) {
            const auditChannel = interaction.guild.channels.cache.get(process.env.AUDIT_LOG_CHANNEL);
            if (auditChannel) {
                const auditEmbed = new EmbedBuilder()
                    .setTitle('📋 Force Verification')
                    .addFields(
                        { name: 'Target User', value: `${targetUser.user.tag} (${targetUser.user.id})`, inline: true },
                        { name: 'Steam ID', value: steam64, inline: true },
                        { name: 'Role Given', value: role.name, inline: true },
                        { name: 'Verified By', value: interaction.user.tag, inline: true },
                        { name: 'Type', value: member ? 'Org Member' : 'Non-Org Member', inline: true }
                    )
                    .setColor('#0099ff')
                    .setTimestamp();
                
                await auditChannel.send({ embeds: [auditEmbed] });
            }
        }
        
    } catch (error) {
        console.error('❌ Force verification error:', error);
        
        if (error.response) {
            console.error(`API Error - Status: ${error.response.status}, Data:`, error.response.data);
        } else if (error.request) {
            console.error('Network Error - No response received:', error.message);
        } else {
            console.error('Unknown Error:', error.message);
        }
        
        await interaction.editReply('❌ Force verification failed! Check console for details.');
    }
}

module.exports = { handleForceVerify };