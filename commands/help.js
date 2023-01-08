const dotenv = require('dotenv');
dotenv.config();
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Get help fast'),
  async execute(interaction) {
        interaction.reply(`/invite Invite us! \n
        /chat To chat with AI and have a conversation \n
        /generate Generate AI made images for free \n
        /pokemon Generate AI made Pokemon images for free \n
        /waifu Generate AI made Waifu images for free \n
        /music Generate AI made music for free \n
        /artist Generate AI made images by a dropdown selected artist for free \n
        /dalle Generate Google AI made images for free \n
        /legacy Generate Legacy AI made images for free \n
        /patreon Generate Advanced AI made images with patreon subscription \n
        /uptime My Uptime \n
        /supportNeed Support? `)
  },
};
