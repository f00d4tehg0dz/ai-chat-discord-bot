const dotenv = require('dotenv');
dotenv.config();
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Get help fast'),
  async execute(interaction) {
        interaction.reply("Invite us! /invite");
        interaction.reply("To chat with AI and have a conversation /chat");
        interaction.reply("Generate AI made images for free /generate");
        interaction.reply("Generate AI made images by a dropdown selected artist for free /artist");
        // interaction.reply("Generate Google AI made images for free /dalle");
        interaction.reply("Generate Advanced AI made images with patreon subscription /patreon");
        interaction.reply("Generate Legacy AI made images for free /legacy");
        interaction.reply("My Uptime /uptime");
        interaction.reply("Need Support? /support");
  },
};
