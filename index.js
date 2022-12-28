require('dotenv-flow').config();
const { Client, Collection, Partials, GatewayIntentBits, AttachmentBuilder } = require('discord.js');

const fs = require('node:fs');
const path = require('node:path');
const sqlite3 = require('sqlite3');

const db = new sqlite3.Database('conversation.db');
// Create the user table
db.run(`CREATE TABLE IF NOT EXISTS users (
	id INTEGER PRIMARY KEY,
	user_id TEXT,
	premiumRole TEXT
  )`);

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildIntegrations, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.DirectMessageTyping,GatewayIntentBits.DirectMessages],partials: [Partials.Channel] });

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	// Set a new item in the Collection with the key as the command name and the value as the exported module
	if ('data' in command && 'execute' in command) {
		client.commands.set(command.data.name, command);
	} else {
		console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
	}
}

client.on('guildMemberAdd', member => {
	// Check if the member has a premium role
	const premiumRoles = ['1057368499791593542', '1057368369906585621', '1057368491239428249'];
	const premiumRole = premiumRoles.find(roleId => member.roles.cache.has(roleId));
	if (premiumRole) {
	  // The member has a premium role, so you can give them access to the premium commands
	  // You can do this by creating a new role with the necessary permissions and adding it to the member
	  // For example:
	  const premiumMemberRole = member.guild.roles.cache.find(role => role.name === premiumRole);
	  member.roles.add(premiumMemberRole);
	  db.run(`INSERT OR REPLACE INTO users (id, user_id, premiumRole) VALUES (?, ?, ?)`, [member.user.id, member.user.id, premiumMemberRole]);
	}
  });

  client.on('guildMemberRemove', member => {
	// Check if the member has a premium role
	const premiumRoles = ['1057368499791593542', '1057368369906585621', '1057368491239428249'];
	const premiumRole = premiumRoles.find(roleId => member.roles.cache.has(roleId));
	if (premiumRole) {
	  // The member has a premium role, so you can give them access to the premium commands
	  // You can do this by creating a new role with the necessary permissions and adding it to the member
	  // For example:
	  const premiumMemberRole = member.guild.roles.cache.find(role => role.name === premiumRole);
	  member.roles.remove(premiumMemberRole);
	  db.run(`INSERT OR REPLACE users (id, user_id, premiumRole) VALUES (?, ?, ?)`, [member.user.id, member.user.id, premiumRole]);
	}
  });

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}
// Log in to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);