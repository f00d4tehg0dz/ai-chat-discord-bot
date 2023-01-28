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

// Create the servers table if it doesn't already exist
db.query(`
  CREATE TABLE IF NOT EXISTS servers (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    server TEXT,
    player_count TEXT,
    timestamp TEXT
  )
`);

// This function will be used to store data in the MySQL database
function storeData(server, playerCount) {
  let timestamp = new Date().toISOString();
  // Insert data into the table
  db.query(
    'INSERT INTO servers (server, player_count, timestamp) VALUES (?, ?, ?)',
    [server, playerCount, timestamp],
    (error, results) => {
      if (error) throw error;
      console.log(`Successfully stored data for server ${server} @ ${playerCount} @ ${timestamp}`);
    }
  );
}

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildIntegrations, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.DirectMessageTyping, GatewayIntentBits.DirectMessages], partials: [Partials.Channel] });

// Get the guild object
async function updateCount() {

  const server = client.guilds.cache.size;
  const playerCount = client.users.cache.size;
  console.log(`Number of servers: ${client.guilds.cache.size}`);
  console.log(`Number of users: ${client.users.cache.size}`);
  storeData(server, playerCount);

}

// Run the function for 20 seconds
const timeoutId = setTimeout(updateCount, 20000);
// Start the code
client.once('ready', () => {

  // Stop the function from running after 25 seconds
  setTimeout(() => {
    clearTimeout(timeoutId);
  }, 25000);
  console.log('Ready!');

});
// Log in to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);
module.exports = {
  updateCount
};