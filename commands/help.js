const request = require('request');
const { SlashCommandBuilder } = require('discord.js');
const sqlite3 = require('sqlite3');
const dotenv = require('dotenv');
dotenv.config();

const db = new sqlite3.Database('conversation.db');

db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    user_id TEXT,
    premiumRole TEXT
  )
`);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Get help fast'),
  async execute(interaction) {
        interaction.reply("Register your server /register");
        interaction.reply("To chat with AI Bot /chat");
        interaction.reply("Generate AI made images for free use /generate");
        interaction.reply("Generate Google AI made images for free /dalle");
        interaction.reply("Generate Advanced AI made images with patreon subscription /patreon");
        interaction.reply("Generate Legacy AI made images for free /legacy");
  },
};
