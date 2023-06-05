const request = require('request');
const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const WebSocket = require('ws');
const axios = require('axios');
const mysql = require('mysql2');
const dotenv = require('dotenv');

const createHash = require('hash-generator');
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

//Generate hash solution idea from https://github.com/onury5506/Discord-ChatGPT-Bot

function generateHash() {
  let hash = createHash(11)
  return {
    event_data: null,
    fn_index: 86,
    session_hash: hash

  }
}

// Create the stableDiffusionPremium table if it doesn't already exist
db.query(`
  CREATE TABLE IF NOT EXISTS stableDiffusionPremium (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    user_id TEXT,
    prompt TEXT,
    response TEXT
  )
`);



dotenv.config();

async function startSocket(interaction, prompt) {
  let timerCounter = setTimeout(async () => {
    await interaction.editReply({
      content: 'Your request has timed out. Please try again',
    });
  }, 129000)
  const ws = new WebSocket('ws://f00d4tehg0dz.me:13000/queue/join');
  const hash = generateHash();
  // Sometimes the WS send doesn't get a receive, so we time it out and retry

  ws.on('open', () => { });

  ws.on('message', async (message) => {
    const msg = JSON.parse(`${message}`);
    if (msg.msg === 'send_hash') {
      ws.send(JSON.stringify(hash));
    } else if (msg.msg === 'send_data') {
      const data = {
        data: ["", prompt, "", [], 20, "Euler a", false, false, 1, 1, 7, -1, -1, 0, 0, 0, false, 768, 768, false, 0.7, 2, "Latent", 0, 0, 0, "Use same sampler", "", "", [], "None", false, false, "positive", "comma", 0, false, false, "", "Seed", "", [], "Nothing", "", [], "Nothing", "", [], true, false, false, false, 0, [], "", "", ""],
        ...hash,
      };
      ws.send(JSON.stringify(data));
    } else if (msg.msg === 'estimation') {
      await interaction.editReply({
        content: 'Current Position in Queue ' + msg.rank,
      });
    } else if (msg.msg === 'process_completed') {
      clearTimeout(timerCounter)

      try {

        const results = msg.output.data[0]; // Assuming this is an array
        const attachments = [];

        for (let i = 0; i < results.length; i++) {
          // Assuming that the name is a relative URL path for the file
          const fileUrl = `http://f00d4tehg0dz.me:13000/file=${results[i].name}`;

          const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
          const buffer = Buffer.from(response.data, 'binary');

          const attachment = new AttachmentBuilder(buffer, {
            name: 'diffusion.png',
          });
          attachments.push(attachment);
        }


        db.query(`INSERT INTO stableDiffusionPremium (user_id, prompt) VALUES (?, ?)`, [interaction.user.id, prompt], function (error, results, fields) {
          if (error) throw error;
          interaction.editReply({
            content: 'You asked ' + prompt,
            files: attachments,
          });
        });
      } catch (error) {
        console.error(error);
        await interaction.editReply({
          content: 'An error occurred while generating the image',
        });
      }
    } else if (msg.msg === 'queue_full') {
      try {
        await interaction.editReply({
          content: 'The queue is full. Please try entering your prompt of ' + prompt + ' again',
        });
        // Infinite loop detected
        // startSocket(interaction, prompt)
      }
      catch (error) {
        console.error(error);
        await interaction.editReply({
          content: 'An error occurred while generating the image',
        });
      }
    }
  });

  ws.on('error', async (error) => {
    console.error(error);
    await interaction.editReply({
      content: 'An error occurred while generating the image',
    });
  });
  // Close the database

}

module.exports = {
  // Set the data for the slash command
  data: new SlashCommandBuilder()
    .setName('patreon')
    .setDescription('Generates an image from a text prompt using Stable Diffusion 2.1')
    .addStringOption(option => option
      .setName('prompt')
      .setDescription('generate image prompt')
    ),
  // Function to execute the slash command
  async execute(interaction) {
    // Get the user's premium role from the database
    db.query('SELECT premiumRole FROM users WHERE user_id = ?', [interaction.user.id], async (error, rows) => {
      if (error) {
        console.error(error);
        return interaction.reply('There was an error fetching your premium role from the database.');
      }

      let premiumRole;
      if (rows && rows.length > 0) {
        premiumRole = rows[0].premiumRole;
      } else {
        premiumRole = 'Supporter';
      }

      // Check if the user has the "member" or "super supporter" premium role
      if (premiumRole === 'Member' || premiumRole === 'Super Supporter') {
        // Get the prompt from the command options
        const prompt = interaction.options.getString('prompt');
        console.log('What to generate?', prompt);
        try {
          // Send a message to indicate that the image is being generated
          await interaction.reply("I'm generating...");
          // Start the socket connection and make the request to the Stable Diffusion API
          startSocket(interaction, prompt)
        } catch (error) {
          console.error(error);

        }
      } else {
        // The member does not have the "Premium Command Access" role, so they cannot use the premium command
        await interaction.reply('Sorry, this command is only available to our Patreon supporters. Consider becoming a patron to access premium content and support the development of our bot. You can learn more about Patreon and our tiers at ' + process.env.Patreon);

      }
    });
  },
};
