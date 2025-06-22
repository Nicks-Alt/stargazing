const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rules')
        .setDescription('Display the server rules'),
    
    async execute(interaction) {
        console.log(`📋 Rules command executed by ${interaction.user.tag}`);
        
        const rulesEmbed = new EmbedBuilder()
            .setTitle('📜 Server Rules')
            .setDescription('Please read and follow all server rules to maintain a positive environment for everyone.')
            .addFields(
                {
                    name: '🎮 1. Gaming Conduct',
                    value: '• No cheating, hacking, or exploiting\n• Play fair and respect other players\n• No griefing or intentional team damage',
                    inline: false
                },
                {
                    name: '💬 2. Chat Guidelines',
                    value: '• Keep conversations respectful and civil\n• No spam, excessive caps, or flooding\n• Use appropriate channels for different topics',
                    inline: false
                },
                {
                    name: '🚫 3. Prohibited Content',
                    value: '• No NSFW content or inappropriate material\n• No hate speech, discrimination, or harassment\n• No doxxing or sharing personal information',
                    inline: false
                },
                {
                    name: '🔊 4. Voice Chat Etiquette',
                    value: '• Use push-to-talk when possible\n• No ear-rape, soundboards, or music spam\n• Respect others when they\'re speaking',
                    inline: false
                },
                {
                    name: '👥 5. Organization Rules',
                    value: '• Follow chain of command and rank structure\n• Participate in organized events when possible\n• Represent the organization positively',
                    inline: false
                },
                {
                    name: '⚖️ 6. Consequences',
                    value: '• First offense: Warning\n• Second offense: Temporary mute/kick\n• Third offense: Ban from server\n• Severe violations may result in immediate ban',
                    inline: false
                },
                {
                    name: '📞 7. Appeals & Contact',
                    value: '• Contact staff for rule clarifications\n• Appeals can be made through DM to administrators\n• Report rule violations to moderators',
                    inline: false
                }
            )
            .setColor(0x6168E5)
            .setFooter({ 
                text: 'By staying in this server, you agree to follow these rules',
                iconURL: interaction.guild.iconURL()
            })
            .setTimestamp();

        // Reply to acknowledge the command, then send standalone message
        await interaction.reply({ 
            content: '📋 Rules have been posted below!', 
            flags: 64 // Ephemeral reply
        });

        // Send the standalone rules message
        await interaction.followUp({ 
            embeds: [rulesEmbed]
        });

        console.log(`✅ Rules posted by ${interaction.user.tag}`);
    },
};