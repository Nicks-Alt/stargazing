const { handleButtonInteraction } = require('../handlers/buttonHandler');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        // Prevent duplicate handling
        if (interaction.handled) {
            console.log('⚠️ Interaction already handled, skipping...');
            return;
        }
        interaction.handled = true;

        try {
            // Handle slash commands
            if (interaction.isChatInputCommand()) {
                const command = interaction.client.commands.get(interaction.commandName);
                if (!command) {
                    console.log(`❌ Command ${interaction.commandName} not found`);
                    return;
                }

                console.log(`🔧 ${interaction.commandName} command started by ${interaction.user.username}`);
                await command.execute(interaction);
                console.log(`✅ ${interaction.commandName} command completed by ${interaction.user.username}`);
            }
            
            // Handle button interactions
            else if (interaction.isButton()) {
                console.log(`🔘 Button interaction received: ${interaction.customId}`);
                await handleButtonInteraction(interaction);
            }
        } catch (error) {
            console.error('❌ Interaction error:', error);
            
            // Safe error response
            try {
                const errorMessage = { content: 'There was an error executing this command!', flags: 64 };
                
                if (interaction.replied) {
                    await interaction.followUp(errorMessage);
                } else if (interaction.deferred) {
                    await interaction.editReply(errorMessage);
                } else {
                    await interaction.reply(errorMessage);
                }
            } catch (replyError) {
                console.error('❌ Could not send error message:', replyError.message);
            }
        }
    },
};