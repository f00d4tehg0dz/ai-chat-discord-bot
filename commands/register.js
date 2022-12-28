// This code will only insert or update the record for a member if the member belongs to the specified guild with an ID of 'HOST SERVER'. The premium role of the member will also be checked and stored in the database.

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
    .setName('register')
    .setDescription('Register your server with the bot for access to Patreon Only content'),
  async execute(interaction) {
    await interaction.reply("Registering...");
    const db = new sqlite3.Database('conversation.db', sqlite3.OPEN_READWRITE, (err) => {
      if (err) {
        console.error(err.message);
      }
      console.log('Connected to the conversation database.');
    });

    // Get all the members of the server (guild)
    const members = interaction.guild.members.cache;
    // Insert or update each member in the database
    members.forEach(member => {
      // Check if the member belongs to the specified guild
      if (member.guild.id === process.env.hostDiscordServer) {
        // Get the member's premium role
        const premiumRole = member.roles.cache.find(role => [process.env.patreonPremiumRole1, process.env.patreonPremiumRole2, process.env.patreonPremiumRole3].includes(role.name))?.name;

        // Insert or update the member's record in the database
        db.run(`INSERT OR REPLACE INTO users(id, user_id, premiumRole) VALUES(?, ?, ?)`, [member.id, member.id, premiumRole], async function(err) {
          if (err) {
            await interaction.editReply("Error, please make sure permissions and roles are set correctly before trying again");
            return console.error(err.message);
          }

          await interaction.editReply("Successfully Registered your server! Re-run this command when role changes happen");
          console.log(`Successfully inserted or updated user ${member.id} with role "${premiumRole}" in the database.`);
        });
      }
    });

    // Close the database
    db.close((err) => {
      if (err) {
        return console.error(err.message);
      }
      console.log('Closed the database connection.');
    });
  },
};
