// This code will only insert or update the record for a member if the member belongs to the specified guild with an ID of 'HOST SERVER'. The premium role of the member will also be checked and stored in the database.
const { SlashCommandBuilder } = require('discord.js');
const mysql = require('mysql2');;
const dotenv = require('dotenv');
dotenv.config();

const db = mysql.createPool({
  host: process.env.sqlHost,
  user: process.env.sqlUser,
  password: process.env.sqlPW,
  database: process.env.sqlDatabase,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

db.query(`
  CREATE TABLE IF NOT EXISTS users (
    id VARCHAR PRIMARY KEY ,
    user_id TEXT,
    premiumRole TEXT
  )
`);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('register')
    .setDescription('Register your server with the bot for access to Patreon Only content'),
  async execute(interaction) {
    if (interaction.user.id !== '121258331636498432') {
      interaction.reply("Do not run this command! It will go away in the future");
      return;
    }

    await interaction.deferReply("Registering...");

    // Get all the members of the server (guild)
    const members = interaction.guild.members.cache;
    // Insert or update each member in the database
    members.forEach(member => {
      // Check if the member belongs to the specified guild
      if (member.guild.id === process.env.hostDiscordServer) {
        // Get the member's premium role
        const premiumRole = member.roles.cache.find(role => [process.env.patreonPremiumRole1, process.env.patreonPremiumRole2, process.env.patreonPremiumRole3].includes(role.name))?.name;

        // Insert or update the member's record in the database
        db.query(`INSERT INTO users (id, user_id, premiumRole) VALUES (?,?,?) ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), premiumRole = VALUES(premiumRole)`, [member.id, member.id, premiumRole], function (error, results, fields) {
        if (error) {
          interaction.editReply("Error, please make sure permissions and roles are set correctly before trying again");
          return console.error(error.message);
        } else {
           interaction.editReply("Successfully Registered your server! Re-run this command when role changes happen");
          console.log(`Successfully inserted or updated user ${member.id} with role "${premiumRole}" in the database.`);
        }
        });
      }
    });
  },
};
