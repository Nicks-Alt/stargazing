const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { addVerifiedUser } = require('../utils/storage');

module.exports = {
    async handleButtonInteraction(interaction) {
        if (!interaction.isButton()) return;

        const [action, userId, steamId] = interaction.customId.split('_');
        
        console.log(`🔘 Button interaction: ${interaction.customId} by ${interaction.user.username}`);
        
        if (action === 'approve') {
            await handleApproval(interaction, userId, steamId);
        } else if (action === 'deny') {
            await handleDenial(interaction, userId, steamId);
        }
    }
};

async function handleApproval(interaction, userId, steamId) {
    console.log(`✅ Processing approval for user ${userId} with Steam ID ${steamId}`);
    
    try {
        // Try to reply, but handle expired interactions
        try {
            await interaction.reply({ content: '⏳ Processing approval...', flags: 64 });
        } catch (replyError) {
            if (replyError.code === 10062) {
                console.log('⚠️ Interaction expired, but continuing with approval process...');
            } else {
                throw replyError;
            }
        }

        const guild = interaction.guild;
        const member = await guild.members.fetch(userId).catch(() => null);
        
        if (!member) {
            console.log('❌ User is no longer in the server');
            await safeEditReply(interaction, '❌ User is no longer in the server.');
            return;
        }

        // Find the "Drifters" role
        const driftersRole = "1386113801555939408"

        // Add the Drifters role
        await member.roles.add(driftersRole);
        console.log(`✅ Added Drifters role to ${member.user.tag}`);

        // Store as verified user with Drifters rank
        addVerifiedUser(userId, steamId, member.user.username, 'Drifters');

        // Update the original embed to show approved status
        const approvedEmbed = new EmbedBuilder()
            .setTitle('✅ Join Request Approved')
            .setDescription(`${member.user} has been approved and given the Drifters role`)
            .addFields(
                { name: 'Discord User', value: `${member.user.tag} (${userId})`, inline: true },
                { name: 'Steam ID', value: steamId, inline: true },
                { name: 'Status', value: '✅ Approved', inline: false },
                { name: 'Approved By', value: interaction.user.tag, inline: true }
            )
            .setColor('#00ff00')
            .setThumbnail(member.user.displayAvatarURL())
            .setTimestamp();

        // Update the original message and remove buttons
        await interaction.message.edit({
            embeds: [approvedEmbed],
            components: []
        });

        // Send DM to approved user
        try {
            const dmEmbed = new EmbedBuilder()
                .setTitle('✅ Join Request Approved!')
                .setDescription(`Your request to join the organization has been approved!`)
                .addFields(
                    { name: 'Role Assigned', value: driftersRole.name, inline: true },
                    { name: 'Server', value: guild.name, inline: true }
                )
                .setColor('#00ff00')
                .setTimestamp();

            await member.send({ embeds: [dmEmbed] });
            console.log(`📨 Sent approval DM to ${member.user.tag}`);
        } catch (dmError) {
            console.log('⚠️ Could not send DM to approved user:', dmError.message);
        }

        await safeEditReply(interaction, '✅ User has been approved and given the Drifters role!');

    } catch (error) {
        console.error('❌ Error handling approval:', error);
        await safeEditReply(interaction, '❌ An error occurred while processing the approval.');
    }
}

async function handleDenial(interaction, userId, steamId) {
    console.log(`❌ Processing denial for user ${userId} with Steam ID ${steamId}`);
    
    try {
        // Try to reply, but handle expired interactions
        try {
            await interaction.reply({ content: '⏳ Processing denial...', flags: 64 });
        } catch (replyError) {
            if (replyError.code === 10062) {
                console.log('⚠️ Interaction expired, but continuing with denial process...');
            } else {
                throw replyError;
            }
        }

        const guild = interaction.guild;
        const member = await guild.members.fetch(userId).catch(() => null);
        
        if (!member) {
            console.log('❌ User is no longer in the server');
            await safeEditReply(interaction, '❌ User is no longer in the server.');
            return;
        }

        // Check if bot has kick permissions
        const botMember = guild.members.me;
        if (!botMember.permissions.has(PermissionFlagsBits.KickMembers)) {
            console.log('❌ Bot does not have KICK_MEMBERS permission');
            await safeEditReply(interaction, '❌ Bot does not have permission to kick members!');
            return;
        }

        // Check if the target member is kickable
        if (!member.kickable) {
            console.log(`❌ Cannot kick ${member.user.tag} - member is not kickable (higher role or owner)`);
            await safeEditReply(interaction, '❌ Cannot kick this member (they may have a higher role than the bot)!');
            return;
        }

        console.log(`🔨 Attempting to kick ${member.user.tag}...`);

        // Send DM before kicking
        try {
            const dmEmbed = new EmbedBuilder()
                .setTitle('❌ Join Request Denied')
                .setDescription(`Your request to join the organization has been denied.`)
                .addFields(
                    { name: 'Server', value: guild.name, inline: true },
                    { name: 'Reason', value: 'Your join request was reviewed and denied by staff.', inline: false }
                )
                .setColor('#ff0000')
                .setTimestamp();

            await member.send({ embeds: [dmEmbed] });
            console.log(`📨 Sent denial DM to ${member.user.tag}`);
        } catch (dmError) {
            console.log('⚠️ Could not send DM to denied user:', dmError.message);
        }

        // Update the original embed to show denied status BEFORE kicking
        const deniedEmbed = new EmbedBuilder()
            .setTitle('❌ Join Request Denied')
            .setDescription(`${member.user} has been denied and removed from the server`)
            .addFields(
                { name: 'Discord User', value: `${member.user.tag} (${userId})`, inline: true },
                { name: 'Steam ID', value: steamId, inline: true },
                { name: 'Status', value: '❌ Denied', inline: false },
                { name: 'Denied By', value: interaction.user.tag, inline: true }
            )
            .setColor('#ff0000')
            .setThumbnail(member.user.displayAvatarURL())
            .setTimestamp();

        // Update the original message and remove buttons
        await interaction.message.edit({
            embeds: [deniedEmbed],
            components: []
        });
        console.log('✅ Updated original message with denial status');

        // Kick the user from the server
        try {
            await member.kick('Join request denied');
            console.log(`✅ Successfully kicked ${member.user.tag} from server`);
            await safeEditReply(interaction, '✅ User has been denied and removed from the server.');
        } catch (kickError) {
            console.error(`❌ Failed to kick ${member.user.tag}:`, kickError);
            await safeEditReply(interaction, `❌ User was denied but could not be kicked: ${kickError.message}`);
        }

    } catch (error) {
        console.error('❌ Error handling denial:', error);
        await safeEditReply(interaction, '❌ An error occurred while processing the denial.');
    }
}

// Helper function to safely edit replies, handling expired interactions
async function safeEditReply(interaction, content) {
    try {
        if (interaction.replied || interaction.deferred) {
            await interaction.editReply(content);
        }
    } catch (error) {
        if (error.code === 10062) {
            console.log('⚠️ Could not edit reply - interaction expired');
        } else {
            console.error('❌ Could not edit reply:', error.message);
        }
    }
}