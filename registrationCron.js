const dotenvFlow = require('dotenv-flow');
const { Client, Partials, GatewayIntentBits } = require('discord.js');
dotenvFlow.config();
const mysql = require('mysql2');

const db = mysql.createPool({
  host: process.env.sqlHost,
  user: process.env.sqlUser,
  password: process.env.sqlPW,
  database: process.env.sqlDatabase,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});


// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildIntegrations, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.DirectMessageTyping, GatewayIntentBits.DirectMessages], partials: [Partials.Channel] });

// Get the guild object
async function updateMembers() {

  console.log("Starting...")

  const guild = await client.guilds.fetch(process.env.hostDiscordServer);

  // Get the members of the guild
  const members = guild.members.cache;

  // Insert or update each member in the database
  members.forEach(member => {
    // Check if the member belongs to the specified guild

    if (member.guild.id === guild.id) {
      // Get the member's premium role
      const premiumRole = member.roles.cache.find(role => [process.env.patreonPremiumRole1, process.env.patreonPremiumRole2, process.env.patreonPremiumRole3].includes(role.name))?.name;
      console.log("Inserting into DB")
      // Insert or update the member's record in the database
      console.log(member.id)
      console.log(premiumRole)
      db.query(`INSERT INTO users (id, user_id, premiumRole) VALUES (?,?,?) ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), premiumRole = VALUES(premiumRole)`, [member.id, member.id, premiumRole], function (error, results, fields) {
        if (error) {
          return console.error(error.message);
        } else {
          console.log(`Successfully inserted or updated user ${member.id} with role "${premiumRole}" in the database.`);
        }
      });
    }
  });
}
// Run the function for 10 seconds
const timeoutId = setTimeout(updateMembers, 10000);
// Start the code
client.once('ready', () => {

915607987828183060
  // Stop the function from running after 3 seconds
  setTimeout(() => {
    clearTimeout(timeoutId);
  }, 3000);
  console.log('Ready!');

});
// Log in to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);
module.exports = {
  updateMembers
};