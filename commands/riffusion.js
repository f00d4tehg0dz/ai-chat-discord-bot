const WebSocket = require('ws');
const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const mysql = require('mysql2');
const dotenv = require('dotenv');
const createHash = require('hash-generator');
const request = require('request');

dotenv.config();

//Generate hash solution idea from https://github.com/onury5506/Discord-ChatGPT-Bot

function generateHash() {
  let hash = createHash(11)
  return {
    session_hash: hash,
    fn_index: 0
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
  CREATE TABLE IF NOT EXISTS riffusion (
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
const ws = new WebSocket('wss://fffiloni-spectrogram-to-music.hf.space/queue/join');
const hash = generateHash();
// Sometimes the WS send doesn't get a receive, so we time it out and retry

ws.on('open', () => {});

ws.on('message', async (message) => {
  try {


  const msg = JSON.parse(`${message}`);
  if (msg.msg === 'send_hash') {
    ws.send(JSON.stringify(hash));
  } else if (msg.msg === 'send_data') {
    const data = {
      data: [prompt,"",null,8],
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

      const results = msg.output.data[1];
        const data = `https://fffiloni-spectrogram-to-music.hf.space/file=${results.name}`;
        const options = {
          url: data,
          encoding: null
        };
        console.log(data);

        request(options, (error, response, body) => {
          if (!error && response.statusCode == 200) {
            const buffer = Buffer.from(body, 'base64');
            const attachment = new AttachmentBuilder(buffer, {name: 'riffusion.wav'});

            db.query(`INSERT INTO riffusion (user_id, prompt) VALUES (?, ?)`, [interaction.user.id, prompt], function (error, results, fields) {
              if (error) throw error;
              interaction.editReply({
              content: 'You asked '+ prompt,
              files: [attachment],
            });
          });
          } else {
            console.error(error);
          }
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

    } catch (error) {
      console.error(error);
      await interaction.editReply({
        content: 'An error occurred while generating the image',
      });
    };
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
    .setName('music')
    .setDescription('Generates an a clip of music from a text prompt using Riffusion')
    .addStringOption(option => option
      .setName('prompt')
      .setDescription('generate music prompt')
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
