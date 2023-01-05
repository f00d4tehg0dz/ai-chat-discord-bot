
const dotenv = require('dotenv');
dotenv.config();
const request = require('request');
const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const createHash = require('hash-generator');
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

// Create the dalleMini table if it doesn't already exist
db.query(`
  CREATE TABLE IF NOT EXISTS dalleMini (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    user_id TEXT,
    prompt TEXT,
    response TEXT
  )
`);

function generateHash() {
  const hash = createHash(11);
  return {
    session_hash: hash,
    fn_index: 2
  }
}

function generateImage(prompt) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      url: 'https://backend.craiyon.com/generate',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${generateHash()}`,
      },
      body: JSON.stringify({
        prompt,
      }),
    };

    request(options, (error, response, body) => {
      if (error) {
        reject(error);
      } else {
        const data = JSON.parse(body);
        resolve(data.images);
        return (data.images);
      }
    });
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dalle')
    .setDescription('Generates an image from a text prompt using Dall-E mini')
    .addStringOption(option => option
      .setName('prompt')
      .setDescription('generate image prompt')
    ),
  async execute(interaction) {
    const prompt = interaction.options.getString('prompt');
    console.log('What to generate?', prompt);

    try {
      let timerCounter = setTimeout(async () => {
        await interaction.editReply({
          content: 'Your request has timed out. Please try again',
        });
      }, 200000);

      await interaction.reply("I'm generating...this can take up to 2 minutes");
      generateImage(prompt).then(async imageAddr => {
        try {
          const results = imageAddr;
          //console.log(results[0]);
          const attachments = [];
          clearTimeout(timerCounter);

          for (let i = 0; i < 1; i++) {
            const data = results[i].split(',')[1];
            const buffer = Buffer.from(results[0], 'base64');
            const attachment = new AttachmentBuilder(buffer, {
              name: 'dalleMini.png',
            });
            attachments.push(attachment);
          }
          db.query(`INSERT INTO dalleMini (user_id, prompt) VALUES (?, ?)`, [interaction.user.id, prompt], function (error, results, fields) {
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
            })
        } catch (error) {
          console.error(error);
        }
      },
    };
