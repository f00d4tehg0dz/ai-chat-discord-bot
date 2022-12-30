const WebSocket = require('ws');
const {
  SlashCommandBuilder,
  AttachmentBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder
} = require('discord.js');
const mysql = require('mysql2');
const dotenv = require('dotenv');
const createHash = require('hash-generator');
const csv = require('csv-parser');
const fs = require('fs');
const _ = require('lodash');

dotenv.config();

// Generate hash solution idea from https://github.com/onury5506/Discord-ChatGPT-Bot
function generateHash() {
  const hash = createHash(12);
  return {
    session_hash: hash,
    fn_index: 2
  };
}

const artists = [];
// Read the CSV file and extract the list of artists
fs.createReadStream('./library/artists.csv')
  .pipe(csv())
  .on('data', (row) => {
    artists.push({
      label: row.artist,
      description: row.artist,
      value: row.artist,
    });
  });

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
  CREATE TABLE IF NOT EXISTS stableDiffusionArtist (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    user_id TEXT,
    prompt TEXT,
    response TEXT
  )
`);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('artist')
    .setDescription('Generates an image from a text prompt and artist using Stable Diffusion 1.5')
    .addStringOption(option => option
      .setName('prompt')
      .setDescription('image prompt')
    ),
  async execute(interaction) {

    const shuffledArtists = _.shuffle(artists).slice(0, 20);
    const prompt = interaction.options.getString('prompt');
    const row = new ActionRowBuilder()
      .addComponents(
        new StringSelectMenuBuilder(option => option)
        .setCustomId('artist')
        .setPlaceholder('Select an artist')
        .addOptions(shuffledArtists)
      );
    let timerCounter = setTimeout(async () => {
      await interaction.editReply({
        content: 'Your request has timed out. Please try again',
      });
    }, 45000);
    await interaction.reply('Thinking...');
    await interaction.editReply({
      content: prompt,
      components: [row]
    }).then(async (m) => {
      try {
        const collector = m.createMessageComponentCollector({
          time: 15000
        });
        collector.on('collect', async (i) => {
          if(i.isStringSelectMenu()) {
          console.log(`What to generate? `);
          if (!i.isStringSelectMenu()) return;

          if (i.customId === 'exit') return collector.stop();

          if (i.customId === 'artist') {
            await i.deferUpdate();

            const selectedArtist = i.values[0];
            console.log(`Generate by? ${selectedArtist}`);

            const ws = new WebSocket('wss://runwayml-stable-diffusion-v1-5.hf.space/queue/join');
            const hash = generateHash();
            ws.on('open', () => {});
            ws.on('message', async (message) => {
              const msg = JSON.parse(`${message}`);
              if (msg.msg === 'send_hash') {
                ws.send(JSON.stringify(hash));
              } else if (msg.msg === 'send_data') {
                const data = {
                  data: [`${prompt} in the style by ${selectedArtist}`],
                  ...hash,
                };
                ws.send(JSON.stringify(data));
              } else if (msg.msg === 'process_completed') {
                clearTimeout(timerCounter);
                try {
                  const results = msg.output.data[0];
                  const attachments = [];
                  for (let i = 0; i < results.length; i++) {
                    const data = results[i].split(',')[1];
                    const buffer = Buffer.from(data, 'base64');
                    const attachment = new AttachmentBuilder(buffer, {
                      name: 'diffusionArtist.png',
                    });
                    attachments.push(attachment);
                  }
                  const finalOut = `You asked ${prompt} in the style by ${selectedArtist}`
                  db.query(`INSERT INTO stableDiffusionArtist (user_id, prompt) VALUES (?, ?)`, [interaction.user.id, finalOut], function (error, results, fields) {
                    if (error) throw error;
                    return i.followUp({
                      content: `You asked ${prompt} in the style by ${selectedArtist}`,
                      files: attachments,
                    });
                });
                // interaction.editReply({
                //   content: 'You asked '+ prompt,
                //   files: attachments,
                // });


                } catch (error) {
                  console.error(error);
                  await interaction.editReply({
                    content: 'There was an error processing your request. Please try again later.',
                  });
                } finally {
                  ws.close();
                }

              }

            });
          }
        }

        });
        collector.on('end', (collected, reason) => {
          if (reason === 'user') {
            return interaction.followUp({
              content: 'Conversation ended.',
              ephemeral: true
            });
          }
          if (reason === 'time') {
            return;
          }
        });
      } catch (error) {
        console.error(error);
      }
    })
  }
}
