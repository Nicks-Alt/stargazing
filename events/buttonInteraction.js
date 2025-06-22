const { Events, EmbedBuilder } = require('discord.js');
const { addVerifiedUser } = require('../utils/storage');

// Track processed button interactions
const processedButtons = new Set();

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isButton()) return;

        // Prevent duplicate processing
        if (processedButtons.has(interaction.id)) {
            console.log('⚠️ Duplicate button interaction detected, skipping...');
            return;
        }
        processedButtons.add(interaction.id);

        // Clean up old interaction IDs
        if (processedButtons.size > 50) {
            const oldIds = Array.from(processedButtons).slice(0, 25);
            oldIds.forEach(id => processedButtons.delete(id));
        }

        console.log(`🔘 Button interaction: ${interaction.customId} by ${interaction.user.tag}`);

        // Check if interaction is already handled
        if (interaction.replied || interaction.deferred) {
            console.log('⚠️ Button interaction already handled, skipping...');
            return;
        }

        const customIdParts = interaction.customId.split('_');
        if (customIdParts.length < 3) {
            console.log('❌ Invalid button customId format');
            return;
        }

        const [action, userId, ...steamIdParts] = customIdParts;
        const steamId = steamIdParts.join('_'); // In case Steam ID contains underscores
        
        try {
            await interaction.deferReply({ flags: 64 }); // Ephemeral reply
        } catch (deferError) {
            console.error('❌ Failed to defer button reply:', deferError.message);
            return;
        }

        if (action === 'approve') {
            try {
                console.log(`✅ Processing approval for user ${userId} with Steam ID ${steamId}`);
                
                // Get the user
                const user = await interaction.guild.members.fetch(userId);
                if (!user) {
                    return interaction.editReply('❌ User not found in server!');
                }
                
                const driftersRole = interaction.guild.roles.cache.get(process.env.DRIFTERS_ROLE);
                if (!driftersRole) {
                    console.log('❌ Drifters role not found');
                    return interaction.editReply('❌ Drifters role not found in server!');
                }
                
                // Add Drifters role to user
                await user.roles.add(driftersRole);
                console.log(`✅ Added Drifters role to ${user.user.tag}`);
                
                const approvedEmbed = new EmbedBuilder()
                    .setTitle('✅ Join Request Approved')
                    .setDescription(`Join request has been approved!`)
                    .addFields(
                        { name: 'User', value: `${user.user.tag} (${user.id})`, inline: true },
                        { name: 'Steam ID', value: steamId, inline: true },
                        { name: 'Approved By', value: interaction.user.tag, inline: true },
                        { name: 'Role Assigned', value: 'Drifters', inline: true }
                    )
                    .setColor('#00ff00')
                    .setTimestamp();
                
                // Update the original message
                await interaction.message.edit({
                    embeds: [approvedEmbed],
                    components: [] // Remove buttons
                });
                
                await interaction.editReply('✅ Join request approved! User has been given the Drifters role.');
                
                // Try to notify the user
                try {
                    const dmEmbed = new EmbedBuilder()
                        .setTitle('✅ Join Request Approved!')
                        .setDescription('Your request to join STARGAZING has been approved!')
                        .addFields(
                            { name: 'Role Assigned', value: 'You have been given the **Drifters** role!', inline: false },
                            { name: 'Welcome!', value: 'Welcome to STARGAZING! You can now access the server.', inline: false }
                        )
                        .setColor('#00ff00');
                    
                    await user.send({ embeds: [dmEmbed] });
                    console.log(`📨 Sent approval DM to ${user.user.tag}`);
                } catch (dmError) {
                    console.log(`⚠️ Could not DM user ${user.user.tag}:`, dmError.message);
                }
                
            } catch (error) {
                console.error('❌ Error processing approval:', error);
                try {
                    await interaction.editReply('❌ Error processing approval! Please try again.');
                } catch (replyError) {
                    console.error('❌ Failed to send error reply:', replyError.message);
                }
            }
            
        } else if (action === 'deny') {
            try {
                console.log(`❌ Processing denial for user ${userId} with Steam ID ${steamId}`);
                
                const user = await interaction.guild.members.fetch(userId);
                
                const deniedEmbed = new EmbedBuilder()
                    .setTitle('❌ Join Request Denied')
                    .setDescription(`Join request has been denied.`)
                    .addFields(
                        { name: 'User', value: user ? `${user.user.tag} (${user.id})` : `Unknown User (${userId})`, inline: true },
                        { name: 'Steam ID', value: steamId, inline: true },
                        { name: 'Denied By', value: interaction.user.tag, inline: true },
                        { name: 'Action', value: '🚪 User will be kicked from server', inline: false }
                    )
                    .setColor('#ff0000')
                    .setTimestamp();
                
                // Update the original message
                await interaction.message.edit({
                    embeds: [deniedEmbed],
                    components: [] // Remove buttons
                });
                
                await interaction.editReply('❌ Join request denied.');
                
                // Try to notify the user
                if (user) {
                    try {
                        const dmEmbed = new EmbedBuilder()
                            .setTitle('❌ Join Request Denied')
                            .setDescription('Your request to join STARGAZING has been denied.')
                            .addFields(
                                { name: 'Result', value: 'You will be removed from the Discord server.', inline: false },
                                { name: 'Contact', value: 'Please contact an administrator if you believe this is an error.', inline: false }
                            )
                            .setColor('#ff0000');
                        
                        await user.send({ embeds: [dmEmbed] });
                        console.log(`📨 Sent denial DM to ${user.user.tag}`);
                    } catch (dmError) {
                        console.log(`⚠️ Could not DM user ${user.user.tag}:`, dmError.message);
                    }
                }
                
            } catch (error) {
                console.error('❌ Error processing denial:', error);
                try {
                    await interaction.editReply('❌ Error processing denial! Please try again.');
                } catch (replyError) {
                    console.error('❌ Failed to send error reply:', replyError.message);
                }
            }
        } else {
            console.log(`❌ Unknown button action: ${action}`);
            try {
                await interaction.editReply('❌ Unknown button action!');
            } catch (replyError) {
                console.error('❌ Failed to send unknown action reply:', replyError.message);
            }
        }
    },
};