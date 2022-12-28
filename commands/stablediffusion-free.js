const WebSocket = require('ws');
const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const mysql = require('mysql2');
const dotenv = require('dotenv');
const createHash = require('hash-generator');

dotenv.config();

//Generate hash solution idea from https://github.com/onury5506/Discord-ChatGPT-Bot

function generateHash() {
  let hash = createHash(11)
  return {
    session_hash: hash,
    fn_index: 2
  }
}

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
  CREATE TABLE IF NOT EXISTS stableDiffusion (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    user_id TEXT,
    prompt TEXT,
    response TEXT
  )
`);

async function startSocket(interaction, prompt) {
  let timerCounter = setTimeout(async () => {
    await interaction.editReply({
      content: 'Your request has timed out. Please try again',
    });
  }, 129000)
const ws = new WebSocket('wss://stabilityai-stable-diffusion.hf.space/queue/join');
const hash = generateHash();
// Sometimes the WS send doesn't get a receive, so we time it out and retry

ws.on('open', () => {});

ws.on('message', async (message) => {
  const msg = JSON.parse(`${message}`);
  if (msg.msg === 'send_hash') {
    ws.send(JSON.stringify(hash));
  } else if (msg.msg === 'send_data') {
    const data = {
      data: [prompt,"",9],
      ...hash,
    };
    ws.send(JSON.stringify(data));
  } else if (msg.msg === 'estimation') {
    await interaction.editReply({
      content: 'Current Position in Queue ' +msg.rank,
    });
  } else if (msg.msg === 'process_completed') {
    clearTimeout(timerCounter)
    try {
      const results = msg.output.data[0];
      const attachments = [];
      const resultsToString = [results].toString();
      for (let i = 0; i < results.length; i++) {
        const data = results[i].split(',')[1];
        const buffer = Buffer.from(data, 'base64');
        const attachment = new AttachmentBuilder(buffer, {
          name: 'diffusion.png',
        });
        attachments.push(attachment);
      }
      db.query(`INSERT INTO stableDiffusion (user_id, prompt) VALUES (?, ?)`, [interaction.user.id, prompt], function (error, results, fields) {
        if (error) throw error;
        interaction.editReply({
        content: 'You asked '+ prompt,
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
            content: 'The queue is full. Please try entering your prompt of '+prompt+' again',
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
  data: new SlashCommandBuilder()
    .setName('generate')
    .setDescription('Generates an image from a text prompt using Stable Diffusion 2.0')
    .addStringOption(option => option
      .setName('prompt')
      .setDescription('generate image prompt')
    ),
  async execute(interaction) {
    const prompt = interaction.options.getString('prompt');
    console.log('What to generate?', prompt);
    try {
      await interaction.reply("I'm generating... this can take up to 2 minutes...");
      startSocket(interaction, prompt)
        } catch (error) {
          console.error(error);
        }
      },
    };
