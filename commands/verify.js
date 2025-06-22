const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const { addVerifiedUser, getVerifiedUser } = require('../utils/storage');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Verify with your Steam ID')
        .addStringOption(option =>
            option.setName('steamid')
                .setDescription('Your Steam ID')
                .setRequired(true)
        ),
    
    async execute(interaction) {
        // Check if interaction is already handled
        if (interaction.replied || interaction.deferred) {
            console.log('⚠️ Verify command - Interaction already handled, skipping...');
            return;
        }

        // Add a processing flag to prevent duplicate execution
        if (interaction.processing) {
            console.log('⚠️ Verify command already processing, skipping...');
            return;
        }
        interaction.processing = true;

        console.log(`🔧 Verify command started by ${interaction.user.tag}`);
        
        // Check if command is being run in a guild
        if (!interaction.guild) {
            console.log('❌ Command not run in a guild');
            interaction.processing = false;
            try {
                await interaction.reply({ content: 'This command can only be used in a server!', flags: 64 });
            } catch (error) {
                console.log('❌ Failed to reply with guild error:', error.message);
            }
            return;
        }

        // Check if member exists
        if (!interaction.member) {
            console.log('❌ Member not found in interaction');
            interaction.processing = false;
            try {
                await interaction.reply({ content: 'Unable to find your member information!', flags: 64 });
            } catch (error) {
                console.log('❌ Failed to reply with member error:', error.message);
            }
            return;
        }
        
        try {
            await interaction.deferReply({ flags: 64 });
        } catch (error) {
            console.log('❌ Failed to defer reply:', error.message);
            interaction.processing = false;
            return;
        }
        
        // Check if user is already verified
        const existingUser = getVerifiedUser(interaction.user.id);
        if (existingUser) {
            console.log(`⚠️ User ${interaction.user.tag} is already verified`);
            
            const alreadyVerifiedEmbed = new EmbedBuilder()
                .setTitle('⚠️ Already Verified!')
                .setDescription('You are already verified in this server.')
                .addFields(
                    { name: 'Steam ID', value: existingUser.steamId, inline: true },
                    { name: 'Name', value: existingUser.name || 'Unknown', inline: true },
                    { name: 'Rank', value: existingUser.rank || 'Unknown', inline: true },
                    { name: 'Verified At', value: new Date(existingUser.verifiedAt).toLocaleString(), inline: false }
                )
                .setColor('#ffaa00')
                .setTimestamp();
            
            interaction.processing = false;
            return interaction.editReply({ embeds: [alreadyVerifiedEmbed] });
        }
        
        const steamId = interaction.options.getString('steamid');
        console.log(`📝 Input Steam ID: ${steamId}`);
        
        // Convert STEAM_ to Steam64 if needed
        let steam64 = steamId;
        if (steamId.startsWith('STEAM_')) {
            console.log('🔄 Converting STEAM_ format to Steam64...');
            const match = steamId.match(/^STEAM_[0-5]:([01]):(\d+)$/);
            if (match) {
                const authServer = parseInt(match[1]);
                const authId = parseInt(match[2]);
                steam64 = (BigInt(76561197960265728) + BigInt(authId * 2) + BigInt(authServer)).toString();
                console.log(`✅ Converted to Steam64: ${steam64}`);
            } else {
                console.log('❌ Invalid STEAM_ format');
                interaction.processing = false;
                return interaction.editReply('Invalid STEAM_ format! Use format: STEAM_0:X:XXXXXXX');
            }
        } else {
            console.log('📋 Using provided Steam64 ID');
        }
        
        try {
            console.log('🌐 Fetching organization data from API...');
            
            // Set a timeout for the API request
            const response = await axios.get('https://superiorservers.co/api/darkrp/orgprofile/9986', {
                timeout: 10000 // 10 second timeout
            });
            
            console.log(`📊 API Response Status: ${response.status}`);
            console.log(`👥 Total members in org: ${response.data.Members?.length || 0}`);
            
            if (!response.data.Members) {
                console.log('❌ No Members array in API response');
                interaction.processing = false;
                return interaction.editReply('API Error: No members data found!');
            }
            
            console.log(`🔍 Searching for Steam64 ID: ${steam64}`);
            const member = response.data.Members.find(m => m.SteamID === steam64);
            
            if (!member) {
                console.log('❌ Steam ID not found in organization members');
                console.log('📝 Creating join request...');
                
                // Send join request to channel
                const requestChannelId = process.env.JOIN_REQUEST_CHANNEL || '1386110887168835620';
                console.log(`🔍 Looking for channel ID: ${requestChannelId}`);
                
                if (!interaction.guild.channels) {
                    console.log('❌ Guild channels not available');
                    interaction.processing = false;
                    return interaction.editReply('Server channels not available. Please try again later.');
                }
                
                const requestChannel = interaction.guild.channels.cache.get(requestChannelId);
                
                if (!requestChannel) {
                    console.log('❌ Join request channel not found');
                    console.log(`📋 Available channels: ${interaction.guild.channels.cache.map(c => `${c.name} (${c.id})`).join(', ')}`);
                    interaction.processing = false;
                    return interaction.editReply('Steam ID not found in organization and join request channel is not configured!');
                }
                
                const requestEmbed = new EmbedBuilder()
                    .setTitle('🔔 Organization Join Request')
                    .setDescription(`${interaction.user} wants to join the organization`)
                    .addFields(
                        { name: 'Discord User', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
                        { name: 'Steam ID', value: steam64, inline: true },
                        { name: 'Status', value: '⏳ Pending Review', inline: false }
                    )
                    .setColor('#ffaa00')
                    .setThumbnail(interaction.user.displayAvatarURL())
                    .setTimestamp();
                
                const buttons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`approve_${interaction.user.id}_${steam64}`)
                            .setLabel('Approve')
                            .setStyle(ButtonStyle.Success)
                            .setEmoji('✅'),
                        new ButtonBuilder()
                            .setCustomId(`deny_${interaction.user.id}_${steam64}`)
                            .setLabel('Deny')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('❌')
                    );
                
                // Tag the roles if they exist in environment variables
                let roleMentions = '';
                if (process.env.VOID_ROLE) {
                    roleMentions += `<@&${process.env.VOID_ROLE}> `;
                }
                if (process.env.PARALLAX_ROLE) {
                    roleMentions += `<@&${process.env.PARALLAX_ROLE}> `;
                }
                
                const content = roleMentions ? `${roleMentions}- New join request needs review!` : 'New join request needs review!';
                
                await requestChannel.send({
                    content: content,
                    embeds: [requestEmbed],
                    components: [buttons]
                });
                
                console.log('✅ Join request sent to channel');
                interaction.processing = false;
                return interaction.editReply('Steam ID not found in organization! A join request has been submitted for review.');
            }
            
            console.log(`✅ Found member: ${member.Name || 'Unknown'} with rank: ${member.Rank}`);
            
            // Find role by rank name
            console.log(`🔍 Looking for role with name: "${member.Rank}"`);
            
            if (!interaction.guild.roles) {
                console.log('❌ Guild roles not available');
                interaction.processing = false;
                return interaction.editReply('Server roles not available. Please try again later.');
            }
            
            const role = interaction.guild.roles.cache.find(r => 
                r.name.toLowerCase() === member.Rank.toLowerCase()
            );
            
            if (!role) {
                console.log(`❌ Role "${member.Rank}" not found in server`);
                console.log(`📋 Available roles: ${interaction.guild.roles.cache.map(r => r.name).join(', ')}`);
                interaction.processing = false;
                return interaction.editReply(`Role "${member.Rank}" not found!`);
            }
            
            console.log(`✅ Found role: ${role.name} (ID: ${role.id})`);
            
            // Check if user already has the role
            if (interaction.member.roles.cache.has(role.id)) {
                console.log('⚠️ User already has this role');
                interaction.processing = false;
                return interaction.editReply('You already have this role!');
            }
            
            console.log('🎭 Adding role to user...');
            await interaction.member.roles.add(role);
            console.log('✅ Role added successfully');
            
            // Set nickname from API response
            if (member.Name && member.Name.trim()) {
                try {
                    console.log(`🏷️ Setting nickname to: ${member.Name}`);
                    await interaction.member.setNickname(member.Name);
                    console.log('✅ Nickname set successfully');
                } catch (nicknameError) {
                    console.log('⚠️ Could not set nickname (probably missing permissions):', nicknameError.message);
                }
            }
            
            // Store verified user
            addVerifiedUser(interaction.user.id, steam64, member.Name, member.Rank);
            
            const embed = new EmbedBuilder()
                .setTitle('✅ Verified!')
                .addFields(
                    { name: 'Steam ID', value: steam64, inline: true },
                    { name: 'Name', value: member.Name || 'Unknown', inline: true },
                    { name: 'Rank', value: member.Rank, inline: true },
                    { name: 'Role Assigned', value: role.name, inline: true }
                )
                .setColor('#00ff00')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });
            console.log(`🎉 Verification completed for ${interaction.user.tag}`);
            interaction.processing = false;
            
        } catch (error) {
            console.error('❌ Verification error:', error.message);
            console.error('❌ Full error:', error);
            interaction.processing = false;
            
            try {
                if (error.code === 'ECONNABORTED') {
                    await interaction.editReply('❌ Verification timed out. Please try again.');
                } else if (error.response) {
                    await interaction.editReply(`❌ API Error: ${error.response.status}`);
                } else {
                    await interaction.editReply('❌ Verification failed. Please try again.');
                }
            } catch (replyError) {
                console.error('❌ Failed to send error message:', replyError.message);
            }
        }
    },
};